"""
KPI 5: Revenue Stream

Legacy workbooks used a Summary sheet. The May 2026 weekly workbook exposes the
same stream totals through Inflow/cashflow, so fall back to those sheets when
Summary is absent.
"""
from excel_parser import get_sheet_values, safe_int


def _to_lakhs(val: int | float) -> float:
    return round(float(val or 0) / 100000.0, 1)


def _from_current_inflow() -> dict | None:
    rows = get_sheet_values("Inflow") or get_sheet_values("cashflow")
    if not rows:
        return None

    labels = {
        "ta": ("TA Fees", 0, 0),
        "management": ("Management Fees", 0, 0),
        "profit": ("Profit Incentive", 0, 0),
    }

    for row in rows:
        if not row or len(row) < 10:
            continue
        label = str(row[1] or "").replace("\xa0", " ").strip().lower()
        if not label:
            continue
        target = safe_int(row[2]) or 0
        received = safe_int(row[9]) if len(row) > 9 else None
        if received is None:
            received = sum((safe_int(row[c]) or 0) for c in range(4, min(9, len(row))))

        if "ta" in label and "fee" in label and "total" in label:
            labels["ta"] = ("TA Fees", target, received or 0)
        elif "management" in label and "fee" in label:
            labels["management"] = ("Management Fees", target, received or 0)
        elif "profit" in label and "incentive" in label:
            labels["profit"] = ("Profit Incentive", target, received or 0)

    target = {name: target for name, target, _ in labels.values()}
    received = {name: received for name, _, received in labels.values()}
    target_total = sum(target.values())
    received_total = sum(received.values())
    achievement = round((received_total - target_total) / target_total * 100, 1) if target_total else 0.0

    def bar(label: str, data: dict) -> dict:
        return {
            "month": label,
            "TA Fees": _to_lakhs(data["TA Fees"]),
            "Management Fees": _to_lakhs(data["Management Fees"]),
            "Profit Incentive": _to_lakhs(data["Profit Incentive"]),
        }

    return {
        "mom_chart": [
            bar("Target May'26", target),
            bar("Received May'26", received),
        ],
        "yoy_chart": [
            bar("Target May'26", target),
            bar("Received May'26", received),
        ],
        "mom_pct": achievement,
        "yoy_pct": achievement,
        "feb26_total": _to_lakhs(target_total),
        "mar26_total": _to_lakhs(received_total),
        "mar25_total": _to_lakhs(target_total),
        "source": "current_inflow",
        "left_total_label": "Target total",
        "right_total_label": "Received total",
    }

def get_revenue_stream() -> dict:
    rows = get_sheet_values("Summary")
    if not rows or len(rows) < 13:
        fb = _from_current_inflow()
        return fb if fb else {"error": "Missing Summary data"}
    
    # Data is in strictly determined rows natively:
    # rows[5] = Spark TA
    # rows[6] = Olive TA
    # rows[9] = Mgt Olive
    # rows[12] = Profit Vendors
    # (Note: rows list is 0-indexed, so row 5 is index 5)
    
    # March'25: Col 41 Achieved (index 40)
    # Feb'26: Col 29 Achieved (index 28)
    # March'26: Col 13 Achieved (index 12)

    def extract_val(row_idx, col_idx):
        if row_idx < len(rows) and col_idx < len(rows[row_idx]):
            return safe_int(rows[row_idx][col_idx]) or 0
        return 0

    mar25_ta = extract_val(5, 40) + extract_val(6, 40)
    mar25_mgt = extract_val(9, 40)
    mar25_pro = extract_val(12, 40)

    feb26_ta = extract_val(5, 28) + extract_val(6, 28)
    feb26_mgt = extract_val(9, 28)
    feb26_pro = extract_val(12, 28)

    mar26_ta = extract_val(5, 12) + extract_val(6, 12)
    mar26_mgt = extract_val(9, 12)
    mar26_pro = extract_val(12, 12)

    mom_chart = [
        {
            "month": "Feb'26",
            "TA Fees": _to_lakhs(feb26_ta),
            "Management Fees": _to_lakhs(feb26_mgt),
            "Profit Incentive": _to_lakhs(feb26_pro)
        },
        {
            "month": "March'26",
            "TA Fees": _to_lakhs(mar26_ta),
            "Management Fees": _to_lakhs(mar26_mgt),
            "Profit Incentive": _to_lakhs(mar26_pro)
        }
    ]

    yoy_chart = [
        {
            "month": "March'25",
            "TA Fees": _to_lakhs(mar25_ta),
            "Management Fees": _to_lakhs(mar25_mgt),
            "Profit Incentive": _to_lakhs(mar25_pro)
        },
        {
            "month": "March'26",
            "TA Fees": _to_lakhs(mar26_ta),
            "Management Fees": _to_lakhs(mar26_mgt),
            "Profit Incentive": _to_lakhs(mar26_pro)
        }
    ]

    feb26_sum = feb26_ta + feb26_mgt + feb26_pro
    mar26_sum = mar26_ta + mar26_mgt + mar26_pro
    mar25_sum = mar25_ta + mar25_mgt + mar25_pro

    mom_pct = 0
    if feb26_sum > 0:
        mom_pct = round((mar26_sum - feb26_sum) / feb26_sum * 100, 1)

    yoy_pct = 0
    if mar25_sum > 0:
        yoy_pct = round((mar26_sum - mar25_sum) / mar25_sum * 100, 1)

    return {
        "mom_chart": mom_chart,
        "yoy_chart": yoy_chart,
        "mom_pct": mom_pct,
        "yoy_pct": yoy_pct,
        "feb26_total": _to_lakhs(feb26_sum),
        "mar26_total": _to_lakhs(mar26_sum),
        "mar25_total": _to_lakhs(mar25_sum)
    }
