#!/usr/bin/env python3
"""
Excel file reader and parser for St. Paul Plant schedule data.

Responsibility: ONE thing — read an .xlsx workbook and return clean,
typed Python data structures. No HTTP, no caching, no file watching.

CRITICAL LIMITATION (documented in ADR-003):
  openpyxl with data_only=True reads Excel's *cached* formula results,
  not live recalculated values. If the file was saved without full
  recalculation (e.g., opened in LibreOffice), formula cells return None.

  The validate_row() function detects and logs this condition explicitly
  instead of silently masking it with `or 0` (previous behaviour).
  Data quality warnings are surfaced via the /api/status endpoint.
"""

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Local timezone — derived once at import time so all datetime conversions
# use the system timezone of the machine running the API (= the plant machine).
_LOCAL_TZ = datetime.now().astimezone().tzinfo

import openpyxl

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SKU Colour Palette — brand-grouped, matches Excel Production Gantt legend
# ---------------------------------------------------------------------------
SKU_COLORS: Dict[str, str] = {
    # ── OV Whole Milk (blue family) ────────────────────────────────────────
    "OV-MILK ORG WH ESL 6-HG CTN BX":  "#AED6F1",
    "OV-MILK ORG WH SP 6-HG CTN BX":   "#AED6F1",
    "OV-MILK ORG WH LAC 6-HG CTN BX":  "#85C1E9",
    "OV-MILK ORG WY-D GRS 6HG CTNBX":  "#7FB3D3",
    # ── OV Skim (green family) ─────────────────────────────────────────────
    "OV-MILK ORG SK 6-HG CTN BX":      "#A9DFBF",
    "OV-MILK ORG SK LAC 6HG CTN BX":   "#7DCEA0",
    "OV-MILK ORG SK 12-QT CTN BX":     "#A9DFBF",
    # ── OV 1% / 2% / Fat Milk (yellow family) ─────────────────────────────
    "OV-MILK ORG 2% 6-HG CTN BX":      "#F9E79F",
    "OV-MILK ORG 2% FT 12-QT CTN BX":  "#F7DC6F",
    "OV-MILK ORG 1% 6-HG CTN BX":      "#FAD7A0",
    "OV-MILK ORG 1% FT 12-QT CTN BX":  "#FAD7A0",
    "OV-MILK ORG 1%CH LAC 6HG CTNBX":  "#FDEBD0",
    "OV-MILK ORG 2% LAC 6-HG CTN BX":  "#F9E79F",
    "OV-MILK ORG WH 3.5% 12QT CTNBX":  "#F5CBA7",
    # ── OV H&H / Cream (orange family) ────────────────────────────────────
    "OV-H&H ORG 12-QTCTN BX":          "#F5CBA7",
    "OV-H&H ORG LAC 12-QT CTN BX":     "#E59866",
    "OV-MILK ORG WY-D CRS 6-59CTNBX":  "#F0B27A",
    # ── TJ Products (indigo/purple family) ────────────────────────────────
    "TJ-H&H ORG 12-PT CTN BX":         "#C39BD3",
    "TJ-H&H ORG 12-QT CTN BX":         "#A569BD",
    "TJ-HVY CRM ORG 12-PT CTN BX":     "#BB8FCE",
    # ── CV Products (teal family) ─────────────────────────────────────────
    "CV-MILK 2% LAC 6-HG CTN BX":      "#76D7C4",
    "CV-MILK WH LAC 6HG CTN BX":       "#48C9B0",
    "CV-H&H 6-QT CTN BX":              "#45B39D",
    "CV-MILK 2% CH LAC 6-59 CTN BX":   "#1ABC9C",
    "CV-NOG UP 6-QT CTN BX":           "#52BE80",
    # ── KEMPS Products (amber family) ─────────────────────────────────────
    "KEMPS-MILK WH LAC 6-HG CTN BX":   "#F8C471",
    "KEMPS-MILK 296 LAC 6-HG CTN BX":  "#F0A500",
    "KEMPS-MILK PUMPKIN 12-QT CTNBX":  "#E67E22",
    "KEMPS-NOG VAN 12-QT CTN BX":      "#CA6F1E",
    "KEMPS-NOG CINN 12-QT CTN BX":     "#BA4A00",
    "KEMPS-MILK PEP MOCHA 12QTCTNBX":  "#935116",
    # ── DNKN Products (mocha/lavender family) ─────────────────────────────
    "DNKN-MILK COFFEE 6-HG CTN BX":    "#D7BDE2",
    "DNKN-MILK CEREAL 6-HG CTN 8X":    "#C39BD3",
    # ── 365 Products (lime family) ────────────────────────────────────────
    "365-MILK ORG SK 12-QT CTN BOX":   "#ABEBC6",
    "365-MILK ORG WH3.5% 12QT CTNBX":  "#82E0AA",
    "365-MILK ORG 2% FT 12-QT CTNBX":  "#58D68D",
    "365-MILK ORG 1% FT 12-QT CTNBX":  "#2ECC71",
    # ── Special types ─────────────────────────────────────────────────────
    "CIP - (Full Cleaning)":            "#F1948A",
    "Downtime":                         "#BDC3C7",
    "Water Flush":                      "#AED6F1",
    "default":                          "#D2B4DE",
}


