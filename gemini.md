# gemini.md — Project Constitution

## Project Identity

**Name:** St. Paul Plant Live Production Dashboard
**Purpose:** Replace the Excel PRODUCTION GANTT sheet with a live web dashboard. Excel remains the source of truth for data entry and calculation.

---

## Architecture

```
[Excel File] ──► [API Bridge (Python/FastAPI)] ──► [REST/JSON API] ──► [React Frontend]
       ▲                                                                      │
       └──────────────── User edits schedules in Excel ◄──────────────────────┘
```

**Deployment:** Option A — Local File Watcher (single plant, no cloud)
**Tech Stack:** Python 3.11+ (FastAPI + openpyxl + watchdog) → React 18 + Vite + Tailwind CSS
**Integrations:** None — purely local (Excel → API → Browser)
**Scope:** Current schedule only — no historical views, no cloud, no notifications

---

## Data Source: Excel File

**File:** `St Paul Production Tool V2 Trial.xlsx`

### Sheets

| # | Sheet Name | Purpose |
|---|------------|---------|
| 1 | Claude Log | Internal log (ignore) |
| 2 | DASHBOARD & INSTRUCTIONS | Reference (ignore) |
| 3 | PRODUCTION GANTT | Visual Gantt in Excel (we replace this) |
| 4 | SCHEDULE - LINE 1 (EH) | Production schedule, rows 2–88 |
| 5 | SCHEDULE - LINE 2 (TR7) | Production schedule, rows 2–97 |
| 6 | GOAL CALCULATOR & MRP | Material planning (read-only reference) |
| 7 | MASTER | Configuration constants + SKU database |

### MASTER Sheet — Configuration (Cells B1–B12)

| Row | Label | Cell | Type |
|-----|-------|------|------|
| 1 | Schedule Start (Hr 0) | B1 | datetime (Excel serial) |
| 2 | Max Run Hours Before CIP | B2 | number (default: 40) |
| 3 | Planning Horizon (Hrs) | B3 | number (default: 40) |
| 4 | Line 1 (EH) Rate (ctn/min) | B4 | number (default: 120) |
| 5 | Line 2 (TR7) Rate (ctn/min) | B5 | number (default: 110) |
| 6 | Default CIP Duration (Hrs) | B6 | number (default: 6) |
| 7 | Water Flush Duration (Min) | B7 | number (default: 20) |
| 8 | LAC Hold Required (Hrs) | B8 | number (default: 20) |
| 9 | Line 1 Baseline End (hrs) | B9 | number (default: 40) |
| 10 | Line 2 Baseline End (hrs) | B10 | number (default: 40) |
| 11 | % Fat in Whole Milk | B11 | decimal (default: 4.3) |
| 12 | % Fat in Skim Milk | B12 | decimal (default: 0.05) |

### MASTER Sheet — SKU Database (Row 15 = headers, Row 16+ = data)

| Column | Field |
|--------|-------|
| A | Product ID |
| B | SKU Name |
| C | Customer |
| D | SKU Type |
| E | SKU Subtype |
| F | Flavor Strength |
| G | Allergen Category |
| H | CIP Requirement |
| I | Lactose-Free (YES/blank) |
| J | Fat % |
| K | SKU PKG QTY |

### Schedule Sheets — Column Structure (Line 1 & Line 2 identical)

| Col | Index | Header | Type |
|-----|-------|--------|------|
| A | 0 | Seq # | number |
| B | 1 | SKU Name | text (dropdown) |
| C | 2 | Target Fat % | decimal |
| D | 3 | Cases | number |
| E | 4 | Run Duration (hrs) | calculated |
| F | 5 | Calculated Start (hr) | calculated |
| G | 6 | Calculated End (hr) | calculated |
| H | 7 | Override Start | optional input |
| I | 8 | Override Duration | optional input |
| J | 9 | Override End | optional input |
| K | 10 | Active Start (hr) | calculated |
| L | 11 | Active End (hr) | calculated |
| M | 12 | Start Time | calculated (ISO) |
| N | 13 | End Time | calculated (ISO) |
| O | 14 | Total Gallons | calculated |
| P | 15 | Total Pounds | calculated |
| Q | 16 | Raw (lbs) | calculated |
| R | 17 | Skim (lbs) | calculated |
| S | 18 | Whole Milk Req (lbs) | calculated |
| T | 19 | Skim Req (lbs) | calculated |

---

## Data Schemas (API Payloads)

### GET /api/status
```json
{
  "status": "ok",
  "lastRead": "ISO datetime",
  "scheduleStart": "ISO datetime",
  "hoursElapsed": 0.0,
  "fileVersion": "St Paul Production Tool V2 Trial.xlsx"
}
```

