"""
KPI 1: Signings — Deal closures vs targets per Brand with Weekly breakdown

Signing sheet (0-indexed):
  Row 4  = Olive  Total Keys  | Cols: Apr=3, May=4...Sep=8, Oct=9, Nov=10, Dec=11, Jan=12, Feb=13, Mar=14
  Row 9  = Spark  Total Keys
  Row 14 = Open   Total Keys
  Weekly section:
    Row 22 = Open  | cols: name=2, W1=3, W2=4, W3=5, W4=6, Total=7
    Row 23 = Olive | (same col layout)
    Row 24 = Spark | (same col layout)
"""
from excel_parser import get_sheet_values, safe_int

def get_signings() -> dict:
    rows = get_sheet_values("Signing")
    if not rows:
        return {"error": "Signing sheet not found or empty"}

    # ── TREND DATA (Apr'25 → Mar'26) — full 12-month view ────────────────────
    # Col mapping: Apr'25=3, May=4, Jun=5, Jul=6, Aug=7, Sep=8,
    #              Oct=9, Nov=10, Dec=11, Jan'26=12, Feb=13, Mar=14  (0-indexed)
    months = [
        "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25",
        "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26", "Mar-26"
    ]
    monthly_totals = []

    for i, month_label in enumerate(months):
        col_idx = 3 + i     # Apr-25 starts at col index 3
        olive_val  = safe_int(rows[4][col_idx])  if len(rows) > 4  and len(rows[4])  > col_idx else 0
        spark_val  = safe_int(rows[9][col_idx])  if len(rows) > 9  and len(rows[9])  > col_idx else 0
        open_val   = safe_int(rows[14][col_idx]) if len(rows) > 14 and len(rows[14]) > col_idx else 0

        # Cumulative properties per brand (row 6=Olive, row 11=Spark, row 16=Open)
        olive_cum_prop = safe_int(rows[6][col_idx])  if len(rows) > 6  and len(rows[6])  > col_idx else 0
        spark_cum_prop = safe_int(rows[11][col_idx]) if len(rows) > 11 and len(rows[11]) > col_idx else 0
        open_cum_prop  = safe_int(rows[16][col_idx]) if len(rows) > 16 and len(rows[16]) > col_idx else 0

        # Cumulative Keys per brand (row 7=Olive, row 12=Spark, row 17=Open)
        olive_cum_keys = safe_int(rows[7][col_idx])  if len(rows) > 7  and len(rows[7])  > col_idx else 0
        spark_cum_keys = safe_int(rows[12][col_idx]) if len(rows) > 12 and len(rows[12]) > col_idx else 0
        open_cum_keys  = safe_int(rows[17][col_idx]) if len(rows) > 17 and len(rows[17]) > col_idx else 0

        monthly_totals.append({
            "month":       month_label,
            "Olive":       olive_val or 0,
            "Spark":       spark_val or 0,
            "Open":        open_val  or 0,
            "Olive_props": olive_cum_prop or 0,
            "Spark_props": spark_cum_prop or 0,
            "Open_props":  open_cum_prop  or 0,
            "Olive_cum_keys": olive_cum_keys or 0,
            "Spark_cum_keys": spark_cum_keys or 0,
            "Open_cum_keys":  open_cum_keys  or 0,
        })

    # ── WEEKLY BREAKDOWN (March — current month) ──────────────────────────────
    # Row 22=Open, Row 23=Olive, Row 24=Spark
    # Cols: name=2, W1=3, W2=4, W3=5, W4=6, Total=7
    def get_brand_row(row_idx, name):
        if len(rows) <= row_idx:
            return {"name": name, "w1": 0, "w2": 0, "w3": 0, "w4": 0, "total": 0}
        r = rows[row_idx]
        w1    = safe_int(r[3]) or 0
        w2    = safe_int(r[4]) or 0
        w3    = safe_int(r[5]) or 0
        w4    = safe_int(r[6]) or 0
        total = safe_int(r[7]) or (w1 + w2 + w3 + w4)
        return {"name": name, "w1": w1, "w2": w2, "w3": w3, "w4": w4, "total": total}

    brands_list = [
        get_brand_row(23, "Olive"),
        get_brand_row(24, "Spark"),
        get_brand_row(22, "Open"),
    ]

    table_totals = {
        "w1":    sum(b["w1"]    for b in brands_list),
        "w2":    sum(b["w2"]    for b in brands_list),
        "w3":    sum(b["w3"]    for b in brands_list),
        "w4":    sum(b["w4"]    for b in brands_list),
        "total": sum(b["total"] for b in brands_list),
    }

    mar_total = monthly_totals[-1]["Olive"] + monthly_totals[-1]["Spark"] + monthly_totals[-1]["Open"]
    feb_total = monthly_totals[-2]["Olive"] + monthly_totals[-2]["Spark"] + monthly_totals[-2]["Open"]

    return {
        "monthly_totals":    monthly_totals,
        "current_month":     "March - 2026",
        "brands":            brands_list,
        "brands_totals":     table_totals,
        "insights":          [],
        "comparison_note":   f"March Total Signings: {mar_total} (vs Feb: {feb_total})",
    }