def get_task_color(sku: str) -> str:
    return SKU_COLORS.get(sku, SKU_COLORS["default"])


def get_task_type(sku: str) -> str:
    upper = sku.upper()
    if "CIP" in upper:
        return "cip"
    if "WATER" in upper or "FLUSH" in upper:
        return "flush"
    if "DOWNTIME" in upper:
        return "downtime"
    return "production"


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _validate_row(row: Dict[str, Any], row_idx: int) -> Optional[str]:
    """
    Check a parsed schedule row for signs of stale formula cache.

    Returns a warning string if issues are detected, None if row is clean.

    The key signal: if startHr and endHr are both 0 for a non-CIP, non-empty
    row, it almost certainly means openpyxl got None from formula cells K and L
    (which were then masked to 0 by `or 0`). A production task cannot
    genuinely start AND end at hour 0.
    """
    sku = row.get("sku", "")
    start = row.get("startHr", 0)
    end = row.get("endHr", 0)

    # CIP or flush at hour 0 is suspicious but possible (first task)
    # Production at hour 0 with 0 duration is always wrong
    if start == 0 and end == 0 and row.get("seq", 1) != 1:
        return (
            f"Row {row_idx} (SKU: '{sku}'): startHr=0, endHr=0 for a non-first row — "
            f"likely a stale formula cache (openpyxl data_only=True limitation). "
            f"Save the Excel file with full recalculation (Ctrl+Alt+Shift+F9) to fix."
        )

    if row.get("startTime") is None or row.get("endTime") is None:
        return (
            f"Row {row_idx} (SKU: '{sku}'): startTime or endTime is None — "
            f"formula cell returned no cached value."
        )

    return None


# ---------------------------------------------------------------------------
# Core readers
# ---------------------------------------------------------------------------

def read_master_sheet(wb: openpyxl.Workbook) -> Dict[str, Any]:
    """
    Read configuration constants from MASTER sheet cells B1–B12.
    All values fall back to documented defaults if cells are empty.
    """
    ws = wb["MASTER"]
    schedule_start = ws["B1"].value  # datetime or None

    if not isinstance(schedule_start, datetime):
        logger.warning(
            f"MASTER!B1 (ScheduleStart) is not a datetime — got {type(schedule_start).__name__}: {schedule_start!r}. "
            f"The Excel file may not have been saved with recalculation."
        )
        # Attempt to use current time as fallback so the app doesn't crash
        schedule_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    return {
        "scheduleStart":          schedule_start.isoformat(),
        "maxRunHours":            ws["B2"].value or 40,
        "planningHorizonHours":   ws["B3"].value or 40,
        "line1RateCartonPerMin":  ws["B4"].value or 120,
        "line2RateCartonPerMin":  ws["B5"].value or 110,
        "defaultCIPDurationHrs":  ws["B6"].value or 6,
        "waterFlushDurationMin":  ws["B7"].value or 20,
        "lacHoldRequiredHrs":     ws["B8"].value or 20,
        "line1BaselineEndHrs":    ws["B9"].value or 40,
        "line2BaselineEndHrs":    ws["B10"].value or 40,
        "fatWholeMilkPct":        ws["B11"].value or 4.3,
        "fatSkimPct":             ws["B12"].value or 0.05,
        "fatCreamPct":            ws["B13"].value or 36.0,
    }


