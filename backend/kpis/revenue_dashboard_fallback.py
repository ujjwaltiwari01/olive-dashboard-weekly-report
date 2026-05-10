"""
When the weekly workbook has no Sales sheet, derive KPI 3 / KPI 4 style payloads
from the Revenue sheet (v2: Section 1 Online/Offline; Section 2 Short stay / Long stay).
"""
from __future__ import annotations

from excel_parser import get_sheet_values, safe_int


def _to_lakhs(rupees: int) -> float:
    return round(rupees / 100_000.0, 1)


def _cell_int(rows: list[list], row: int, col: int) -> int:
    if row >= len(rows) or col >= len(rows[row]):
        return 0
    return int(safe_int(rows[row][col]) or 0)


def _is_may_2026_revenue_sheet(rows: list[list]) -> bool:
    if len(rows) < 28:
        return False
    title = str(rows[20][2] if len(rows[20]) > 2 else "")
    return "8th May" in title and "Online" in title


def sales_mix_from_revenue_sheet() -> dict | None:
    """
    Revenue Section 3 in the May workbook gives channel actuals and targets:
    Walk-ins / Corporate / Online / Total.
    """
    rows = get_sheet_values("Revenue")
    if len(rows) < 8:
        return None

    if _is_may_2026_revenue_sheet(rows):
        actual = {
            "Walk-in": _cell_int(rows, 24, 2),
            "Corporate": _cell_int(rows, 25, 2),
            "Online": _cell_int(rows, 26, 2),
        }
        target = {
            "Walk-in": _cell_int(rows, 24, 3),
            "Corporate": _cell_int(rows, 25, 3),
            "Online": _cell_int(rows, 26, 3),
        }

        def bar(label: str, d: dict) -> dict:
            return {
                "month": label,
                "Walk-in": _to_lakhs(d["Walk-in"]),
                "Online": _to_lakhs(d["Online"]),
                "Corporate": _to_lakhs(d["Corporate"]),
            }

        target_total = _cell_int(rows, 27, 3) or sum(target.values())
        actual_total = _cell_int(rows, 27, 2) or sum(actual.values())
        pct = round((actual_total - target_total) / target_total * 100, 1) if target_total else 0.0
        return {
            "chart_data": [
                bar("Target (May'26)", target),
                bar("Actual (May'26)", actual),
            ],
            "mom_pct": pct,
            "mar_total": _to_lakhs(target_total),
            "apr_total": _to_lakhs(actual_total),
            "source": "revenue_may_channel_target_actual",
            "mix_change_label": "vs Target",
            "footer_left_label": "Target total",
            "footer_right_label": "Actual total",
        }

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
    Revenue Section 2 — May 2025 vs May 2026 in the 08.05 workbook.
    Prefers Short stay / Long stay rows (v2); falls back to Online / Offline (v1 layout).
    """
    rows = get_sheet_values("Revenue")
    if len(rows) < 17:
        return None

    if _is_may_2026_revenue_sheet(rows):
        long25 = _cell_int(rows, 12, 2)
        short25 = _cell_int(rows, 13, 2)
        total25 = _cell_int(rows, 14, 2) or (long25 + short25)
        long26 = _cell_int(rows, 12, 3)
        short26 = _cell_int(rows, 13, 3)
        total26 = _cell_int(rows, 14, 3) or (long26 + short26)
        yoy_pct = round((total26 - total25) / total25 * 100, 1) if total25 else 0.0
        return {
            "chart_data": [
                {
                    "month": "May 2025",
                    "Walk-in": _to_lakhs(long25),
                    "Online": _to_lakhs(short25),
                    "Corporate": 0,
                },
                {
                    "month": "May 2026",
                    "Walk-in": _to_lakhs(long26),
                    "Online": _to_lakhs(short26),
                    "Corporate": 0,
                },
            ],
            "yoy_pct": yoy_pct,
            "apr25_total": _to_lakhs(total25),
            "apr26_total": _to_lakhs(total26),
            "mar25_total": _to_lakhs(total25),
            "mar26_total": _to_lakhs(total26),
            "source": "revenue_may_yoy",
            "left_total_label": "May 2025 Total",
            "right_total_label": "May 2026 Total",
        }

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
        "mar25_total": _to_lakhs(m25_sum),
        "mar26_total": _to_lakhs(m26_sum),
        "source": "revenue_yoy",
    }
