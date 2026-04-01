# St. Paul Production Dashboard

**Real-time production monitoring dashboard** that transforms your Excel scheduling data into live visualizations with Gantt charts, material tracking, and automated alerts.

## ⚡ Quick Start

### One-Click Launch

**Mac Users:**
1. Double-click `START.command`
2. Dashboard opens automatically at http://localhost:8000

**Windows Users:**
1. Double-click `START.bat`
2. Dashboard opens automatically at http://localhost:8000

That's it! The server will start, install dependencies automatically on first run, and open your browser.

### First-Time Setup

Make sure you have **Python 3.9+** installed:
- **Mac:** Download from [python.org](https://www.python.org) or use `brew install python3`
- **Windows:** Download from [python.org](https://www.python.org)

The launcher scripts will handle everything else (virtual environment, dependencies, server startup).

## 📊 What You Get

Your production data comes alive with:

- **72-Hour Gantt Chart** — Visual timeline of both production lines with color-coded SKUs and real-time NOW marker
- **Material Requirements** — Instant aggregation of gallons, pounds, raw/skim milk across lines
- **Smart Alerts** — Automatic detection of schedule overlaps, missing CIP cycles, and planning issues
- **Plan vs Actual** — Live tracking of schedule variance (hours ahead or behind)
- **Running Now** — Current SKU and case count for each line
- **WebSocket Push Updates** — Dashboard refreshes instantly when you save the Excel file (no waiting!)

## 🔄 How It Works

```
Excel File → Auto-detected changes → API reads data → WebSocket push → Browser updates
     ▲                                                                        │
     └────────────────── Edit in Excel anytime ◄──────────────────────────────┘
```

1. Edit your production schedule in Excel
2. Save the file
3. Dashboard updates within 1 second (WebSocket push)
4. All connected browsers refresh automatically

## 🛠 Technology

Built with modern, production-ready tools:

**Backend:** FastAPI, Python 3.9+, openpyxl, WebSocket, watchdog file monitoring
**Frontend:** React 19, Vite, Tailwind CSS, vis-timeline
**Updates:** Sub-second WebSocket push + 60s polling safety net

## 💡 For Developers

### Manual Start (Development Mode)

If you want to run the development server with hot reload:

```bash
# Terminal 1 - API server
python3 -m uvicorn tools.api_bridge:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Frontend dev server (optional, for development only)
cd frontend
npm run dev
```

In production mode (using the launchers), the built React app is served directly by FastAPI at http://localhost:8000

### API Documentation

Interactive API docs available at http://localhost:8000/docs after starting the server.

**Key Endpoints:**
- `GET /api/status` — System health and data freshness
- `GET /api/gantt` — Gantt chart timeline data
- `GET /api/materials` — Aggregated material requirements
- `GET /api/alerts` — Production alerts and warnings
- `GET /api/schedule/{line}` — Full schedule for Line 1 or 2
- `POST /api/reload` — Force data refresh
- `WebSocket /ws` — Real-time push updates

### Rebuilding the Frontend

If you modify the React code:

```bash
cd frontend
npm run build
```

The built files go to `frontend/dist` and are served automatically by the FastAPI server.

## 📁 Project Structure

```
/
├── START.command              # Mac launcher (double-click to run)
├── START.bat                  # Windows launcher (double-click to run)
├── tools/
│   ├── api_bridge.py         # FastAPI server + WebSocket push
│   ├── excel_reader.py       # Excel parsing logic
│   ├── cache.py              # In-memory data cache
│   ├── file_watcher.py       # Auto-reload on Excel save
│   └── ws_manager.py         # WebSocket connection manager
├── frontend/
│   ├── src/                  # React source code
│   └── dist/                 # Built production assets (after npm run build)
└── St Paul Production Tool V2 Trial.xlsx  # Your production data

```

## 🚀 System Requirements

- **Python:** 3.9 or higher
- **Operating System:** macOS, Windows, or Linux
- **Browser:** Chrome, Firefox, Safari, or Edge (modern versions)
- **RAM:** 2GB+ recommended
- **Excel File:** Must be in project root (or set `EXCEL_FILE_PATH` in `.env`)

---

**Built with:** Python, FastAPI, React, WebSocket, Tailwind CSS
**Last Updated:** 2026-03-12
**System Architect:** Claude Sonnet 4.5
