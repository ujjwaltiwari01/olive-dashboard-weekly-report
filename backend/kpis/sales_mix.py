"""
KPI 3: Sales Mix — Channel-wise sales mix (Walk-in / Online / Corporate) with MoM comparison
Sheet: Sales
"""
from excel_parser import get_sheet_values, safe_int

def get_sales_mix() -> dict:
    rows = get_sheet_values("Sales")
    if not rows or len(rows) < 2:
        return {"error": "Missing Sales data"}

    # Initialize aggregators
    # Structure mapping channels exactly to CFO requested naming
    feb_totals = {"Walk-in": 0, "Online": 0, "Corporate": 0}
    mar_totals = {"Walk-in": 0, "Online": 0, "Corporate": 0}

    # Iterate rows starting from index 2 to bypass headers
    for row in rows[2:]:
        if not row or row[0] is None:
            continue
            
        name = str(row[0]).strip().upper()
        if not name or name == "PROPERTY" or name.startswith("TOTAL"):
            continue
            
        # Target Feb '26 columns (Corporate: 50, Walkins: 51, Online: 52)
        feb_corp = safe_int(row[50]) if len(row) > 50 else 0
        feb_walk = safe_int(row[51]) if len(row) > 51 else 0
        feb_onli = safe_int(row[52]) if len(row) > 52 else 0

        # Target March '26 columns (Corporate: 55, Walkins: 56, Online: 57)
        mar_corp = safe_int(row[55]) if len(row) > 55 else 0
        mar_walk = safe_int(row[56]) if len(row) > 56 else 0
        mar_onli = safe_int(row[57]) if len(row) > 57 else 0

        # Accumulate
        feb_totals["Corporate"] += (feb_corp or 0)
        feb_totals["Walk-in"] += (feb_walk or 0)
        feb_totals["Online"] += (feb_onli or 0)

        mar_totals["Corporate"] += (mar_corp or 0)
        mar_totals["Walk-in"] += (mar_walk or 0)
        mar_totals["Online"] += (mar_onli or 0)

    # Format numbers in Lakhs correctly (e.g. 740484 / 100000 = 7.4)
    # Round to 1 decimal.
    def to_lakhs(val: int) -> float:
        return round(val / 100000.0, 1)

    chart_data = [
        {
            "month": "Feb'26",
            "Walk-in": to_lakhs(feb_totals["Walk-in"]),
            "Online": to_lakhs(feb_totals["Online"]),
            "Corporate": to_lakhs(feb_totals["Corporate"])
        },
        {
            "month": "March'26",
            "Walk-in": to_lakhs(mar_totals["Walk-in"]),
            "Online": to_lakhs(mar_totals["Online"]),
            "Corporate": to_lakhs(mar_totals["Corporate"])
        }
    ]

    feb_sum = sum(feb_totals.values())
    mar_sum = sum(mar_totals.values())

    feb_sum_lakhs = to_lakhs(feb_sum)
    mar_sum_lakhs = to_lakhs(mar_sum)

    # Calculate MoM %
    # Formula: (March - Feb) / Feb * 100
    mom_pct = 0
    if feb_sum > 0:
        mom_pct = round((mar_sum - feb_sum) / feb_sum * 100, 1)

    return {
        "chart_data": chart_data,
        "mom_pct": mom_pct,
        "feb_total": feb_sum_lakhs,
        "mar_total": mar_sum_lakhs
    }
