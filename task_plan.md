# task_plan.md — Project Phases & Checklists

## Phase 0: Initialization (CURRENT)
- [x] Create directory structure (`architecture/`, `tools/`, `.tmp/`)
- [x] Create `gemini.md` (Project Constitution)
- [x] Create `task_plan.md`
- [x] Create `findings.md`
- [x] Create `progress.md`
- [ ] **Discovery Questions — awaiting user answers**
- [ ] Confirm data schema in `gemini.md`
- [ ] Approve Blueprint before any coding

## Phase 1: B — Blueprint (Vision & Logic)
- [ ] Get Discovery Question answers from user
- [ ] Finalize data schema in `gemini.md`
- [ ] Research: find helpful libraries, repos, examples
- [ ] Create architecture SOPs in `architecture/`

## Phase 2: L — Link (Connectivity)
- [ ] Verify Excel file is readable with openpyxl/xlsx
- [ ] Build minimal handshake scripts in `tools/` to test file reading
- [ ] Confirm all sheet names, cell ranges, and data types match `gemini.md`
- [ ] Set up `.env` with file path and server config

## Phase 3: A — Architect (3-Layer Build)
- [ ] Write architecture SOPs (`architecture/api-bridge.md`, `architecture/frontend.md`, etc.)
- [ ] Build API Bridge (Python FastAPI or Node Express)
  - [ ] GET /api/status
  - [ ] GET /api/master
  - [ ] GET /api/schedule/:line
  - [ ] GET /api/materials
  - [ ] GET /api/alerts
  - [ ] GET /api/gantt
- [ ] Build file watcher (cache invalidation on Excel save)
- [ ] Build React frontend
  - [ ] Gantt chart component (Line 1 first, then Line 2)
  - [ ] NOW marker (real-time vertical line)
  - [ ] Material Requirements table
  - [ ] Alert Center panel
  - [ ] Plan vs Actual panel
  - [ ] Running NOW panel

## Phase 4: S — Stylize (Refinement & UI)
- [ ] Apply SKU colour palette from `gemini.md`
- [ ] Apply dashboard layout matching spec
- [ ] Professional formatting (Tailwind CSS)
- [ ] User feedback round

## Phase 5: T — Trigger (Deployment)
- [ ] Local deployment (localhost:3000 + localhost:3001)
- [ ] Auto-refresh wiring (polling or file watcher → frontend)
- [ ] Documentation in `gemini.md` Maintenance Log
- [ ] Final handoff

---

## Suggested Build Order (from Systeminstruction.md)
1. API Bridge — Read Excel, serve `/api/schedule/1` and `/api/schedule/2`, verify data shape
2. File watcher — Confirm cache invalidates on Excel save
3. Gantt component — Render bars for Line 1 only first, then add Line 2
4. NOW marker — Add live time indicator
5. Material Requirements table — Pull from `/api/materials`
6. Alert Center panel — Pull from `/api/alerts`
7. Plan vs Actual panel — Calculate from schedule end time vs baseline
8. Running NOW — Derive from current time vs task start/end windows
9. Styling and polish — Colours, fonts, responsive layout
10. Auto-refresh — Wire up polling or file watcher → frontend update
