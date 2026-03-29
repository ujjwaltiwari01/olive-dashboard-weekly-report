"""
KPI 6: Inflow Detail — TA Fee collection per property
Sheet: TA Fee
Col 0 = SL
Col 1 = Property Name
Col 2 = City
Col 3 = BD
Col 4-14 = Monthly collected (Apr'25 → Feb'26)
Col 15 = Mar'26 Collectable
Col 16 = Mar'26 Collected
Col 17 = Mar'26 Due
Col 18 = Collected till Mar-2026
"""
from excel_parser import get_sheet_values, safe_float

MONTHS = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25", "Sep'25",
          "Oct'25", "Nov'25", "Dec'25", "Jan'26", "Feb'26"]


def get_inflow_detail() -> dict:
    rows = get_sheet_values("TA Fee")
    if not rows:
        return {"properties": [], "summary": {}}

    properties = []
    total_target = 0.0
    total_collected = 0.0
    total_due = 0.0

    # Data rows start at index 2 (skip header rows 0 and 1)
    for row in rows[2:]:
        if not row or row[1] is None:
            continue
        name = str(row[1]).strip()
        if not name or name.lower() in ("property name", "total", "spark", "sl"):
            continue
        if name.startswith("="):
            continue

        city = str(row[2]).strip() if row[2] else ""
        bd = str(row[3]).strip() if row[3] else ""

        monthly = []
        for i, month in enumerate(MONTHS):
            col = 4 + i
            val = safe_float(row[col]) if col < len(row) else None
            monthly.append({"month": month, "collected": round(val) if val and val > 0 else 0})

        collectable = safe_float(row[15]) if len(row) > 15 else None
        collected_mar = safe_float(row[16]) if len(row) > 16 else None
        due_mar = safe_float(row[17]) if len(row) > 17 else None
        cumulative = safe_float(row[18]) if len(row) > 18 else None

        collectable = collectable if collectable and collectable > 0 else 0
        collected_mar = collected_mar if collected_mar and collected_mar > 0 else 0
        due_mar = due_mar if due_mar and due_mar > 0 else 0

        collection_pct = round(collected_mar / collectable * 100, 1) if collectable else 0

        total_target += collectable
        total_collected += collected_mar
        total_due += due_mar

        properties.append({
            "name": name,
            "city": city,
            "bd": bd,
            "monthly": monthly,
            "mar26_target": round(collectable),
            "mar26_collected": round(collected_mar),
            "mar26_due": round(due_mar),
            "collection_pct": collection_pct,
            "cumulative": round(cumulative) if cumulative else 0
        })

    # Remove zero-data rows
    properties = [p for p in properties if p["mar26_target"] > 0 or p["cumulative"] > 0]

    # Sort by due amount (highest risk first)
    properties.sort(key=lambda x: x["mar26_due"], reverse=True)

    insights = []
    high_due = [p["name"] for p in properties if p["mar26_due"] > 500000]
    if high_due:
        insights.append(f"High outstanding (>5L) in: {', '.join(high_due[:3])}")

    low_collection = [p["name"] for p in properties if 0 < p["collection_pct"] < 50 and p["mar26_target"] > 0]
    if low_collection:
        insights.append(f"Low collection rate (<50%) in: {', '.join(low_collection[:2])}")

    return {
        "properties": properties,
        "summary": {
            "total_target": round(total_target),
            "total_collected": round(total_collected),
            "total_due": round(total_due),
            "collection_pct": round(total_collected / total_target * 100, 1) if total_target else 0
        },
        "insights": insights
    }
