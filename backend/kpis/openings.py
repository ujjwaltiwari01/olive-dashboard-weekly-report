"""
KPI 2: Openings — Inventory Creation (Keys Added)

Operational sheet (Weekly update support file - 13.04.2026 v2, 0-indexed rows/cols):
  Monthly header row 2: col C = brought forward, D..P = Apr'25..Apr'26
  Row 4  = Olive Total Keys (monthly additions)
  Row 5  = Olive Total Properties
  Row 6  = Olive Cumulative keys
  Row 7  = Olive Cumulative Properties
  Row 9  = Open  Total Keys
  Row 10 = Open  Total Properties
  Row 11 = Open  Cumulative Keys
  Row 12 = Open  Cumulative Properties

  Weekly (April): row 17–18 = Open Props/Keys, row 20–21 = Olive Props/Keys
    col B = label, C = March'26, D–G = W1–W4, H = Total

  WIP list: after a row containing \"WIP\" (e.g. \"March '26 WIP\"), property names are in col D (index 3),
  keys col H (7), target col I (8).
"""
from excel_parser import get_sheet_values, safe_int


def get_openings() -> dict:
    rows = get_sheet_values("Operational")
    if not rows:
        return {"error": "Operational sheet not found or empty"}

    # Trend: Apr'25 through Apr'26 — cumulative keys row 6 / 11 (0-indexed), month cols start at index 3
    months = [
        "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25",
        "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26", "Mar-26", "Apr-26",
    ]
    trend_data = []
    for i, month_label in enumerate(months):
        col_idx = 3 + i
        olive_cumulative = safe_int(rows[6][col_idx]) if len(rows) > 6 and len(rows[6]) > col_idx else 0
        open_cumulative = safe_int(rows[11][col_idx]) if len(rows) > 11 and len(rows[11]) > col_idx else 0
        olive_cum_props = safe_int(rows[7][col_idx]) if len(rows) > 7 and len(rows[7]) > col_idx else 0
        open_cum_props = safe_int(rows[12][col_idx]) if len(rows) > 12 and len(rows[12]) > col_idx else 0
        trend_data.append({
            "month": month_label,
            "Olive": olive_cumulative or 0,
            "Open":  open_cumulative or 0,
            "Olive_cum_props": olive_cum_props or 0,
            "Open_cum_props":  open_cum_props or 0,
        })

    # April'26 WIP — scan for WIP marker; property names live in column D (index 3)
    wip_properties = []
    in_wip_section = False

    for r_idx in range(20, 60):
        if r_idx >= len(rows):
            break
        row = rows[r_idx]

        if any(c is not None and "WIP" in str(c) for c in row):
            in_wip_section = True
            continue

        if not in_wip_section:
            continue

        name_raw = row[3] if len(row) > 3 and row[3] else (row[1] if len(row) > 1 else None)
        b_cell = str(name_raw).strip() if name_raw else ""
        if not b_cell:
            continue
        if b_cell in ("Olive", "Open") or b_cell.startswith("-"):
            continue

        keys_cell = row[7] if len(row) > 7 else None
        target_cell = row[8] if len(row) > 8 else None
        keys_val = safe_int(keys_cell)
        target_str = str(target_cell).strip() if target_cell and str(target_cell).strip() not in ("None", "") else "April '26"

        wip_properties.append({
            "name":   b_cell,
            "keys":   keys_val or 0,
            "target": target_str,
        })

    # Weekly execution — March'26 col C (2), weeks cols D–G (3–6)
    APR_COL = 15  # Apr-26 month additions (same axis as header row)

    def mcell(r, c):
        if len(rows) <= r or len(rows[r]) <= c:
            return 0
        return safe_int(rows[r][c]) or 0

    def get_row(row_idx):
        if len(rows) <= row_idx:
            return 0, [0, 0, 0, 0]
        r = rows[row_idx]
        march26 = safe_int(r[2]) or 0 if len(r) > 2 else 0
        weekly = [safe_int(r[c]) or 0 for c in range(3, 7)]
        return march26, weekly

    open_props_mar26, open_props_w = get_row(17)
    open_keys_mar26, open_keys_w = get_row(18)
    olive_props_mar26, olive_props_w = get_row(20)
    olive_keys_mar26, olive_keys_w = get_row(21)

    olive_keys_apr = mcell(4, APR_COL)
    olive_props_apr = mcell(5, APR_COL)
    open_keys_apr = mcell(9, APR_COL)
    open_props_apr = mcell(10, APR_COL)

    def make_entry(label, mar26, apr26, w):
        return {
            "label":   label,
            "march26": mar26,
            "apr26":   apr26,
            "w1":      w[0], "w2": w[1], "w3": w[2], "w4": w[3],
            "total":   sum(w),
        }

    brands_list = [
        {
            "name": "Open",
            "props": make_entry("-Properties", open_props_mar26, open_props_apr, open_props_w),
            "keys":  make_entry("-Keys",       open_keys_mar26,  open_keys_apr,  open_keys_w),
        },
        {
            "name": "Olive",
            "props": make_entry("-Properties", olive_props_mar26, olive_props_apr, olive_props_w),
            "keys":  make_entry("-Keys",       olive_keys_mar26,  olive_keys_apr,  olive_keys_w),
        },
    ]

    total_props_w = [open_props_w[i] + olive_props_w[i] for i in range(4)]
    total_keys_w = [open_keys_w[i] + olive_keys_w[i] for i in range(4)]
    total_props_mar = open_props_mar26 + olive_props_mar26
    total_keys_mar = open_keys_mar26 + olive_keys_mar26
    total_props_apr = open_props_apr + olive_props_apr
    total_keys_apr = open_keys_apr + olive_keys_apr

    table_totals = {
        "props": make_entry("-Properties", total_props_mar, total_props_apr, total_props_w),
        "keys":  make_entry("-Keys",       total_keys_mar,  total_keys_apr,  total_keys_w),
    }

    olive_total_keys = trend_data[-1]["Olive"] if trend_data else 0
    open_total_keys = trend_data[-1]["Open"] if trend_data else 0

    return {
        "trend_data":       trend_data,
        "current_month":    "April - 2026",
        "brands":           brands_list,
        "brands_totals":    table_totals,
        "wip_properties":   wip_properties,
        "olive_total_keys": olive_total_keys,
        "open_total_keys":  open_total_keys,
    }
