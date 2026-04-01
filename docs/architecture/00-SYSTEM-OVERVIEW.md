# St. Paul Plant Production Dashboard - System Architecture Overview

**Version:** 1.0
**Date:** 2026-03-12
**Status:** Active Production
**Architect:** Claude Opus 4.6

---

## Executive Summary

A real-time production monitoring system that transforms Excel-based scheduling data into a live web dashboard. The system enables production managers at St. Paul Plant to visualize schedules, track material requirements, and receive alerts without leaving their familiar Excel workflow.

### Key Characteristics
- **Data Source:** Excel spreadsheet (single source of truth)
- **Update Model:** Near real-time (1-2 second file detection, 30-second browser polling)
- **Deployment:** Local single-machine setup
- **Users:** 1-5 concurrent production managers
- **Scale:** ~100 production tasks over 72-hour rolling window

---

## System Context (C4 Level 1)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    St. Paul Plant                            │
│                  Production Dashboard                        │
│                                                              │
│  Real-time production scheduling & monitoring system        │
│                                                              │
└─────────────▲────────────────────────▲─────────────────────┘
              │                        │
              │ Edits Excel            │ Views Dashboard
              │                        │ (Auto-refresh)
    ┌─────────┴────────┐      ┌───────┴──────────┐
    │                  │      │                   │
    │  Production      │      │  Production       │
    │  Scheduler       │      │  Manager          │
    │                  │      │                   │
    └──────────────────┘      └───────────────────┘
         (Human)                    (Human)

External Systems: NONE
Integrations: NONE
Authentication: Local access only (no auth required)
```

### System Boundary
- **Inside:** Excel file, API server, web frontend
- **Outside:** No external services, databases, or third-party APIs

---

## Container Architecture (C4 Level 2)

```
┌────────────────────────────────────────────────────────────────┐
│  User's Machine (macOS/Windows/Linux)                         │
│                                                                │
│  ┌──────────────────────┐         ┌──────────────────────┐   │
│  │                      │         │                      │   │
│  │  Excel Spreadsheet   │────────▶│   API Bridge         │   │
│  │  (Data Source)       │ watches │   (FastAPI/Python)   │   │
│  │                      │  file   │                      │   │
│  │  St Paul Production  │         │  - Excel reader      │   │
│  │  Tool V2 Trial.xlsx  │         │  - File watcher      │   │
│  │                      │         │  - REST endpoints    │   │
│  │  MASTER + 2 SCHEDULE │         │  - In-memory cache   │   │
│  │  sheets              │         │                      │   │
│  └──────────────────────┘         └──────────┬───────────┘   │
│                                              │ HTTP          │
│                                              │ JSON/REST     │
│                                              │ :8000         │
│  ┌──────────────────────┐                   │               │
│  │                      │                   │               │
│  │  Web Browser         │◀──────────────────┘               │
│  │  (Frontend SPA)      │  Polls every 30s                  │
│  │                      │                                   │
│  │  React + Vite        │                                   │
│  │  Tailwind CSS        │                                   │
│  │  vis-timeline        │                                   │
│  │                      │                                   │
│  │  http://localhost:5173                                   │
│  └──────────────────────┘                                   │
│                                                              │
└────────────────────────────────────────────────────────────────┘
```

### Container Descriptions

#### 1. Excel Spreadsheet
- **Technology:** Microsoft Excel / LibreOffice Calc
- **Purpose:** Source of truth for production schedules
- **Data:** MASTER config, LINE 1 schedule, LINE 2 schedule
- **Update Frequency:** Ad-hoc (human-edited)
- **Storage:** Local filesystem

#### 2. API Bridge
- **Technology:** Python 3.9+, FastAPI, openpyxl, watchdog, uvicorn
- **Purpose:** Read Excel data, cache in memory, serve REST API
- **Endpoints:** 6 GET endpoints + 1 POST reload
- **Port:** 8000
- **Concurrency:** Async I/O, single worker process
- **Memory:** ~50MB (in-memory cache of parsed Excel data)

#### 3. Web Frontend
- **Technology:** React 18, Vite, Tailwind CSS, vis-timeline
- **Purpose:** Interactive dashboard for production monitoring
- **Port:** 5173 (dev), 80 (production)
- **Rendering:** Client-side SPA
- **Update Model:** Poll API every 30 seconds

---

## Data Flow

### Happy Path: Excel Edit → Dashboard Update

```
1. User edits Excel file in Microsoft Excel
   │
2. User presses Cmd+S (Save)
   │
3. Excel creates temp file, swaps with original (macOS behavior)
   │
4. File watcher detects on_created() event
   │
5. Handler waits 500ms (Excel file lock release)
   │
6. Handler calls load_excel_data()
   │
7. openpyxl reads .xlsx file with data_only=True
   │
8. Parser extracts MASTER config, LINE 1 rows, LINE 2 rows
   │
9. Cache dict updated (master, line1, line2, last_modified)
   │
10. File watcher logs "✓ Cache reloaded successfully"
    │
