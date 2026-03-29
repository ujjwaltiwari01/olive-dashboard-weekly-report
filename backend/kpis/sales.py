"""
KPI 4: Sales — Actual revenue generation
Sheet: Sales (multi-column, per property per month)
Row 1: month headers (Apr'25 ... Mar'26)
Row 2: Corporate / Walkins / Online / TOTAL subheaders
Rows 3+: Property rows
"""
from excel_parser import get_sheet_values, safe_float

MONTHS = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25", "Sep'25",
          "Oct'25", "Nov'25", "Dec'25", "Jan'26", "Feb'26", "Mar'26"]

# Each month has 4 columns: Corporate, Walkins, Online, TOTAL
# Base column offsets (0-indexed): Apr'25 starts at col 1
# Month i → cols: 1 + i*4 (corp), 2 + i*4 (walk), 3 + i*4 (online), 4 + i*4 (total)
# But the sheet has gapped layout with some None columns — use every 4 cols
# Approximate: for first 8 months (Apr-Nov), each group = 4 cols
# From Dec'25 onwards, layout shifts slightly (Actual, Variance added)
# Simplified approach: just grab TOTAL column per month


def _find_total_cols(rows: list) -> list[int]:
    """Find column indices of TOTAL sub-header for each month."""
    if len(rows) < 2:
        return []
    header_row = rows[1] if rows[1] else []
    total_cols = []
    for ci, cell in enumerate(header_row):
        if isinstance(cell, str) and cell.strip().upper() == "TOTAL":
            total_cols.append(ci)
    return total_cols


def get_sales() -> dict:
    rows = get_sheet_values("Sales")
    if not rows:
        return {"months": MONTHS, "properties": [], "monthly_totals": []}

    # Find TOTAL column indices
    total_cols = _find_total_cols(rows)

    # Use first 12 TOTAL columns (one per month)
    month_total_cols = total_cols[:12]

    properties = []
    # Property rows start at row index 2 (0-based)
    for row in rows[2:]:
        if not row or row[0] is None:
            continue
        name = str(row[0]).strip()
        if not name or name.startswith("=") or name.upper() in ("PROPERTY", "TOTAL", "GRAND TOTAL"):
            continue
        # Skip formula-only rows
        if name.startswith("="):
            continue

        monthly = []
        for i, (month, col) in enumerate(zip(MONTHS, month_total_cols)):
            val = safe_float(row[col]) if col < len(row) else None
            rev = val if val and val > 0 else 0
            monthly.append({"month": month, "revenue": round(rev)})

        total_rev = sum(m["revenue"] for m in monthly)
        if total_rev == 0:
            continue

        properties.append({
            "name": name,
            "monthly": monthly,
            "total_revenue": round(total_rev)
        })

    # Monthly aggregation across all properties
    monthly_totals = []
    for i, month in enumerate(MONTHS):
        total = sum(
            p["monthly"][i]["revenue"] for p in properties
            if i < len(p["monthly"])
        )
        monthly_totals.append({"month": month, "total_revenue": round(total)})

    # Growth calculation (month-over-month)
    for i in range(1, len(monthly_totals)):
        prev = monthly_totals[i - 1]["total_revenue"]
        curr = monthly_totals[i]["total_revenue"]
        growth = round((curr - prev) / prev * 100, 1) if prev else 0
        monthly_totals[i]["growth_pct"] = growth
    if monthly_totals:
        monthly_totals[0]["growth_pct"] = 0

    grand_total = sum(m["total_revenue"] for m in monthly_totals)
    latest_month_revenue = monthly_totals[-1]["total_revenue"] if monthly_totals else 0
    latest_growth = monthly_totals[-1].get("growth_pct", 0) if len(monthly_totals) > 1 else 0

    insights = []
    if latest_growth < 0:
        insights.append(f"Revenue declined {abs(latest_growth)}% in latest month")
    elif latest_growth > 10:
        insights.append(f"Strong revenue growth of {latest_growth}% this month")

    return {
        "months": MONTHS,
        "properties": properties,
        "monthly_totals": monthly_totals,
        "grand_total": grand_total,
        "latest_month_revenue": latest_month_revenue,
        "latest_growth_pct": latest_growth,
        "insights": insights
    }
