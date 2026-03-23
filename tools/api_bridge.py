#!/usr/bin/env python3
"""
St. Paul Plant Production Dashboard — API Bridge (v3.0 — Cloud / Upload mode)

In this version the Excel file is NOT read from disk on startup.
Instead, the sponsor uploads their .xlsx via POST /api/upload from the browser.
The file is stored in memory and all data endpoints read from the in-memory cache.

Flow:
  Browser uploads .xlsx → POST /api/upload → excel_reader.load_all_from_bytes()
                        → cache.update() → WebSocket broadcast → dashboard renders
"""

import asyncio
import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from tools import excel_reader
from tools.cache import cache
from tools.ws_manager import ws_manager

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── Path resolution ──────────────────────────────────────────────────────────
_EXE_DIR    = Path(os.environ.get("_EXE_DIR",    Path(__file__).parent.parent))
_BUNDLE_DIR = Path(os.environ.get("_BUNDLE_DIR", Path(__file__).parent.parent))

# Stored during startup so WebSocket broadcasts work from any thread context
_event_loop: Optional[asyncio.AbstractEventLoop] = None

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="St. Paul Production Dashboard API",
    version="3.0.0",
    description=(
        "Upload-based dashboard API. "
        "Sponsor uploads their .xlsx; data is held in memory and pushed to browsers via WebSocket."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static frontend (React build)
# ---------------------------------------------------------------------------

FRONTEND_DIST = _BUNDLE_DIR / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    logger.info(f"Serving built frontend from {FRONTEND_DIST}")
else:
    logger.info("No frontend/dist found — run 'npm run build' inside frontend/")


# ---------------------------------------------------------------------------
# Broadcast helper
# ---------------------------------------------------------------------------

def _schedule_broadcast() -> None:
    if _event_loop is None or not _event_loop.is_running():
        return
    msg = {
        "type": "data_updated",
        "timestamp": cache.get_last_modified(),
        "connections": ws_manager.connection_count,
    }
    asyncio.run_coroutine_threadsafe(ws_manager.broadcast(msg), _event_loop)
    logger.info(f"Broadcast queued → {ws_manager.connection_count} client(s)")


# ---------------------------------------------------------------------------
# Startup — no Excel load needed; wait for upload
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup():
    global _event_loop
    _event_loop = asyncio.get_event_loop()
    logger.info("Server ready — waiting for Excel upload at POST /api/upload")


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
    except Exception as exc:
        logger.debug(f"WebSocket error: {exc}")
        ws_manager.disconnect(ws)


# ---------------------------------------------------------------------------
# Upload endpoint
# ---------------------------------------------------------------------------

@app.post("/api/upload")
async def upload_excel(file: UploadFile = File(...)):
    """
    Accept an .xlsx file upload, parse it, update the in-memory cache,
    and broadcast a data_updated event to all connected browsers.
    """
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are accepted.")

    try:
        file_bytes = await file.read()
        master, line1_rows, line2_rows, warnings = excel_reader.load_all_from_bytes(file_bytes)
        cache.update(
            master=master,
            line1=line1_rows,
            line2=line2_rows,
            warnings=warnings,
        )
        logger.info(
            f"Upload processed: {file.filename} — "
            f"Line 1: {len(line1_rows)} rows, Line 2: {len(line2_rows)} rows"
            + (f", {len(warnings)} warning(s)" if warnings else "")
        )
        _schedule_broadcast()
        return {
            "status": "ok",
            "filename": file.filename,
            "line1Rows": len(line1_rows),
            "line2Rows": len(line2_rows),
            "warnings": warnings,
            "timestamp": cache.get_last_modified(),
        }
    except Exception as exc:
        logger.error(f"Upload failed: {exc}")
        raise HTTPException(status_code=422, detail=str(exc))


# ---------------------------------------------------------------------------
# Route helpers
# ---------------------------------------------------------------------------

def _require_loaded():
    if not cache.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="No data loaded yet. Please upload your Excel file first.",
        )


# ---------------------------------------------------------------------------
# REST Routes
# ---------------------------------------------------------------------------

@app.get("/api/status")
def get_status():
    from datetime import datetime
    if not cache.is_loaded():
        return {"status": "awaiting_upload", "message": "Upload your Excel file to get started."}

    master = cache.get_master()
    schedule_start = datetime.fromisoformat(master["scheduleStart"])
    hours_elapsed = (datetime.now() - schedule_start).total_seconds() / 3600
    warnings = cache.get_warnings()

    return {
        "status": "ok",
        "lastRead": cache.get_last_modified(),
        "scheduleStart": master["scheduleStart"],
        "hoursElapsed": round(hours_elapsed, 2),
        "activeWsConnections": ws_manager.connection_count,
        "dataQuality": {
            "ok": len(warnings) == 0,
            "warningCount": len(warnings),
            "warnings": warnings,
        },
    }


@app.get("/api/master")
def get_master():
    _require_loaded()
    return cache.get_master()


@app.get("/api/schedule/{line}")
def get_schedule(line: int):
    _require_loaded()
    if line not in (1, 2):
        raise HTTPException(status_code=400, detail="Line must be 1 or 2.")
    return {
        "line": line,
        "scheduleStart": cache.get_master()["scheduleStart"],
        "rows": cache.get_line(line) or [],
    }


@app.get("/api/materials")
def get_materials():
    _require_loaded()
    return excel_reader.calculate_materials(
        cache.get_line(1) or [],
        cache.get_line(2) or [],
    )


@app.get("/api/alerts")
def get_alerts():
    _require_loaded()
    master = cache.get_master()
    return {
        "line1": excel_reader.calculate_alerts(
            cache.get_line(1) or [],
            max_run_hours=master["maxRunHours"],
            planning_horizon_hours=master["planningHorizonHours"],
        ),
        "line2": excel_reader.calculate_alerts(
            cache.get_line(2) or [],
            max_run_hours=master["maxRunHours"],
            planning_horizon_hours=master["planningHorizonHours"],
        ),
    }


@app.get("/api/gantt")
def get_gantt():
    _require_loaded()
    master = cache.get_master()
    return excel_reader.build_gantt_data(
        line1_rows=cache.get_line(1) or [],
        line2_rows=cache.get_line(2) or [],
        schedule_start=master["scheduleStart"],
        horizon_hours=72,
    )


# ---------------------------------------------------------------------------
# Catch-all → serve React SPA
# ---------------------------------------------------------------------------

if FRONTEND_DIST.exists():
    @app.get("/favicon.ico", include_in_schema=False)
    def favicon():
        return FileResponse(FRONTEND_DIST / "vite.svg")

    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str = ""):
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(index)
        return {"error": "Frontend build not found. Run: cd frontend && npm run build"}


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
