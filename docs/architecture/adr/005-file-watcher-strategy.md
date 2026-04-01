# ADR-005: File Watcher Strategy for Auto-Reload

**Status:** Accepted (Amended 2026-03-12)
**Date:** 2026-03-12
**Decision Makers:** System Architect
**Technical Story:** Automatically detect Excel file changes and reload cache

---

## Context

The API needs to detect when the Excel file changes and reload its cache. Several approaches exist:

1. **Polling:** Check file modification time every N seconds
2. **File system events:** Use OS-level file change notifications (inotify, FSEvents)
3. **Manual reload:** User triggers reload via POST /api/reload
4. **No caching:** Read file on every API request

---

## Decision

**We will use file system events** via the `watchdog` library, with:
- Background thread running Observer
- 2-second debounce to prevent multiple rapid reloads
- 500ms wait after detection (Excel file lock release)
- **Amendment:** Detect both `on_modified` and `on_created` events (macOS Excel behavior)

---

## Rationale

### Why File System Events?

**✅ Pros:**
1. **Near real-time:** 100-1000ms detection latency (vs 5-30s polling)
2. **CPU efficient:** OS notifies process (vs polling every second)
3. **Cross-platform:** watchdog supports macOS (FSEvents), Linux (inotify), Windows (ReadDirectoryChangesW)
4. **Battery friendly:** No active polling (important for laptops)

**❌ Cons:**
1. **Complexity:** Requires background thread and event handler
2. **Edge cases:** Excel creates temp files on macOS (requires on_created handler)
3. **Debugging:** File events can be noisy (multiple events per save)

### Why not Polling?

- **Pros:** Simple, no dependencies
- **Cons:** 5-30s latency, wastes CPU, scales poorly
- **Verdict:** Inferior to file events for real-time updates

### Why not Manual Reload Only?

- **Pros:** Simplest implementation
- **Cons:** Poor UX (user must click reload button), defeats "auto-refresh" goal
- **Verdict:** Acceptable fallback, but not primary mechanism

### Why not Read-On-Request?

- **Pros:** Always fresh data
- **Cons:** 200-500ms latency per request, Excel file locks, scales poorly
- **Verdict:** Unacceptable for performance

---

## Consequences

### Positive

1. **Fast updates:** 0.5-2s from Excel save to cache reload
2. **Automatic:** No user action required (fire-and-forget)
3. **Efficient:** Low CPU and memory overhead

### Negative

1. **macOS edge case:** Excel swaps temp files (requires on_created handler)
2. **Debouncing needed:** Single save triggers 2-3 events (solved with 2s debounce)
3. **File lock handling:** Must wait 500ms for Excel to release lock

### Neutral

1. **Background thread:** Runs in daemon thread (doesn't block API shutdown)
2. **Fallback:** POST /api/reload still available for manual override

---

## Implementation (Original)

```python
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class ExcelFileHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if Path(event.src_path) == EXCEL_FILE_PATH:
            time.sleep(0.5)  # Wait for Excel to release lock
            load_excel_data()  # Reload cache
```

---

## Amendment (2026-03-12)

**Problem:** macOS Excel doesn't directly modify files. Instead:
1. User presses Save
2. Excel creates temp file (e.g., `~$St Paul Production.xlsx`)
3. Excel swaps temp file with original (triggers `on_created`, not `on_modified`)

**Solution:** Handle both `on_modified` and `on_created` events.

```python
class ExcelFileHandler(FileSystemEventHandler):
    def _handle_file_change(self, event_path, event_type):
        if Path(event_path) == EXCEL_FILE_PATH:
            # Debounce logic
            time.sleep(0.5)  # Excel lock release
            load_excel_data()

    def on_modified(self, event):
        self._handle_file_change(event.src_path, "modified")

    def on_created(self, event):
        self._handle_file_change(event.src_path, "created")  # NEW
```

This fixes the issue where Excel saves on macOS weren't detected.

---

## Debouncing Strategy

Excel save triggers multiple events:
- `on_modified` for temp file creation
- `on_created` for file swap
- `on_modified` for metadata update

**Solution:** Track `last_reload` timestamp, ignore events within 2 seconds.

```python
def __init__(self, reload_callback):
    self.last_reload = 0
    self.debounce_seconds = 2

def _handle_file_change(self, event_path, event_type):
    now = time.time()
    if now - self.last_reload < self.debounce_seconds:
        return  # Skip

    # ... reload logic ...
    self.last_reload = now
```

---

## Alternatives Considered

| Approach | Latency | CPU Usage | Complexity | Verdict |
|----------|---------|-----------|------------|---------|
| **File events** | 0.5-2s | Low | Medium | ✅ **Chosen** |
| Polling (5s) | 5s avg | Medium | Low | ❌ Slower |
| Manual reload | Instant | Lowest | Lowest | ❌ Poor UX |
| Read-on-request | 500ms | High | Low | ❌ File locks |

---

## Testing

### Test Case: Excel Save Detection

1. Start API server: `python3 -m uvicorn tools.api_bridge:app --reload`
2. Open Excel file: `St Paul Production Tool V2 Trial.xlsx`
3. Edit cell (e.g., change LINE 1 row 2 cases to 1000)
4. Press Cmd+S (macOS) or Ctrl+S (Windows)
5. Check API logs for: `INFO:tools.file_watcher:Excel file created: ...`
6. Check API logs for: `INFO:tools.file_watcher:✓ Cache reloaded successfully`
7. Verify cache timestamp: `curl http://localhost:8000/api/status | jq .lastRead`

**Expected:** Reload within 0.5-2 seconds.

---

## Performance Metrics

After implementation:
- **Detection latency:** 100-1000ms (OS-dependent)
- **Lock wait time:** 500ms (configured)
- **Reload time:** 200-500ms (Excel read + parse)
- **Total latency:** 0.8-2.0s (Excel save → cache updated)

---

## Related Decisions

- [ADR-001: REST API Architecture](./001-rest-api-architecture.md)
- [ADR-003: openpyxl for Excel Reading](./003-openpyxl-for-excel.md)

---

## Review Date

2027-03-12
