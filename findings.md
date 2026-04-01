# findings.md — Research, Discoveries, Constraints

## Excel File Analysis (2026-03-12)

### Sheets Found (7 total)
| # | Sheet | Relevant? |
|---|-------|-----------|
| 1 | Claude Log | No — internal log |
| 2 | DASHBOARD & INSTRUCTIONS | No — reference only |
| 3 | PRODUCTION GANTT | Yes — this is what we're replacing |
| 4 | SCHEDULE - LINE 1 (EH) | Yes — primary data, 88 rows |
| 5 | SCHEDULE - LINE 2 (TR7) | Yes — primary data, 97 rows |
| 6 | GOAL CALCULATOR & MRP | Maybe — material planning reference |
| 7 | MASTER | Yes — config constants + SKU database |

### Key Findings

1. **Column mapping differs slightly from Systeminstruction.md:**
   - Systeminstruction says Notes = col O, Gallons = col P, but actual Excel has:
     - Col M (idx 12) = Start Time, Col N (idx 13) = End Time (pre-calculated ISO in Excel)
     - Col O (idx 14) = Total Gallons, Col P (idx 15) = Total Pounds
     - Col Q (idx 16) = Raw lbs, Col R (idx 17) = Skim lbs
     - Col S (idx 18) = Whole Milk Req, Col T (idx 19) = Skim Req
   - **Note:** The Excel already has Start Time and End Time as pre-calculated columns (M, N). This may simplify API logic — we may not need to manually convert from hours elapsed if these columns contain valid datetime values.

2. **Schedule data has 20 columns** (not 21 as initially counted — the 21st may be empty).

3. **MASTER sheet has additional fields** not in the original Systeminstruction:
   - B6: Default CIP Duration (6 hrs)
   - B7: Water Flush Duration (20 min)
   - B8: LAC Hold Required (20 hrs)
   - B9: Line 1 Baseline End (40 hrs)
   - B10: Line 2 Baseline End (40 hrs)

4. **SKU Database** starts at row 15 in MASTER sheet with full product metadata including:
   - Product ID, SKU Name, Customer, SKU Type, Subtype
   - Flavor Strength, Allergen Category, CIP Requirement
   - Lactose-Free flag, Fat %, Package Qty

5. **Line 2 is sparsely populated** — only 1 active production run in first rows (OV-H&H ORG, 5000 cases, 14.29 hrs).

6. **Override columns** are H (Start), I (Duration), J (End) — column order differs from Systeminstruction.md which listed H=Start, I=End, J=Duration. **Actual order: Start, Duration, End.**

### Constraints
- Excel file may be locked while open — need 500ms delay on file change events
- Must read calculated values, not formulas
- macOS environment (Darwin) — file watcher must work on macOS
- File path contains a space in directory name ("Projects /St Paul Tool")

### Open Questions
- Are the Start Time (col M) and End Time (col N) columns reliable ISO datetimes, or do we still need to convert from hours elapsed?
- Does the Notes column exist somewhere beyond column T?
- What is the full list of SKUs for the colour palette?
