"""
KPI 7: Outflow — Vendor payables and obligation tracking
Sheet: Payable
Two sections: EPDPL Coliving Operations (col B-C) and EPDPL Coliving Paragon (col E-F)
Monthly burn forecast from col L onwards (Feb-Sep 2026)
"""
from excel_parser import get_sheet_values, safe_float

BURN_MONTHS = ["Feb'26", "Mar'26", "Apr'26", "May'26", "Jun'26", "Jul'26", "Aug'26", "Sep'26"]


def get_outflow() -> dict:
    rows = get_sheet_values("Payable")
    if not rows:
        return {"vendors": [], "burn_forecast": [], "summary": {}}

    # Parse vendor payables (col 1=vendor name, col 2=amount due)
    hq_vendors = []
    paragon_vendors = []

    for row in rows[1:]:  # skip row 0 (section header)
        if not row:
            continue

        # HQ vendors: cols 1, 2
        hq_name = str(row[1]).strip() if len(row) > 1 and row[1] else None
        hq_amt = safe_float(row[2]) if len(row) > 2 else None
        if hq_name and hq_name not in ("Vendor Name",) and not hq_name.startswith("=") and hq_amt and hq_amt > 0:
            hq_vendors.append({"vendor": hq_name, "amount_due": round(hq_amt), "entity": "HQ"})

        # Paragon vendors: cols 4, 5
        par_name = str(row[4]).strip() if len(row) > 4 and row[4] else None
        par_amt = safe_float(row[5]) if len(row) > 5 else None
        if par_name and par_name not in ("Vendor Name",) and not par_name.startswith("=") and par_amt and par_amt > 0:
            paragon_vendors.append({"vendor": par_name, "amount_due": round(par_amt), "entity": "Paragon"})

    all_vendors = hq_vendors + paragon_vendors

    # Parse monthly burn forecast (row 3 onwards, col 11 = label, cols 11-18 = months)
    burn_forecast = []
    burn_rows_found = {}
    for row in rows:
        if not row or len(row) < 12:
            continue
        label = str(row[10]).strip() if row[10] else None
        if not label or label.startswith("=") or label == "Monthly Burn":
            continue

        values = []
        for i in range(8):
            col = 11 + i
            val = safe_float(row[col]) if col < len(row) else None
            values.append(round(val) if val else 0)

        if any(v > 0 for v in values):
            burn_rows_found[label] = values

    # Build burn forecast by month
    for i, month in enumerate(BURN_MONTHS):
        category_data = {}
        total = 0
        for label, values in burn_rows_found.items():
            v = values[i] if i < len(values) else 0
            category_data[label] = v
            total += v
        burn_forecast.append({
            "month": month,
            "total": round(total),
            "breakdown": category_data
        })

    total_payable = sum(v["amount_due"] for v in all_vendors)
    hq_total = sum(v["amount_due"] for v in hq_vendors)
    paragon_total = sum(v["amount_due"] for v in paragon_vendors)

    insights = []
    overdue_vendors = [v for v in all_vendors if v["amount_due"] > 2000000]
    if overdue_vendors:
        insights.append(f"Large payables (>20L): {', '.join(v['vendor'][:20] for v in overdue_vendors[:3])}")

    next_month_burn = burn_forecast[1]["total"] if len(burn_forecast) > 1 else 0
    if next_month_burn > 10000000:
        insights.append(f"High burn expected in Mar'26: ₹{next_month_burn:,.0f}")

    return {
        "vendors": sorted(all_vendors, key=lambda x: x["amount_due"], reverse=True)[:20],
        "burn_forecast": burn_forecast,
        "summary": {
            "total_payable": round(total_payable),
            "hq_payable": round(hq_total),
            "paragon_payable": round(paragon_total),
            "next_month_burn": next_month_burn
        },
        "insights": insights
    }
