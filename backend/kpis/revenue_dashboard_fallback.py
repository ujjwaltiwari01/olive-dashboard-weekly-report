"""
When the weekly workbook has no Sales sheet, derive KPI 3 / KPI 4 style payloads
from the Revenue sheet (v2: Section 1 Online/Offline; Section 2 Short stay / Long stay).
"""
from __future__ import annotations

from excel_parser import get_sheet_values, safe_int


def _to_lakhs(rupees: int) -> float:
    return round(rupees / 100_000.0, 1)


def sales_mix_from_revenue_sheet() -> dict | None:
    """
    Revenue Section 1 — Target (col C) vs Actual (col F), rows Online / Offline.
    """
    rows = get_sheet_values("Revenue")
    if len(rows) < 8:
        return None
    r5, r6 = rows[4], rows[5]
    if len(r5) < 7 or len(r6) < 7:
        return None
    if str(r5[1] or "").strip().lower() != "online":
        return None
    if str(r6[1] or "").strip().lower() != "offline":
        return None

    t_on = int(safe_int(r5[2]) or 0)
    t_off = int(safe_int(r6[2]) or 0)
    a_on = int(safe_int(r5[5]) or 0)
    a_off = int(safe_int(r6[5]) or 0)

    target = {"Walk-in": t_off, "Online": t_on, "Corporate": 0}
    actual = {"Walk-in": a_off, "Online": a_on, "Corporate": 0}

    def bar(label: str, d: dict) -> dict:
        return {
            "month": label,
            "Walk-in": _to_lakhs(d["Walk-in"]),
            "Online": _to_lakhs(d["Online"]),
            "Corporate": _to_lakhs(d["Corporate"]),
        }

    chart_data = [
        bar("Target (Apr'26)", target),
        bar("Actual (Apr'26)", actual),
    ]

    t_sum = sum(target.values())
    a_sum = sum(actual.values())
    mom_pct = round((a_sum - t_sum) / t_sum * 100, 1) if t_sum else 0.0

    return {
        "chart_data": chart_data,
        "mom_pct": mom_pct,
        "mar_total": _to_lakhs(t_sum),
        "apr_total": _to_lakhs(a_sum),
        "source": "revenue_target_actual",
        "mix_change_label": "vs Target",
        "footer_left_label": "Target total",
        "footer_right_label": "Actual total",
    }


def sales_yoy_from_revenue_sheet() -> dict | None:
    """
    Revenue Section 2 — April 2025 vs April 2026 (cols C and F).
    Prefers Short stay / Long stay rows (v2); falls back to Online / Offline (v1 layout).
    """
    rows = get_sheet_values("Revenue")
    if len(rows) < 17:
        return None
    r14, r15 = rows[13], rows[14]
    if len(r14) < 7 or len(r15) < 7:
        return None

    l14 = str(r14[1] or "").strip().lower()
    l15 = str(r15[1] or "").strip().lower()

    if l14 == "short stay" and l15 == "long stay":
        m25_a = int(safe_int(r14[2]) or 0)
        m25_b = int(safe_int(r15[2]) or 0)
        m26_a = int(safe_int(r14[5]) or 0)
        m26_b = int(safe_int(r15[5]) or 0)
    elif l14 == "online" and l15 == "offline":
        m25_a = int(safe_int(r14[2]) or 0)
        m25_b = int(safe_int(r15[2]) or 0)
        m26_a = int(safe_int(r14[5]) or 0)
        m26_b = int(safe_int(r15[5]) or 0)
    else:
        return None

    mar25_totals = {"Walk-in": m25_b, "Online": m25_a, "Corporate": 0}
    mar26_totals = {"Walk-in": m26_b, "Online": m26_a, "Corporate": 0}

    chart_data = [
        {
            "month": "April 2025",
            "Walk-in": _to_lakhs(mar25_totals["Walk-in"]),
            "Online": _to_lakhs(mar25_totals["Online"]),
            "Corporate": _to_lakhs(mar25_totals["Corporate"]),
        },
        {
            "month": "April 2026",
            "Walk-in": _to_lakhs(mar26_totals["Walk-in"]),
            "Online": _to_lakhs(mar26_totals["Online"]),
            "Corporate": _to_lakhs(mar26_totals["Corporate"]),
        },
    ]

    m25_sum = sum(mar25_totals.values())
    m26_sum = sum(mar26_totals.values())
    yoy_pct = round((m26_sum - m25_sum) / m25_sum * 100, 1) if m25_sum else 0.0

    return {
        "chart_data": chart_data,
        "yoy_pct": yoy_pct,
        "apr25_total": _to_lakhs(m25_sum),
        "apr26_total": _to_lakhs(m26_sum),
        "source": "revenue_yoy",
    }
