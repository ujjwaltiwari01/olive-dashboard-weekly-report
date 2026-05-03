"""
KPI 6: Inflow Detail — TA Fee collection per property

Primary: sheet `TA Fee` (legacy layout).
Fallback: sheet `Inflow` — April cashflow breakdown block (cols B–K), W1–W5 + Total + To be collected.
"""
from excel_parser import get_sheet_values, safe_float

MONTHS = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25", "Sep'25",
          "Oct'25", "Nov'25", "Dec'25", "Jan'26", "Feb'26"]


def _from_ta_fee_sheet(rows: list[list]) -> dict:
    properties = []
    total_target = 0.0
    total_collected = 0.0
    total_due = 0.0

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

    return properties, total_target, total_collected, total_due


def _from_inflow_sheet(rows: list[list]) -> dict:
    """April'26 TA block between '1. TA fees' and 'Total TA fees' (cols B–K)."""
    properties = []
    total_target = 0.0
    total_collected = 0.0
    total_due = 0.0
    brand = "Spark"

    start_i = end_i = None
    for i, row in enumerate(rows):
        if not row or len(row) < 2:
            continue
        a = str(row[1] or "").replace("\xa0", " ").strip()
        if start_i is None and "TA" in a.upper() and "FEE" in a.upper() and a.strip().startswith("1"):
            start_i = i + 1
            continue
        if start_i is not None and a.upper() == "TOTAL TA FEES":
            end_i = i
            break
    if start_i is None:
        return [], 0.0, 0.0, 0.0
    if end_i is None:
        end_i = len(rows)

    for row in rows[start_i:end_i]:
        if not row or len(row) < 10:
            continue
        name = str(row[1] or "").replace("\xa0", " ").strip()
        if not name:
            continue
        ul = name.upper()
        if ul.startswith("A) "):
            brand = "Spark"
            continue
        if ul.startswith("B) "):
            brand = "Olive"
            continue
        if ul.startswith("C) "):
            brand = "Open"
            continue

        target = safe_float(row[2]) if len(row) > 2 else None
        w_vals = []
        for c in range(4, 9):
            w_vals.append(safe_float(row[c]) if c < len(row) else None)
        w_sum = sum((v or 0) for v in w_vals)
        received = safe_float(row[9]) if len(row) > 9 else None
        if received is None or received == 0:
            received = w_sum
        due = safe_float(row[10]) if len(row) > 10 else 0.0
        if due is None:
            due = 0.0

        tgt = float(target or 0)
        if tgt <= 0 and (received or 0) <= 0 and due <= 0:
            continue

        total_target += tgt
        total_collected += float(received or 0)
        total_due += max(0.0, float(due))

        collection_pct = round((received or 0) / tgt * 100, 1) if tgt else 0.0

        def _rw(i: int) -> float:
            v = w_vals[i] if i < len(w_vals) else None
            return round(v or 0)

        properties.append({
            "name": name,
            "city": brand or "—",
            "bd": "—",
            "monthly": [],
            "mar26_target": round(tgt),
            "mar26_collected": round(received or 0),
            "mar26_due": round(max(0, due)),
            "collection_pct": collection_pct,
            "cumulative": round(received or 0),
            "w1": _rw(0),
            "w2": _rw(1),
            "w3": _rw(2),
            "w4": _rw(3),
            "w5": _rw(4),
        })

    return properties, total_target, total_collected, total_due


def get_inflow_detail() -> dict:
    rows_ta = get_sheet_values("TA Fee")
    if rows_ta and len(rows_ta) > 2:
        properties, total_target, total_collected, total_due = _from_ta_fee_sheet(rows_ta)
        if properties:
            return _finalize(properties, total_target, total_collected, total_due)

    rows_in = get_sheet_values("Inflow")
    if rows_in:
        properties, total_target, total_collected, total_due = _from_inflow_sheet(rows_in)
        return _finalize(properties, total_target, total_collected, total_due)

    return {"properties": [], "summary": {}}


def _finalize(properties, total_target, total_collected, total_due):
    properties = [p for p in properties if p["mar26_target"] > 0 or p.get("cumulative", 0) > 0]
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
