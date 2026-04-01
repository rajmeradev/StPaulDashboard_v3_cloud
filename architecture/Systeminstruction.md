1. SYSTEM OVERVIEW
What You Are Building

A live web dashboard that:

Reads scheduling and production data from an Excel file (St Paul Production Tool V2 Trial.xlsx)
Displays a Gantt chart, material requirements, alert center, and plan vs actual panels
Replaces the Excel PRODUCTION GANTT sheet visually — Excel remains the data entry and calculation engine
Refreshes automatically (polling every 30–60 seconds, or on file save)
Architecture

[Excel File] ──► [API Bridge (Node.js or Python)] ──► [REST/JSON API] ──► [React Frontend] ▲ │ └──────────────── User edits schedules in Excel ◄──────────────────────────┘ (Excel stays as the source of truth)
Two Deployment Options (pick one)

Option	Best For	Complexity
A — Local File Watcher	Single plant, PC-based, no cloud	Low
B — SharePoint / OneDrive API	Multi-user, cloud-hosted Excel	Medium
Recommended: Option A for initial build. Option B if multi-user access is needed later.
2. EXCEL FILE STRUCTURE (What the API Must Read)
The agent must understand this file layout before building anything.

Sheet: MASTER (Sheet ID 2)

Cell	Named Range	Value
B1	ScheduleStart	Schedule start datetime (Excel serial number)
B2	—	Max run hours before CIP (default: 40)
B3	—	Planning horizon in hours (default: 40)
B4	—	Line 1 rate (cartons/min)
B5	—	Line 2 rate (cartons/min)
B11	—	% fat in whole milk (e.g. 4.3)
B12	—	% fat in skim milk (e.g. 0.05)
B15
—	SKU database (SKU name, Gal/case, Lbs/Gal, Raw%, Skim%, Cream%)
Sheet: SCHEDULE - LINE 1 (EH) (Sheet ID 3) — Rows 2–88

Column	Header	Type
A	Seq #	Number
B	SKU Name	Text (dropdown)
C	Target Fat %	Decimal input
D	Cases	Number input
E	Run Duration (hrs)	Calculated
F	Calc Start	Calculated
G	Calc End	Calculated
H	Override Start	Optional input
I	Override End	Optional input
J	Override Duration	Optional input
K	Active Start	Calculated
L	Active End	Calculated
O	Notes	Text
P	Gallons	Calculated
Q	Pounds	Calculated
R	Raw Whole Milk (lbs)	Calculated
S	Skim Milk (lbs)	Calculated
T	Whole Milk Req — Pearson	Calculated
U	Skim Req — Pearson	Calculated
Sheet: SCHEDULE - LINE 2 (TR7) (Sheet ID 4) — Rows 2–97

Same column structure as Line 1.

Key Business Rules to Encode

CIP rows: Any row where column B contains "CIP" — treat as cleaning cycle, not production
Empty rows: Skip any row where column B is empty
Time units: Column K and L are in hours elapsed since ScheduleStart (not clock time)
Clock time = ScheduleStart + (hours_elapsed / 24) as Excel serial → convert to ISO datetime
Pearson columns (T, U) only populate when column C (Target Fat %) has a value > 0
3. API BRIDGE — BUILD INSTRUCTIONS
Technology Stack

Runtime: Node.js 18+ (preferred) or Python 3.11+
Excel parsing: xlsx npm package (Node) or openpyxl (Python)
Server: Express.js (Node) or FastAPI (Python)
File watching: chokidar (Node) or watchdog (Python)
Required API Endpoints

GET /api/status
Returns system health and last file read time.

{
  "status": "ok",
  "lastRead": "2026-03-12T06:00:00Z",
  "scheduleStart": "2026-03-11T22:00:00Z",
  "hoursElapsed": 26.95,
  "fileVersion": "St Paul Production Tool V2 Trial.xlsx"
}
GET /api/master
Returns MASTER sheet constants.

