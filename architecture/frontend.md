# Frontend Architecture (Layer 1 SOP)

## Goal
Display live production dashboard with Gantt chart, material requirements, alerts, plan vs actual, and running-now panels. Auto-refresh on Excel changes.

## Technology
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Gantt Chart:** vis-timeline (MIT license) or recharts
- **HTTP Client:** fetch API
- **Auto-Refresh:** setInterval polling every 30 seconds

## Inputs
- API endpoints: /api/status, /api/master, /api/schedule/:line, /api/materials, /api/alerts, /api/gantt
- Polling interval: 30 seconds (configurable)

## Outputs
Single-page dashboard with 6 panels

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ST. PAUL PLANT — LIVE PRODUCTION DASHBOARD          [●LIVE]    │
├──────────────────────────────────────┬──────────────────────────┤
│                                      │                          │
│ GANTT CHART (72 hours)               │    ALERT CENTER          │
│ Line 1 (EH) ████░░░░░░░░░░░░░░░      │ ✅ No Overlap           │
│ Line 2 (TR7) ██░░░░░░░░░░░░░░░░░     │ 🔴 No CIP — Line 2      │
│                                      │ 🟡 1 Override Active     │
│ [NOW marker scrolls in real time]   ├──────────────────────────┤
│                                      │                          │
│                                      │   PLAN vs ACTUAL         │
├──────────────────────────────────────┤ L1: +2.7 hrs behind     │
│                                      │ L2: 25.7 hrs ahead      │
│   MATERIAL REQUIREMENTS              ├──────────────────────────┤
│ ┌────────────┬───────┬───────┬────┐ │                          │
│ │ Metric     │  L1   │  L2   │ ∑  │ │   RUNNING NOW            │
│ │ Gallons    │42,000 │15,000 │57K │ │ L1: OV-MILK ORG WH...   │
│ │ Pounds     │361K   │128K   │490K│ │ L2: — idle —            │
│ │ ...        │       │       │    │ │                          │
│ └────────────┴───────┴───────┴────┘ └──────────────────────────┘
│                                                                 │
│ Last refreshed: 12 Mar 2026 06:37 AM                           │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. GanttChart
- X-axis: Timeline from scheduleStart to scheduleStart + 72 hrs
- Y-axis: Two rows (Line 1 EH, Line 2 TR7)
- Tasks: Colored bars per SKU type (see gemini.md for colour palette)
- NOW marker: Vertical red dashed line at current time, auto-updates
- Hover tooltip: SKU name, cases, start/end time, duration, gallons
- Zoom controls: 6hr / 12hr / 24hr / 72hr view buttons

### 2. AlertCenter
- Fetch from /api/alerts
- Display icon + message per alert type:
  - ✅ Green if no issues
  - 🟡 Yellow for warnings (overrides, approaching CIP limit)
  - 🔴 Red for critical (overlap, no CIP scheduled, exceeds horizon)

### 3. MaterialRequirements
- Fetch from /api/materials
- Display table with 3 columns (Line 1, Line 2, Combined)
- Rows: Gallons, Pounds, Raw Lbs, Skim Lbs, Whole Milk Req, Skim Req
- Format numbers with commas (42000 → 42,000)

### 4. PlanVsActual
- Calculate: actual end time - baseline end time (from /api/master)
- Display as "+X.X hrs behind" or "-X.X hrs ahead" per line
- Red if behind, green if ahead

### 5. RunningNow
- Derive from current time and /api/gantt tasks
- Find task where currentTime >= startTime && currentTime < endTime
- Display SKU name if running, "— idle —" if no active task

### 6. StatusBar
- Display "Last refreshed: [timestamp]"
- Live indicator: green dot if API responding, red if error

## Task Type and Colour Logic

```js
function getTaskType(sku) {
  if (!sku) return 'empty';
  const upper = sku.toUpperCase();
  if (upper.includes('CIP')) return 'cip';
  if (upper.includes('WATER') || upper.includes('FLUSH')) return 'flush';
  if (upper.includes('DOWNTIME')) return 'downtime';
  return 'production';
}

function getTaskColor(sku) {
  const SKU_COLORS = {
    "OV-MILK ORG WH ESL 6-HG CTN BX": "#AED6F1",
    "OV-MILK ORG SK 6-HG CTN BX": "#A9DFBF",
    "OV-MILK ORG 2% 6-HG CTN BX": "#F9E79F",
    "OV-H&H ORG 12-QTCTN BX": "#F5CBA7",
    "CIP - (Full Cleaning)": "#F1948A",
    "Downtime": "#BDC3C7",
    "Water Flush": "#AED6F1",
    "default": "#D2B4DE"
  };
  return SKU_COLORS[sku] || SKU_COLORS['default'];
}
```

## Auto-Refresh Logic

```js
useEffect(() => {
  const fetchData = async () => {
    try {
      const [gantt, materials, alerts, master] = await Promise.all([
        fetch('/api/gantt').then(r => r.json()),
        fetch('/api/materials').then(r => r.json()),
        fetch('/api/alerts').then(r => r.json()),
        fetch('/api/master').then(r => r.json())
      ]);
      setGanttData(gantt);
      setMaterialsData(materials);
      setAlertsData(alerts);
      setMasterData(master);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      setStatus('error');
    }
  };

  fetchData(); // Initial load
  const interval = setInterval(fetchData, 30000); // Poll every 30s
  return () => clearInterval(interval);
}, []);
```

## Edge Cases
1. **API down:** Display red indicator, show cached data, retry on next poll
2. **No data:** Display "—" or "No schedule" if rows empty
3. **Long SKU names:** Truncate with ellipsis in Running Now panel
4. **Large schedules:** Virtualize Gantt if > 100 tasks (unlikely)

## Testing
1. Start frontend: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Verify all panels load data
4. Modify Excel file, wait 30s, verify dashboard updates
5. Test zoom controls on Gantt
6. Test hover tooltips on Gantt bars

## Maintenance
- If new alert types added, update AlertCenter component
- If SKU colour palette changes, update SKU_COLORS in gemini.md and sync here
- If polling interval needs adjustment, update interval constant
