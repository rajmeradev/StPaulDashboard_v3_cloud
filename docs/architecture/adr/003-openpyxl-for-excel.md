# ADR-003: openpyxl for Excel Reading

**Status:** Accepted
**Date:** 2026-03-12
**Decision Makers:** System Architect
**Technical Story:** Read .xlsx files in Python backend

---

## Context

The API needs to read data from a .xlsx Excel file. Python has several libraries for this:

1. **openpyxl** (pure Python, .xlsx only, read/write)
2. **xlrd** (old .xls files, deprecated for .xlsx)
3. **pandas** (data science, Excel as one of many formats)
4. **pyexcel** (multi-format wrapper library)

---

## Decision

**We will use openpyxl** with `data_only=True` to read calculated cell values.

---

## Rationale

### Why openpyxl?

**✅ Pros:**
1. **Native .xlsx support:** Designed specifically for Excel 2007+ format
2. **Read calculated values:** `data_only=True` reads formula results (not formulas)
3. **Pure Python:** No C dependencies, easy to install
4. **Mature:** 10+ years of development, widely adopted
5. **Lightweight:** Fast for reading (our primary use case)

**❌ Cons:**
1. **Excel-specific:** Doesn't handle .xls (old Excel format)
2. **Memory usage:** Loads entire workbook into memory (acceptable for our 100-row file)

### Why not xlrd?

- **Pros:** Supports old .xls files
- **Cons:** Deprecated for .xlsx in 2020, security vulnerabilities
- **Verdict:** Outdated, openpyxl is the modern replacement

### Why not pandas?

- **Pros:** Powerful data analysis, built-in Excel reading
- **Cons:** Heavy dependency (100MB+), designed for DataFrames (we need cell-by-cell access)
- **Verdict:** Overkill for simple cell reading

### Why not pyexcel?

- **Pros:** Multi-format (CSV, XLSX, ODS)
- **Cons:** Wrapper around openpyxl, adds abstraction layer
- **Verdict:** Unnecessary abstraction, openpyxl is simpler

---

## Consequences

### Positive

1. **Correct data:** `data_only=True` reads pre-calculated datetime values from columns M, N
2. **Fast reads:** ~200-500ms to read 100-row Excel file
3. **Simple API:** `wb['Sheet Name']['A1'].value` is intuitive
4. **No formula evaluation:** Relies on Excel to calculate formulas (correct approach)

### Negative

1. **Excel must calculate:** If Excel file is unsaved with formulas, cells return None
2. **Memory resident:** Entire workbook in RAM (not suitable for 10MB+ files)

### Neutral

1. **.xlsx only:** Doesn't support .xls (acceptable, client uses modern Excel)

---

## Implementation

```python
import openpyxl

# Load workbook with calculated values
wb = openpyxl.load_workbook(file_path, data_only=True)

# Read MASTER sheet
master_sheet = wb['MASTER']
schedule_start_hr = master_sheet['B1'].value  # Pre-calculated value

# Read schedule rows
schedule_sheet = wb['SCHEDULE - LINE 1 (EH)']
for row_idx in range(2, 89):
    sku = schedule_sheet[f'B{row_idx}'].value
    if not sku:
        continue  # Skip empty rows

    # Columns M, N contain datetime objects (Excel calculated)
    start_time = schedule_sheet[f'M{row_idx}'].value
    end_time = schedule_sheet[f'N{row_idx}'].value
```

---

## Critical Discovery

During implementation, we discovered:
- **Expected (from spec):** Columns K, L contain hours, need conversion to datetime
- **Actual (from Excel):** Columns M, N contain pre-calculated datetime objects

**Decision:** Use columns M, N directly (no conversion needed). This simplifies code and avoids timezone issues.

See [findings.md](../../../findings.md) for details.

---

## Alternatives Considered

| Library | .xlsx Support | Calculated Values | Dependencies | Verdict |
|---------|---------------|-------------------|--------------|---------|
| **openpyxl** | ✅ | ✅ (data_only=True) | Pure Python | ✅ **Chosen** |
| xlrd | ❌ (deprecated) | ✅ | Pure Python | ❌ Outdated |
| pandas | ✅ | ✅ | NumPy, ~100MB | ❌ Heavyweight |
| pyexcel | ✅ (via openpyxl) | ✅ | Wrapper layer | ❌ Unnecessary |

---

## Performance Metrics

After implementation:
- **File size:** ~50KB (St Paul Production Tool V2 Trial.xlsx)
- **Read time:** 200-500ms (entire workbook)
- **Memory:** ~10MB (workbook object in RAM)
- **Bottleneck:** File I/O, not parsing

---

## Related Decisions

- [ADR-002: FastAPI Over Flask](./002-fastapi-over-flask.md)
- [ADR-005: File Watcher Strategy](./005-file-watcher-strategy.md)

---

## Review Date

2027-03-12