{
  "scheduleStart": "2026-03-11T22:00:00Z",
  "maxRunHours": 40,
  "planningHorizonHours": 40,
  "line1RateCartonPerMin": 120,
  "line2RateCartonPerMin": 110,
  "fatWholeMilkPct": 4.3,
  "fatSkimPct": 0.05
}
GET /api/schedule/:line
:line = 1 or 2. Returns all non-empty rows for that line.

{
  "line": 1,
  "scheduleStart": "2026-03-11T22:00:00Z",
  "rows": [
    {
      "seq": 1,
      "sku": "OV-MILK ORG WH ESL 6-HG CTN BX",
      "targetFatPct": 3.2,
      "cases": 5000,
      "runDurationHrs": 0.69,
      "startHr": 0,
      "endHr": 0.69,
      "startTime": "2026-03-11T22:00:00Z",
      "endTime": "2026-03-11T22:41:00Z",
      "isCIP": false,
      "isDowntime": false,
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
GET /api/materials
Returns aggregated material totals.

{
  "line1": { "gallons": 42000, "pounds": 361980, "rawLbs": 103797, "skimLbs": 258181, "wholeMilkReq": 38245, "skimReq": 13355 },
  "line2": { "gallons": 15000, "pounds": 128100, "rawLbs": 0, "skimLbs": 93833, "wholeMilkReq": 0, "skimReq": 0 },
  "combined": { "gallons": 57000, "pounds": 490080, "rawLbs": 103797, "skimLbs": 352014, "wholeMilkReq": 38245, "skimReq": 13355 }
}
GET /api/alerts
Returns all alert checks.

{
  "line1": {
    "overlapDetected": false,
    "exceedsCIPLimit": true,
    "cipScheduled": true,
    "activeOverrides": 1,
    "exceedsPlanningHorizon": true,
    "maxHrs": 42.7
  },
  "line2": {
    "overlapDetected": false,
    "exceedsCIPLimit": false,
    "cipScheduled": false,
    "activeOverrides": 0,
    "exceedsPlanningHorizon": false,
    "maxHrs": 14.3
  }
}
GET /api/gantt
Returns Gantt-ready data for both lines combined.

{
  "scheduleStart": "2026-03-11T22:00:00Z",
  "horizonHours": 72,
  "lines": [
    {
      "id": "line1",
      "label": "LINE 1 (EH)",
      "tasks": [
        {
          "id": "L1-1",
          "sku": "OV-MILK ORG WH ESL 6-HG CTN BX",
          "cases": 5000,
          "startTime": "2026-03-11T22:00:00Z",
          "endTime": "2026-03-11T22:41:00Z",
          "type": "production",
          "color": "#AED6F1"
        },
        {
          "id": "L1-5",
          "sku": "CIP - (Full Cleaning)",
          "startTime": "2026-03-12T13:00:00Z",
          "endTime": "2026-03-12T19:00:00Z",
          "type": "cip",
          "color": "#F1948A"
        }
      ]
    },
    {
      "id": "line2",
      "label": "LINE 2 (TR7)",
      "tasks": [ ]
    }
  ]
}
File Reading Logic (Important)

// Node.js example using xlsx package
const XLSX = require('xlsx');

function readSchedule(filePath, sheetName, maxRow) {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 1 });
  
  // CRITICAL: xlsx reads CALCULATED VALUES, not formulas
  // Columns K and L (indices 10, 11) are hours elapsed — numeric
  // Convert to ISO: scheduleStart + (hours/24) as Excel serial
  
  const scheduleStart = wb.Sheets['MASTER']['B1'].v; // Excel serial number
  
  return data
    .filter(row => row[1]) // skip empty SKU rows
    .map(row => ({
      seq: row[0],
      sku: row[1],
      targetFatPct: row[2] || null,
      cases: row[3] || 0,
      startHr: row[10],  // Column K = index 10
      endHr: row[11],    // Column L = index 11
      // Convert Excel serial to JS Date:
      startTime: excelSerialToISO(scheduleStart + row[10]/24),
      endTime: excelSerialToISO(scheduleStart + row[11]/24),
      isCIP: String(row[1]).toUpperCase().includes('CIP'),
      gallons: row[14],  // Column O = index 14
      pounds: row[15],
      rawLbs: row[16],
      skimLbs: row[17],
      wholeMilkReq: row[18],
      skimReq: row[19]
    }));
}

function excelSerialToISO(serial) {
  // Excel serial 1 = Jan 1 1900, JS epoch = Jan 1 1970
  const msPerDay = 86400000;
  const excelEpoch = new Date(1899, 11, 30).getTime();
  return new Date(excelEpoch + serial * msPerDay).toISOString();
}
4. FRONTEND — BUILD INSTRUCTIONS
Technology Stack

Framework: React 18 + Vite
Gantt library: vis-timeline (free, MIT) or @dhtmlx/trial-react-gantt (free trial)
Charts: recharts or chart.js
Styling: Tailwind CSS
HTTP: axios or native fetch
Auto-refresh: setInterval polling every 30 seconds
Page Layout

┌─────────────────────────────────────────────────────────────────┐ │ ST. PAUL PLANT — LIVE PRODUCTION DASHBOARD [●LIVE] │ ├──────────────────────────────────────┬──────────────────────────┤ │ GANTT CHART (72 hours) │ ALERT CENTER │ │ Line 1 (EH) ████░░░░░░░░░░░░░░░ │ ✅ No Overlap │ │ Line 2 (TR7) ██░░░░░░░░░░░░░░░░░ │ 🔴 No CIP — Line 2 │ │ │ 🟡 1 Override Active │ │ [NOW marker scrolls in real time] ├──────────────────────────┤ │ │ PLAN vs ACTUAL │ ├──────────────────────────────────────┤ L1: +2.7 hrs behind │ │ MATERIAL REQUIREMENTS │ L2: 25.7 hrs ahead │ │ ┌────────────┬───────┬───────┬────┐ ├──────────────────────────┤ │ │ Metric │ L1 │ L2 │ ∑ │ │ RUNNING NOW │ │ │ Gallons │42,000 │15,000 │57K │ │ L1: OV-MILK ORG WH... │ │ │ Pounds │361K │128K │490K│ │ L2: — idle — │ │ │ ... │ │ │ │ │ │ │ └────────────┴───────┴───────┴────┘ └──────────────────────────┘ │ Last refreshed: 12 Mar 2026 06:37 AM │ └─────────────────────────────────────────────────────────────────┘
Gantt Component Requirements

X-axis: Timeline from scheduleStart to scheduleStart + 72 hrs
Y-axis: Two rows — Line 1 (EH) and Line 2 (TR7)
Tasks: Colored bars per SKU type:
Production runs → unique colour per SKU (match Excel conditional formatting palette)
CIP → red #F1948A
Downtime → grey #BDC3C7
Water Flush → light blue #AED6F1
NOW marker: Vertical red dashed line at current time, auto-scrolls
Hover tooltip: Show SKU name, cases, start/end time, duration, gallons
Zoom controls: 6hr / 12hr / 24hr / 72hr view buttons
SKU Colour Mapping

Use this fixed palette (matches the Excel conditional formatting):

const SKU_COLORS = {
  "OV-MILK ORG WH ESL 6-HG CTN BX": "#AED6F1",
  "OV-MILK ORG SK 6-HG CTN BX":     "#A9DFBF",
  "OV-MILK ORG 2% 6-HG CTN BX":     "#F9E79F",
  "OV-H&H ORG 12-QTCTN BX":         "#F5CBA7",
  "CIP - (Full Cleaning)":           "#F1948A",
  "Downtime":                        "#BDC3C7",
  "Water Flush":                     "#AED6F1",
  // Add remaining SKUs from MASTER B15:B56
  "default":                         "#D2B4DE"
};
5. COLOUR AND TASK TYPE LOGIC
function getTaskType(sku) {
  if (!sku) return 'empty';
  const upper = sku.toUpperCase();
  if (upper.includes('CIP')) return 'cip';
  if (upper.includes('WATER') || upper.includes('FLUSH')) return 'flush';
  if (upper.includes('DOWNTIME')) return 'downtime';
  return 'production';
}

function getTaskColor(sku) {
  return SKU_COLORS[sku] || SKU_COLORS['default'];
}
6. FILE WATCHER (Auto-Refresh Trigger)
// Node.js with chokidar
const chokidar = require('chokidar');
const path = 'C:/Plant/St Paul Production Tool V2 Trial.xlsx';

let cachedData = null;
let lastModified = null;

chokidar.watch(path).on('change', async () => {
  // Excel locks the file while open — wait 500ms for lock to release
  await new Promise(r => setTimeout(r, 500));
  cachedData = await readAllSheets(path);
  lastModified = new Date().toISOString();
  console.log('Data refreshed:', lastModified);
});

// Serve cached data on API requests (never read file on every request)
app.get('/api/gantt', (req, res) => res.json(cachedData.gantt));
7. DEPLOYMENT OPTIONS
Option A — Local (Recommended First)

PC running Excel ├── Excel file: C:/Plant/StPaul.xlsx ├── Node.js API: localhost:3001 (auto-starts with file watcher) └── React app: localhost:3000 (or built to static files, served by Node)
User opens browser to http://localhost:3000
Edits schedule in Excel → saves → dashboard updates within 2 seconds
Option B — SharePoint / OneDrive

Use Microsoft Graph API to read the Excel file: GET /v1.0/drives/{driveId}/items/{itemId}/workbook/worksheets/{sheet}/usedRange
Requires Azure AD app registration + OAuth2
Dashboard can be hosted anywhere (Vercel, Netlify, Azure Static Web Apps)
Polling interval: 30–60 seconds (Graph API has rate limits)
8. WHAT NOT TO BUILD
Do NOT	Reason
Write back to Excel from the web app	Excel is input-only from the user's side
Recalculate Pearson or run time formulas in JS	Excel does this — read computed values from columns K, L, T, U
Re-implement the SKU dropdown logic	Read from MASTER B15
Build a new database	Excel IS the database
Use Excel COM automation	Too fragile; use xlsx package instead
9. SUGGESTED BUILD ORDER
API Bridge — Read Excel, serve /api/schedule/1 and /api/schedule/2, verify data shape
File watcher — Confirm cache invalidates on Excel save
Gantt component — Render bars for Line 1 only first, then add Line 2
NOW marker — Add live time indicator
Material Requirements table — Pull from /api/materials
Alert Center panel — Pull from /api/alerts
Plan vs Actual panel — Calculate in frontend from schedule end time vs baseline
Running NOW — Derive from current time vs task start/end windows
Styling and polish — Colours, fonts, responsive layout
Auto-refresh — Wire up polling or file watcher → frontend update
10. REFERENCE DATA SUMMARY
Item	Value
Excel file name	St Paul Production Tool V2 Trial.xlsx
Line 1 sheet	SCHEDULE - LINE 1 (EH) — rows 2–88
Line 2 sheet	SCHEDULE - LINE 2 (TR7) — rows 2–97
Schedule start cell	MASTER!B1 (named range: ScheduleStart)
Time columns	K = start hrs elapsed, L = end hrs elapsed
Material columns	O=Gal, P=Lbs, Q=Raw, R=Skim, S=Whole Milk Req, T=Skim Req
CIP detection	Column B contains "CIP" (case-insensitive)
Override columns	H, I, J — check COUNTA to detect active overrides
Baseline plan hours	MASTER!B9 (Line 1), MASTER!B10 (Line 2)
