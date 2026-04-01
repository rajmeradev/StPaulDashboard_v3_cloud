# ADR-001: REST API Architecture Over Direct File Access

**Status:** Accepted
**Date:** 2026-03-12
**Decision Makers:** System Architect, User
**Technical Story:** Enable web dashboard to read Excel data

---

## Context

The dashboard needs to display data from an Excel file in a web browser. Several architectural approaches were considered:

1. **Direct file access:** Frontend reads .xlsx file using JS library (xlsx.js)
2. **REST API:** Backend reads Excel, serves JSON via HTTP
3. **WebSocket:** Real-time bidirectional streaming
4. **GraphQL:** Query-based data fetching

---

## Decision

**We will use a REST API architecture** with:
- Python backend (FastAPI) reading Excel with openpyxl
- JSON responses over HTTP
- In-memory caching
- Polling-based frontend updates

---

## Rationale

### Why REST API?

**✅ Pros:**
1. **Separation of concerns:** Backend handles Excel complexity, frontend focuses on UI
2. **Technology flexibility:** Python excels at Excel reading (openpyxl), JavaScript excels at UI (React)
3. **Caching:** Backend can cache parsed data, avoiding repeated file reads
4. **Error isolation:** Excel read errors don't crash the frontend
5. **API reusability:** Future mobile apps or integrations can use same API
6. **Browser compatibility:** No file system access needed (security sandbox)

**❌ Cons:**
1. **Network overhead:** Local HTTP calls add latency (~1-5ms)
2. **Additional complexity:** Two processes to run (API + frontend)
3. **Polling latency:** 30-second delay vs real-time updates

### Why not Direct File Access?

- Browser security prevents file system access (requires file picker dialog)
- JS Excel libraries (xlsx.js) are slower and less reliable than Python openpyxl
- No caching layer (re-parse entire file on every read)
- Mixing data parsing and UI rendering in one codebase (poor separation)

### Why not WebSocket?

- Over-engineered for this use case (schedule updates are infrequent)
- Adds complexity (connection management, reconnection logic)
- Polling every 30 seconds is sufficient for production schedules

### Why not GraphQL?

- Overkill for simple CRUD-style API (6 endpoints, no complex queries)
- FastAPI auto-generates OpenAPI docs (no GraphQL tooling needed)
- Simpler for maintenance (REST is more widely understood)

---

## Consequences

### Positive

1. **Clean architecture:** Backend and frontend are loosely coupled
2. **Testability:** API can be tested independently (curl, Postman, pytest)
3. **Performance:** In-memory cache enables sub-millisecond API responses
4. **Flexibility:** Easy to swap frontend (React → Vue) or backend (Python → Go)

### Negative

1. **Deployment:** Must run two processes (API + frontend dev server)
2. **Latency:** 30-second polling delay (vs real-time WebSocket)
3. **Learning curve:** Team needs Python and JavaScript knowledge

### Neutral

1. **Local-only:** REST API runs on localhost (no cloud infrastructure needed)
2. **Stateless:** API is stateless except for in-memory cache (restarts are safe)

---

## Implementation

- **Backend:** FastAPI (Python) on port 8000
- **Endpoints:** 6 GET + 1 POST (see gemini.md for schemas)
- **Cache Strategy:** Load on startup, invalidate on file change
- **CORS:** Enabled for localhost:3000, localhost:5173

---

## Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **REST API** | Clean separation, caching, reusability | Two processes, polling delay | ✅ **Chosen** |
| Direct file access | No backend needed | Browser security, no caching | ❌ Rejected |
| WebSocket | Real-time updates | Over-engineered, complexity | ❌ Rejected |
| GraphQL | Flexible queries | Overkill, more complex | ❌ Rejected |

---

## Related Decisions

- [ADR-002: FastAPI Over Flask](./002-fastapi-over-flask.md)
- [ADR-003: openpyxl for Excel Reading](./003-openpyxl-for-excel.md)
- [ADR-005: File Watcher Strategy](./005-file-watcher-strategy.md)

---

## Review Date

2027-03-12 (1 year from initial deployment)
