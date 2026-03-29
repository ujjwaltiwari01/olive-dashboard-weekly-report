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

    # ── OPERATIONAL CONTEXT — Go-live and WIP ────────────────────────────────
    # Col B (idx 1) = Go-live, Col D (idx 3) = WIP
    # Scraping rows 23-30 for text items
    go_live = []
    wip = []

    def clean_text(t):
        if not t: return ""
        # Remove brand prefixes
        t = str(t).replace("Open Hotel by Olive - ", "").replace("Open Hotel by Olive  ", "").replace("Open Hotel by Olive – ", "")
        t = t.replace("Olive Hotel ", "")
        # Remove anything in parenthesis or extra descriptors
        if "(" in t: t = t.split("(")[0]
        if " by " in t: t = t.split(" by ")[0]
        return t.strip()

    for r_idx in range(23, 30):
        if r_idx < len(rows):
            row = rows[r_idx]
            # Column B (Go-live items)
            if len(row) > 1 and row[1] and str(row[1]).strip() and "Go-live" not in str(row[1]):
                go_live.append(clean_text(row[1]))
            # Column D (WIP items)
            if len(row) > 3 and row[3] and str(row[3]).strip() and "WIP" not in str(row[3]):
                wip.append(clean_text(row[3]))

    # ── LAYER 3: WEEKLY EXECUTION — March operational breakdown ───────────────
    # Row 16 = Open, Row 17 = Olive
    # Cols: W1=2, W2=3, W3=4, W4=5, Total=6
    def get_brand_row(row_idx, name):
        if len(rows) <= row_idx:
            return {"name": name, "w1": 0, "w2": 0, "w3": 0, "w4": 0, "total": 0}
        r = rows[row_idx]
        w = [safe_int(r[c]) or 0 for c in range(2, 6)]
        total = sum(w) # Using sum of weeks for the execution table total
        return {"name": name, "w1": w[0], "w2": w[1], "w3": w[2], "w4": w[3], "total": total}

    brands_list = [
        get_brand_row(17, "Olive"),
        get_brand_row(16, "Open")
    ]
    table_totals = {
        "w1":    sum(b["w1"]    for b in brands_list),
        "w2":    sum(b["w2"]    for b in brands_list),
        "w3":    sum(b["w3"]    for b in brands_list),
        "w4":    sum(b["w4"]    for b in brands_list),
        "total": sum(b["total"] for b in brands_list),
    }

    return {
        "trend_data":      trend_data,
        "current_month":   "March - 2026",
        "brands":          brands_list,
        "brands_totals":   table_totals,
        "go_live":         go_live,
        "wip":             wip,
    }
