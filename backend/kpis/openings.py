"""
KPI 2: Openings — Inventory Creation (Keys Added)

Operational sheet (0-indexed rows, 0-indexed cols):
  Row 4  = Olive Total Keys    | Cols: Apr=3...Oct=9, Nov=10, Dec=11, Jan=12, Feb=13, Mar=14
  Row 6  = Olive Cumulative keys
  Row 9  = Open  Total Keys
  Row 11 = Open  Cumulative Keys

  Weekly section:
    Row 14 = header row (Week 1, Week 2...)
    Row 16 = Open  | cols: name=1, W1=2, W2=3, W3=4, W4=5, Total=6
    Row 17 = Olive | (same col layout)
"""
from excel_parser import get_sheet_values, safe_int

def get_openings() -> dict:
    rows = get_sheet_values("Operational")   # Correct sheet name
    if not rows:
        return {"error": "Operational sheet not found or empty"}

    # ── TREND DATA (Apr'25 → Mar'26) — full 12-month cumulative view ──────────
    # Olive cumulative row = row 6 (idx), Open cumulative row = row 11 (idx)
    # Col mapping: Apr'25=3, May=4 ... Mar'26=14
    months = [
        "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25",
        "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26", "Mar-26"
    ]
    trend_data = []
    for i, month_label in enumerate(months):
        col_idx = 3 + i
        olive_cumulative = safe_int(rows[6][col_idx])  if len(rows) > 6  and len(rows[6])  > col_idx else 0
        open_cumulative  = safe_int(rows[11][col_idx]) if len(rows) > 11 and len(rows[11]) > col_idx else 0

        olive_cum_props = safe_int(rows[7][col_idx])  if len(rows) > 7  and len(rows[7])  > col_idx else 0
        open_cum_props  = safe_int(rows[12][col_idx]) if len(rows) > 12 and len(rows[12]) > col_idx else 0

        trend_data.append({
            "month": month_label,
            "Olive": olive_cumulative or 0,
            "Open":  open_cumulative  or 0,
            "Olive_cum_props": olive_cum_props or 0,
            "Open_cum_props":  open_cum_props or 0,
        })

    # ── OPERATIONAL CONTEXT — April'26 WIP properties ───────────────────────
    # V8 layout: WIP section is the "March '26 WIP" block
    # Col B (idx 1) = Property name, Col H (idx 7) = Keys, Col I (idx 8) = Target date
    # Scan all rows looking for the WIP section marker then collect properties
    wip_properties = []
    in_wip_section = False

    for r_idx in range(20, 60):
        if r_idx >= len(rows):
            break
        row = rows[r_idx]

        # Detect section start — col B contains text with "WIP"
        b_cell = str(row[1]).strip() if len(row) > 1 and row[1] else ""
        if "WIP" in b_cell:
            in_wip_section = True
            continue

        if not in_wip_section:
            continue

        # Stop at empty row
        if not b_cell:
            continue

        # Skip sub-headers like "Olive", "Open"
        if b_cell in ("Olive", "Open") or b_cell.startswith("-"):
            continue

        keys_cell  = row[7] if len(row) > 7 else None
        target_cell = row[8] if len(row) > 8 else None
        keys_val   = safe_int(keys_cell)
        target_str = str(target_cell).strip() if target_cell and str(target_cell).strip() not in ("None", "") else "April '26"

        wip_properties.append({
            "name":   b_cell,
            "keys":   keys_val or 0,
            "target": target_str,
        })

    # ── LAYER 3: WEEKLY EXECUTION — operational breakdown ————————————————————
    # V8 layout (0-indexed rows):
    #   rows[17] = Open  -Properties | rows[18] = Open  -Keys
    #   rows[20] = Olive -Properties | rows[21] = Olive -Keys
    # Col layout: col[1]=label, col[2]=March'26, col[3]=W1, col[4]=W2, col[5]=W3, col[6]=W4

    def get_row(row_idx):
        """Read March'26 (col 2) + W1-W4 (cols 3-6) from a row."""
        if len(rows) <= row_idx:
            return 0, [0, 0, 0, 0]
        r = rows[row_idx]
        march26 = safe_int(r[2]) or 0 if len(r) > 2 else 0
        weekly  = [safe_int(r[c]) or 0 for c in range(3, 7)]
        return march26, weekly

    # Open
    open_props_mar26,  open_props_w  = get_row(17)
    open_keys_mar26,   open_keys_w   = get_row(18)

    # Olive
    olive_props_mar26, olive_props_w = get_row(20)
    olive_keys_mar26,  olive_keys_w  = get_row(21)

    def make_entry(label, mar26, w):
        return {
            "label":   label,
            "march26": mar26,
            "w1":      w[0], "w2": w[1], "w3": w[2], "w4": w[3],
            "total":   sum(w)
        }

    brands_list = [
        {
            "name": "Open",
            "props": make_entry("-Properties", open_props_mar26,  open_props_w),
            "keys":  make_entry("-Keys",       open_keys_mar26,   open_keys_w),
        },
        {
            "name": "Olive",
            "props": make_entry("-Properties", olive_props_mar26, olive_props_w),
            "keys":  make_entry("-Keys",       olive_keys_mar26,  olive_keys_w),
        },
    ]

    total_props_w   = [open_props_w[i]  + olive_props_w[i]  for i in range(4)]
    total_keys_w    = [open_keys_w[i]   + olive_keys_w[i]   for i in range(4)]
    total_props_mar = open_props_mar26  + olive_props_mar26
    total_keys_mar  = open_keys_mar26   + olive_keys_mar26

    table_totals = {
        "props": make_entry("-Properties", total_props_mar, total_props_w),
        "keys":  make_entry("-Keys",       total_keys_mar,  total_keys_w),
    }

    # Total key counts from final cumulative values
    olive_total_keys = trend_data[-1]["Olive"] if trend_data else 0
    open_total_keys  = trend_data[-1]["Open"]  if trend_data else 0

    return {
        "trend_data":      trend_data,
        "current_month":   "April - 2026",
        "brands":          brands_list,
        "brands_totals":   table_totals,
        "wip_properties": wip_properties,
        "olive_total_keys": olive_total_keys,
        "open_total_keys":  open_total_keys,
    }
