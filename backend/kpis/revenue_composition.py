"""
KPI 3: Revenue Composition — reads live from Excel (Revenue sheet in
`Weekly update - 20.04.2026 v6.xlsx`)

SECTION 1: Target vs Actual (March'26)        → rows 5,6,8  | achievement col J (10)
SECTION 2: YoY Growth (March'25 vs March'26) → rows 14,15,17 | YoY col J (10)
SECTION 3: YoY Growth (Existing Portfolio)    → rows 23,24,26 | YoY col J (10)
"""
import os
import openpyxl

from excel_parser import EXCEL_PATH, excel_workbook_missing_message


def _read_revenue_sheet():
    if not os.path.isfile(EXCEL_PATH):
        raise FileNotFoundError(excel_workbook_missing_message())
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    ws = wb["Revenue"]

    def val(row, col):
        v = ws.cell(row, col).value
        return float(v) if v is not None else 0.0

    def pct(row, col):
        """Read a % cell (stored as decimal in Excel) and return as integer %."""
        v = ws.cell(row, col).value
        if v is None:
            return 0
        return round(float(v) * 100)

    # ── SECTION 1: Target vs Actual ─────────────────────────────
    target_online  = val(5, 3)
    target_offline = val(6, 3)
    target_total   = val(8, 3)

    actual_online  = val(5, 6)
    actual_offline = val(6, 6)
    actual_total   = val(8, 6)

    achievement_pct         = round(actual_total / target_total * 100) if target_total else 0
    achievement_online_pct  = pct(5, 10)   # J5
    achievement_offline_pct = pct(6, 10)   # J6

    section1 = {
        "label": "Target vs Actual (April'26)",
        "achievement_pct":         achievement_pct,
        "achievement_online_pct":  achievement_online_pct,
        "achievement_offline_pct": achievement_offline_pct,
        "bars": [
            {
                "name": "Target",
                "online":       round(target_online),
                "offline":      round(target_offline),
                "total":        round(target_total),
                "online_pct":   round(target_online  / target_total * 100) if target_total else 0,
                "offline_pct":  round(target_offline / target_total * 100) if target_total else 0,
            },
            {
                "name": "Actual",
                "online":       round(actual_online),
                "offline":      round(actual_offline),
                "total":        round(actual_total),
                "online_pct":   round(actual_online  / actual_total * 100) if actual_total else 0,
                "offline_pct":  round(actual_offline / actual_total * 100) if actual_total else 0,
            },
        ]
    }

    # ── SECTION 2: YoY Growth ────────────────────────────────────
    mar25_online  = val(14, 3)
    mar25_offline = val(15, 3)
    mar25_total   = val(17, 3)

    mar26_online  = val(14, 6)
    mar26_offline = val(15, 6)
    mar26_total   = val(17, 6)

    yoy_pct         = round((mar26_total - mar25_total) / mar25_total * 100) if mar25_total else 0
    yoy_online_pct  = pct(14, 10)  # J14
    yoy_offline_pct = pct(15, 10)  # J15

    section2 = {
        "label": "YoY Growth (April 2025 vs April 2026)",
        "yoy_pct":         yoy_pct,
        "yoy_online_pct":  yoy_online_pct,
        "yoy_offline_pct": yoy_offline_pct,
        "bars": [
            {
                "name": "April 2025",
                "online":       round(mar25_online),
                "offline":      round(mar25_offline),
                "total":        round(mar25_total),
                "online_pct":   round(mar25_online  / mar25_total * 100) if mar25_total else 0,
                "offline_pct":  round(mar25_offline / mar25_total * 100) if mar25_total else 0,
            },
            {
                "name": "April 2026",
                "online":       round(mar26_online),
                "offline":      round(mar26_offline),
                "total":        round(mar26_total),
                "online_pct":   round(mar26_online  / mar26_total * 100) if mar26_total else 0,
                "offline_pct":  round(mar26_offline / mar26_total * 100) if mar26_total else 0,
            },
        ]
    }

    # ── SECTION 3: Stable Properties (Non-Stacked) ────────────────
    exp25_total   = val(26, 3)
    exp26_total   = val(26, 6)

    existing_growth_pct = pct(22, 10)  # Row 22, Col J

    section3 = {
        "label": "March'26 vs March'25 - Stable properties",
        "growth_pct": existing_growth_pct,
        "bars": [
            {
                "name": "March 25",
                "total": round(exp25_total),
            },
            {
                "name": "March 26",
                "total": round(exp26_total),
            },
        ]
    }

    wb.close()
    return section1, section2, section3


def get_revenue_composition() -> dict:
    try:
        s1, s2, s3 = _read_revenue_sheet()
    except Exception as e:
        return {"error": str(e)}

    return {
        "section1": s1,
        "section2": s2,
        "section3": s3,
    }