def read_schedule_sheet(
    wb: openpyxl.Workbook,
    sheet_name: str,
    schedule_start: datetime,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Read schedule rows from a LINE sheet (LINE 1 or LINE 2).

    Column mapping (1-indexed):
      A=1  Seq #           B=2  SKU Name         C=3  Target Fat %
      D=4  Cases           E=5  Run Duration hrs  F=6  Calc Start
      G=7  Calc End        H=8  Override Start    I=9  Override Duration
      J=10 Override End    K=11 Active Start hr   L=12 Active End hr
      M=13 Start Time      N=14 End Time          O=15 Gallons
      P=16 Pounds          Q=17 Raw (lbs)         R=18 Skim (lbs)
      S=19 Whole Milk Req  T=20 Skim Req

    Returns:
        (rows, warnings) — rows is a list of row dicts,
        warnings is a list of data quality warning strings.

    IMPORTANT: None-handling is explicit here. We do NOT use `or 0` to
    silently mask missing formula values. Instead, we track which cells
    returned None and surface them as warnings.
    """
    ws = wb[sheet_name]
    rows: List[Dict[str, Any]] = []
    warnings: List[str] = []

    for row_idx in range(2, ws.max_row + 1):
        sku = ws.cell(row_idx, 2).value  # Column B = SKU Name

        # Business Rule: skip rows with no SKU
        if not sku:
            continue

        sku = str(sku).strip()

        # --- Time columns ---
        active_start_hr = ws.cell(row_idx, 11).value  # Column K
        active_end_hr   = ws.cell(row_idx, 12).value  # Column L
        start_time_raw  = ws.cell(row_idx, 13).value  # Column M (pre-calculated datetime)
        end_time_raw    = ws.cell(row_idx, 14).value  # Column N (pre-calculated datetime)

        # Explicit None tracking (do NOT use `or 0`)
        if active_start_hr is None:
            warnings.append(
                f"Sheet '{sheet_name}' row {row_idx} ('{sku}'): "
                f"Column K (Active Start Hr) is None — formula not cached."
            )
            active_start_hr = 0.0
        if active_end_hr is None:
            warnings.append(
                f"Sheet '{sheet_name}' row {row_idx} ('{sku}'): "
                f"Column L (Active End Hr) is None — formula not cached."
            )
            active_end_hr = 0.0

        # Time conversion: prefer pre-calculated M/N columns; fall back to K/L
        # IMPORTANT: make datetimes timezone-aware so the browser shows correct
        # local plant time. openpyxl returns naive datetimes; we attach
        # _LOCAL_TZ (system timezone of the API machine = the plant machine).

        def _to_iso(dt_val, fallback_hrs: float) -> str:
            """Convert openpyxl datetime (possibly naive) to tz-aware ISO string."""
            if isinstance(dt_val, datetime):
                if dt_val.tzinfo is None:
                    return dt_val.replace(tzinfo=_LOCAL_TZ).isoformat()
                return dt_val.isoformat()
            return (schedule_start + timedelta(hours=float(fallback_hrs))).replace(tzinfo=_LOCAL_TZ).isoformat()

        start_time_iso = _to_iso(start_time_raw, active_start_hr)
        end_time_iso   = _to_iso(end_time_raw,   active_end_hr)

        # --- Override columns (H, I, J) ---
        override_start    = ws.cell(row_idx, 8).value
        override_duration = ws.cell(row_idx, 9).value
        override_end      = ws.cell(row_idx, 10).value
        has_override      = bool(override_start or override_duration or override_end)

        # --- Material columns ---
        # Q (17): High Fat Req (lbs) — Pearson Square result, auto-switches
        #         whole milk vs cream based on target fat % vs MASTER B11/B13
        # R (18): Skim Req (lbs) — Pearson Square skim component
        # S (19), T (20): spare columns (previously wholeMilkReq/skimReq,
        #                 now retired — Pearson results moved to Q/R in v3)
        gallons          = ws.cell(row_idx, 15).value  # Column O
        pounds           = ws.cell(row_idx, 16).value  # Column P
        high_fat_req_lbs = ws.cell(row_idx, 17).value  # Column Q — High Fat Req
        skim_req_lbs     = ws.cell(row_idx, 18).value  # Column R — Skim Req

        # --- Task type detection (business rules from gemini.md) ---
        sku_upper   = sku.upper()
        is_cip      = "CIP" in sku_upper
        is_flush    = "WATER" in sku_upper or "FLUSH" in sku_upper
        is_downtime = "DOWNTIME" in sku_upper

        row = {
            "seq":             ws.cell(row_idx, 1).value,
            "sku":             sku,
            "targetFatPct":    ws.cell(row_idx, 3).value,
            "cases":           ws.cell(row_idx, 4).value or 0,
            "runDurationHrs":  ws.cell(row_idx, 5).value or 0.0,
            "startHr":         float(active_start_hr),
            "endHr":           float(active_end_hr),
            "startTime":       start_time_iso,
            "endTime":         end_time_iso,
            "isCIP":           is_cip,
            "isFlush":         is_flush,
            "isDowntime":      is_downtime,
            "hasOverride":     has_override,
            "gallons":         gallons or 0,
            "pounds":          pounds or 0,
            "highFatReqLbs":   high_fat_req_lbs or 0,
            "skimReqLbs":      skim_req_lbs or 0,
        }

        # Run validation check on completed row
        warning = _validate_row(row, row_idx)
        if warning:
            warnings.append(warning)

        rows.append(row)

    return rows, warnings


# ---------------------------------------------------------------------------
# Aggregation functions (pure — no I/O, no global state)
# ---------------------------------------------------------------------------

def calculate_materials(
    line1_rows: List[Dict],
    line2_rows: List[Dict],
) -> Dict[str, Any]:
    """Aggregate material totals across both lines and combine them."""

    def _sum(rows: List[Dict]) -> Dict[str, float]:
        return {
            "gallons":        sum(r["gallons"]        for r in rows),
            "pounds":         sum(r["pounds"]         for r in rows),
            "highFatReqLbs":  sum(r["highFatReqLbs"]  for r in rows),
            "skimReqLbs":     sum(r["skimReqLbs"]     for r in rows),
        }

    l1 = _sum(line1_rows)
    l2 = _sum(line2_rows)

    return {
        "line1": l1,
        "line2": l2,
        "combined": {
            "gallons":       l1["gallons"]       + l2["gallons"],
            "pounds":        l1["pounds"]        + l2["pounds"],
            "highFatReqLbs": l1["highFatReqLbs"] + l2["highFatReqLbs"],
            "skimReqLbs":    l1["skimReqLbs"]    + l2["skimReqLbs"],
        },
    }


def calculate_alerts(
    line_rows: List[Dict],
    max_run_hours: float,
    planning_horizon_hours: float = 40.0,
) -> Dict[str, Any]:
    """
    Compute alert conditions for a single production line.

    Previously had a TODO for exceedsPlanningHorizon — now implemented.
    """
    if not line_rows:
        return {
            "overlapDetected":       False,
            "exceedsCIPLimit":       False,
            "cipScheduled":          False,
            "activeOverrides":       0,
            "exceedsPlanningHorizon": False,
            "maxHrs":                0.0,
        }

    # Overlap detection: tasks are assumed sorted by startHr
    overlap_detected = False
    production_rows = [r for r in line_rows if not r["isCIP"] and not r["isFlush"] and not r["isDowntime"]]
    for i in range(len(production_rows) - 1):
        if production_rows[i]["endHr"] > production_rows[i + 1]["startHr"]:
            overlap_detected = True
            break

    cip_scheduled  = any(r["isCIP"] for r in line_rows)
    max_hrs        = max((r["endHr"] for r in line_rows), default=0.0)
    active_overrides = sum(1 for r in line_rows if r["hasOverride"])

    return {
        "overlapDetected":        overlap_detected,
        "exceedsCIPLimit":        max_hrs > max_run_hours,
        "cipScheduled":           cip_scheduled,
        "activeOverrides":        active_overrides,
        "exceedsPlanningHorizon": max_hrs > planning_horizon_hours,
        "maxHrs":                 round(max_hrs, 2),
    }


def build_gantt_data(
    line1_rows: List[Dict],
    line2_rows: List[Dict],
    schedule_start: str,
    horizon_hours: int = 72,
) -> Dict[str, Any]:
    """Build the Gantt chart data structure for both production lines."""

    def _build_tasks(rows: List[Dict], line_prefix: str) -> List[Dict]:
        return [
            {
                "id":        f"{line_prefix}-{r['seq']}",
                "sku":       r["sku"],
                "cases":     r["cases"],
                "startTime": r["startTime"],
                "endTime":   r["endTime"],
                "startHr":   r["startHr"],
                "endHr":     r["endHr"],
                "type":      get_task_type(r["sku"]),
                "color":     get_task_color(r["sku"]),
                "hasOverride": r["hasOverride"],
                "gallons":   r["gallons"],
            }
            for r in rows
        ]

    return {
        "scheduleStart": schedule_start,
        "horizonHours":  horizon_hours,
        "lines": [
            {"id": "line1", "label": "LINE 1 (EH)",   "tasks": _build_tasks(line1_rows, "L1")},
            {"id": "line2", "label": "LINE 2 (TR7)",  "tasks": _build_tasks(line2_rows, "L2")},
        ],
    }


# ---------------------------------------------------------------------------
# Top-level loader (called by api_bridge — orchestrates all reads)
# ---------------------------------------------------------------------------

def load_workbook_safe(file_path: Path) -> openpyxl.Workbook:
    """
    Open workbook with data_only=True.

    CRITICAL: read_only=True is intentionally NOT used here.
    openpyxl's read_only mode is incompatible with data_only — when both
    are set, formula cells return None instead of their cached values.
    The Excel file is ~165KB so loading it fully into memory is fine.

    Windows sharing-violation fix: copy to a temp file first so we never
    hold an OS-level lock on the original .xlsx while Excel is open.
    This lets the user save in Excel without getting a sharing violation.
    """
    import shutil
    import tempfile

    try:
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        shutil.copy2(file_path, tmp_path)
    except PermissionError:
        raise PermissionError(
            f"Excel file is locked: {file_path}. "
            f"Close Excel or wait for it to finish saving, then retry."
        )
    except Exception as exc:
        raise RuntimeError(f"Failed to copy workbook at {file_path}: {exc}") from exc

    try:
        wb = openpyxl.load_workbook(tmp_path, data_only=True)
        return wb
    except Exception as exc:
        raise RuntimeError(f"Failed to open workbook at {file_path}: {exc}") from exc
    finally:
        try:
            tmp_path.unlink()
        except Exception:
            pass


def load_all_from_bytes(file_bytes: bytes):
    """
    Cloud entry point — accepts raw .xlsx bytes (from an HTTP upload).
    Wraps bytes in BytesIO so openpyxl never touches the filesystem.
    Returns (master, line1_rows, line2_rows, all_warnings).
    """
    from io import BytesIO
    wb = openpyxl.load_workbook(BytesIO(file_bytes), data_only=True)

    master = read_master_sheet(wb)
    schedule_start = datetime.fromisoformat(master["scheduleStart"])

    line1_rows, line1_warnings = read_schedule_sheet(
        wb, "SCHEDULE - LINE 1 (EH)", schedule_start
    )
    line2_rows, line2_warnings = read_schedule_sheet(
        wb, "SCHEDULE - LINE 2 (TR7)", schedule_start
    )

    all_warnings = line1_warnings + line2_warnings
    if all_warnings:
        for w in all_warnings:
            logger.warning(w)
    else:
        logger.info("Data quality check passed — no formula caching issues detected.")

    wb.close()
    return master, line1_rows, line2_rows, all_warnings


def load_all(file_path: Path):
    """
    Top-level entry point. Reads all required sheets and returns
    (master, line1_rows, line2_rows, all_warnings).

    Called by api_bridge.load_and_cache_data() — never call this directly
    from routes.
    """
    wb = load_workbook_safe(file_path)

    master = read_master_sheet(wb)
    schedule_start = datetime.fromisoformat(master["scheduleStart"])

    line1_rows, line1_warnings = read_schedule_sheet(
        wb, "SCHEDULE - LINE 1 (EH)", schedule_start
    )
    line2_rows, line2_warnings = read_schedule_sheet(
        wb, "SCHEDULE - LINE 2 (TR7)", schedule_start
    )

    all_warnings = line1_warnings + line2_warnings
    if all_warnings:
        for w in all_warnings:
            logger.warning(w)
    else:
        logger.info("Data quality check passed — no formula caching issues detected.")

    wb.close()
    return master, line1_rows, line2_rows, all_warnings