### GET /api/master
```json
{
  "scheduleStart": "ISO datetime",
  "maxRunHours": 40,
  "planningHorizonHours": 40,
  "line1RateCartonPerMin": 120,
  "line2RateCartonPerMin": 110,
  "defaultCIPDurationHrs": 6,
  "waterFlushDurationMin": 20,
  "lacHoldRequiredHrs": 20,
  "line1BaselineEndHrs": 40,
  "line2BaselineEndHrs": 40,
  "fatWholeMilkPct": 4.3,
  "fatSkimPct": 0.05
}
```

### GET /api/schedule/:line
```json
{
  "line": 1,
  "scheduleStart": "ISO datetime",
  "rows": [
    {
      "seq": 1,
      "sku": "SKU Name",
      "targetFatPct": 3.2,
      "cases": 5000,
      "runDurationHrs": 4.17,
      "startHr": 0,
      "endHr": 4.17,
      "startTime": "ISO datetime",
      "endTime": "ISO datetime",
      "isCIP": false,
      "isDowntime": false,
      "isFlush": false,
      "hasOverride": false,
      "gallons": 3000,
      "pounds": 25800,
      "rawLbs": 7000,
      "skimLbs": 18000,
      "wholeMilkReqLbs": 2500,
      "skimReqLbs": 900,
      "notes": ""
    }
  ]
}
```

### GET /api/materials
```json
{
  "line1": { "gallons": 0, "pounds": 0, "rawLbs": 0, "skimLbs": 0, "wholeMilkReq": 0, "skimReq": 0 },
  "line2": { "gallons": 0, "pounds": 0, "rawLbs": 0, "skimLbs": 0, "wholeMilkReq": 0, "skimReq": 0 },
  "combined": { "gallons": 0, "pounds": 0, "rawLbs": 0, "skimLbs": 0, "wholeMilkReq": 0, "skimReq": 0 }
}
```

### GET /api/alerts
```json
{
  "line1": {
    "overlapDetected": false,
    "exceedsCIPLimit": false,
    "cipScheduled": false,
    "activeOverrides": 0,
    "exceedsPlanningHorizon": false,
    "maxHrs": 0
  },
  "line2": { "...same shape..." }
}
```

### GET /api/gantt
```json
{
  "scheduleStart": "ISO datetime",
  "horizonHours": 72,
  "lines": [
    {
      "id": "line1",
      "label": "LINE 1 (EH)",
      "tasks": [
        {
          "id": "L1-1",
          "sku": "SKU Name",
          "cases": 5000,
          "startTime": "ISO datetime",
          "endTime": "ISO datetime",
          "type": "production|cip|flush|downtime",
          "color": "#AED6F1"
        }
      ]
    }
  ]
}
```

---

## Business Rules (LAW)

1. **Excel is the source of truth.** Never write back to Excel from the web app.
2. **Do not recalculate** Pearson formulas, run-time formulas, or SKU dropdown logic in code. Read computed values from Excel.
3. **CIP detection:** Any row where SKU Name (col B) contains "CIP" (case-insensitive) is a cleaning cycle.
4. **Empty rows:** Skip any row where SKU Name (col B) is empty.
5. **Time conversion:** Columns K and L are hours elapsed since ScheduleStart. Clock time = ScheduleStart + (hours_elapsed / 24) as Excel serial → ISO datetime.
6. **Pearson columns** (S, T) only populate when Target Fat % (col C) > 0.
7. **Override detection:** If columns H, I, or J have values, the row has an active override.
8. **File reading:** Use `xlsx` (Node) or `openpyxl` (Python) to read calculated values, not formulas.
9. **Cache strategy:** Read file on change (chokidar/watchdog), serve cached data on API requests.

---

## SKU Colour Palette

```json
{
  "OV-MILK ORG WH ESL 6-HG CTN BX": "#AED6F1",
  "OV-MILK ORG SK 6-HG CTN BX": "#A9DFBF",
  "OV-MILK ORG 2% 6-HG CTN BX": "#F9E79F",
  "OV-H&H ORG 12-QTCTN BX": "#F5CBA7",
  "CIP - (Full Cleaning)": "#F1948A",
  "Downtime": "#BDC3C7",
  "Water Flush": "#AED6F1",
  "default": "#D2B4DE"
}
```

---

## Architectural Invariants

- **No database.** Excel IS the database.
- **No Excel COM automation.** Use file-reading libraries only.
- **All intermediate files** go in `.tmp/`.
- **Environment variables** (file path, port, etc.) in `.env`.
- **SOPs before code.** Update `architecture/` markdown before changing `tools/`.
- **Self-annealing:** On failure → analyze → patch → test → update architecture docs.

---

## Maintenance Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-12 | Initial constitution created from Systeminstruction.md and Excel analysis | System Pilot |
