"""
KPI 4: Revenue (YoY Comparison) — Year-over-Year (YoY) revenue comparison with channel mix
Sheet: Sales
"""
from excel_parser import get_sheet_values, safe_int

def get_sales_yoy() -> dict:
    rows = get_sheet_values("Sales")
    if not rows or len(rows) < 2:
        return {"error": "Missing Sales data"}

    # Initialize aggregators
    mar25_totals = {"Walk-in": 0, "Online": 0, "Corporate": 0}
    mar26_totals = {"Walk-in": 0, "Online": 0, "Corporate": 0}

    # Iterate rows starting from index 2 to bypass headers
    for row in rows[2:]:
        if not row or row[0] is None:
            continue
            
        name = str(row[0]).strip().upper()
        if not name or name == "PROPERTY" or name.startswith("TOTAL"):
            continue
            
        # Target March '25 columns (created by fill_mar25_sales.py at indices 60,61,62)
        m25_corp = safe_int(row[60]) if len(row) > 60 else 0
        m25_walk = safe_int(row[61]) if len(row) > 61 else 0
        m25_onli = safe_int(row[62]) if len(row) > 62 else 0

        # Target March '26 columns (Corporate: 55, Walkins: 56, Online: 57)
        m26_corp = safe_int(row[55]) if len(row) > 55 else 0
        m26_walk = safe_int(row[56]) if len(row) > 56 else 0
        m26_onli = safe_int(row[57]) if len(row) > 57 else 0

        # Accumulate
        mar25_totals["Corporate"] += (m25_corp or 0)
        mar25_totals["Walk-in"] += (m25_walk or 0)
        mar25_totals["Online"] += (m25_onli or 0)

        mar26_totals["Corporate"] += (m26_corp or 0)
        mar26_totals["Walk-in"] += (m26_walk or 0)
        mar26_totals["Online"] += (m26_onli or 0)

    # Format numbers in Lakhs correctly
    def to_lakhs(val: int) -> float:
        return round(val / 100000.0, 1)

    chart_data = [
        {
            "month": "April 2025",
            "Walk-in": to_lakhs(mar25_totals["Walk-in"]),
            "Online": to_lakhs(mar25_totals["Online"]),
            "Corporate": to_lakhs(mar25_totals["Corporate"])
        },
        {
            "month": "April 2026",
            "Walk-in": to_lakhs(mar26_totals["Walk-in"]),
            "Online": to_lakhs(mar26_totals["Online"]),
            "Corporate": to_lakhs(mar26_totals["Corporate"])
        }
    ]

    m25_sum = sum(mar25_totals.values())
    m26_sum = sum(mar26_totals.values())

    m25_sum_lakhs = to_lakhs(m25_sum)
    m26_sum_lakhs = to_lakhs(m26_sum)

    # Calculate YoY %
    # Formula: (March 26 - March 25) / March 25 * 100
    yoy_pct = 0
    if m25_sum > 0:
        yoy_pct = round((m26_sum - m25_sum) / m25_sum * 100, 1)

    return {
        "chart_data": chart_data,
        "yoy_pct": yoy_pct,
        "apr25_total": m25_sum_lakhs,
        "apr26_total": m26_sum_lakhs
    }