11. Frontend polls /api/gantt on 30-second timer
    │
12. API returns data from cache (no file read)
    │
13. React re-renders components with new data
    │
14. User sees updated Gantt chart, alerts, materials
```

**Latency Breakdown:**
- Excel save → File watcher detection: **0.1-1.0s**
- File lock wait: **0.5s**
- Excel read + parse: **0.2-0.5s**
- Cache update: **0.01s**
- Frontend poll (worst case): **0-30s**
- **Total: 0.8-32s** (average 15s)

---

## Quality Attributes

### Performance
- **Target:** Dashboard update within 2 seconds of Excel save
- **Actual:** 0.8-2s (file watcher) + 0-30s (polling) = **0.8-32s**
- **Bottleneck:** Frontend polling interval (can reduce to 5s if needed)
- **Optimization:** In-memory cache eliminates repeated file reads

### Reliability
- **File Lock Handling:** 500ms wait after file change detection
- **Error Recovery:** API returns stale cache on read errors
- **Cache Staleness:** Frontend shows red indicator on API errors
- **Debouncing:** 2-second debounce prevents multiple rapid reloads

### Scalability
- **Concurrent Users:** Designed for 1-5 users (single plant)
- **Data Volume:** ~100 tasks (9 Line 1 + 3 Line 2) over 72 hours
- **Memory:** O(n) where n = number of schedule rows (~50MB)
- **CPU:** Minimal (async I/O, cache-based serving)

### Security
- **Threat Model:** Trusted local network only
- **Authentication:** None (localhost access)
- **Data Validation:** Basic type checking on Excel reads
- **CORS:** Enabled for localhost:3000, localhost:5173
- **Attack Surface:** Local file access only

### Maintainability
- **Architecture:** 3-layer (Architecture SOPs → Navigation → Tools)
- **Documentation:** gemini.md (data schemas), findings.md (discoveries)
- **Logging:** INFO level, timestamped, per-module
- **Configuration:** .env file for paths and ports

---

## Technology Decisions

See [ADR-001](./adr/001-rest-api-architecture.md) through [ADR-005](./adr/005-file-watcher-strategy.md) for detailed rationale.

| Decision | Choice | Alternatives Considered |
|----------|--------|------------------------|
| API Framework | FastAPI | Flask, Django REST |
| Excel Library | openpyxl | xlrd, pandas |
| File Watching | watchdog | polling, inotify |
| Frontend Framework | React 18 | Vue, Svelte, vanilla JS |
| Styling | Tailwind CSS | Bootstrap, Material-UI |
| Gantt Library | vis-timeline | recharts, D3.js |

---

## Deployment Architecture

### Development Environment
```
Terminal 1: python3 -m uvicorn tools.api_bridge:app --reload --port 8000
Terminal 2: cd frontend && npm run dev
Browser:    http://localhost:5173
```

### Production Environment (Recommended)
```
1. Build frontend: cd frontend && npm run build
2. Serve static files: FastAPI serves frontend/dist
3. Run API: python3 -m uvicorn tools.api_bridge:app --host 0.0.0.0 --port 80
4. Access: http://localhost or http://<machine-ip>
```

### Single-Machine Deployment
- **OS:** macOS, Windows, or Linux
- **Python:** 3.9+ (system Python or virtualenv)
- **Node.js:** 18+ (for frontend build)
- **Excel:** Microsoft Excel or LibreOffice (for editing)
- **Browser:** Chrome, Firefox, Safari, Edge (latest)

---

## Operational Characteristics

### Monitoring
- **Health Check:** GET /api/status (returns lastRead timestamp)
- **Logs:** .tmp/api.log, .tmp/frontend.log
- **Metrics:** None (single-user system)

### Backup & Recovery
- **Data Backup:** Excel file only (version control recommended)
- **Recovery:** Restart API server (stateless, cache rebuilt from Excel)

### Failure Modes
| Failure | Impact | Recovery |
|---------|--------|----------|
| Excel file deleted | API returns 500 error | Restore file, API auto-reloads |
| API server crash | Frontend shows red indicator | Restart API server |
| Frontend crash | User refreshes browser | Browser reload |
| File watcher stops | Manual reload required | POST /api/reload |

---

## Future Extensibility

### Potential Enhancements (Out of Scope v1.0)
1. **Write-back to Excel:** Update Excel from dashboard (bidirectional)
2. **Historical tracking:** Database for schedule history
3. **Multi-plant:** Support multiple Excel files
4. **Real-time sync:** WebSocket instead of polling
5. **Mobile app:** Native iOS/Android dashboards
6. **Cloud deployment:** AWS/Azure hosting
7. **Authentication:** User login for multi-user access

---

## References

- [README.md](../../README.md) - Quick start guide
- [gemini.md](../../gemini.md) - Data schemas and business rules
- [architecture/api-bridge.md](../architecture/api-bridge.md) - API SOP
- [architecture/frontend.md](../architecture/frontend.md) - Frontend SOP
- [progress.md](../../progress.md) - Build history
