# API Bridge Architecture (Layer 1 SOP)

## Goal
Read Excel file data and serve it via REST API endpoints. Cache data in memory and invalidate on file changes.

## Technology
- **Runtime:** Python 3.9+
- **Framework:** FastAPI
- **Excel:** openpyxl (data_only=True to read calculated values)
- **File Watching:** watchdog
- **Server:** uvicorn

## Inputs
- Excel file: `St Paul Production Tool V2 Trial.xlsx` (path from `.env`)
- Sheets: MASTER, SCHEDULE - LINE 1 (EH), SCHEDULE - LINE 2 (TR7)

## Outputs
6 REST API endpoints serving JSON data (see gemini.md for schemas)

## Logic

### File Reading
1. Open workbook with `openpyxl.load_workbook(path, data_only=True)`
   - `data_only=True` reads calculated values, not formulas
2. Read MASTER sheet cells B1–B12 for configuration
3. Read SKU database from MASTER (row 15 = headers, row 16+ = data)
4. Read schedule sheets:
   - Line 1: rows 2–88
   - Line 2: rows 2–97
   - Skip rows where col B (SKU Name) is empty
5. Convert times:
   - Columns K, L (Active Start/End) are hours elapsed since schedule start
   - Columns M, N (Start Time, End Time) are pre-calculated datetime objects
   - **Decision:** Use pre-calculated M, N if available, otherwise convert from K, L

### Data Transformation
For each schedule row:
- Detect type: `isCIP` if SKU contains "CIP", `isFlush` if "WATER"/"FLUSH", `isDowntime` if "DOWNTIME"
- Detect override: `hasOverride = True` if columns H, I, or J are not empty
- Extract material data from columns O–T (Gallons, Pounds, Raw, Skim, Whole Milk Req, Skim Req)

### Caching Strategy
- Read file on startup
- Store parsed data in global `cache` dict
- Update `last_modified` timestamp
- File watcher triggers re-read on change event
- Wait 500ms after change event (Excel locks file while open)
- Serve all API requests from cache (never read file on every request)

### API Endpoints

#### GET /api/status
Returns system health and last read time.

#### GET /api/master
Returns MASTER sheet configuration constants.

#### GET /api/schedule/:line
Returns all non-empty schedule rows for line 1 or 2.

#### GET /api/materials
Returns aggregated material totals (sum of all rows per line + combined).

#### GET /api/alerts
Returns alert checks:
- Overlap detection: any two tasks on same line with overlapping time windows
- Exceeds CIP limit: max run hours > 40 without CIP
- CIP scheduled: at least one CIP row exists
- Active overrides: count of rows with override values
- Exceeds planning horizon: max end time > planning horizon hours

#### GET /api/gantt
Returns Gantt-ready data for both lines combined with task objects.

## Edge Cases
1. **Empty rows:** Skip any row where column B is empty
2. **Excel file locked:** Wait 500ms after file change event before reading
3. **Missing sheets:** Return 500 error if expected sheets not found
4. **Invalid data:** Log warning and skip row if critical fields are null
5. **File not found:** Return 500 error on startup, retry on file watcher event

## Testing
1. Start server: `uvicorn tools.api_bridge:app --reload`
2. Visit `http://localhost:8000/docs` for auto-generated API docs
3. Test each endpoint with sample Excel data
4. Modify Excel file and verify cache invalidates within 2 seconds
5. Check logs for errors

## Maintenance
- If Excel column order changes, update column indices in `read_schedule_sheet()`
- If new config fields added to MASTER, update `read_master()`
- If new alert rules needed, update `calculate_alerts()`
