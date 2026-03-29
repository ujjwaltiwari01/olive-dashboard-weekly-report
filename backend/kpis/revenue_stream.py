"""
KPI 5: Revenue Stream (MoM & YoY)
Sheet: Summary
"""
from excel_parser import get_sheet_values, safe_int

def get_revenue_stream() -> dict:
    rows = get_sheet_values("Summary")
    if not rows or len(rows) < 13:
        return {"error": "Missing Summary data"}
    
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

    # Format numbers in Lakhs correctly
    def to_lakhs(val: int) -> float:
        return round(val / 100000.0, 1)

    mom_chart = [
        {
            "month": "Feb'26",
            "TA Fees": to_lakhs(feb26_ta),
            "Management Fees": to_lakhs(feb26_mgt),
            "Profit Incentive": to_lakhs(feb26_pro)
        },
        {
            "month": "March'26",
            "TA Fees": to_lakhs(mar26_ta),
            "Management Fees": to_lakhs(mar26_mgt),
            "Profit Incentive": to_lakhs(mar26_pro)
        }
    ]

    yoy_chart = [
        {
            "month": "March'25",
            "TA Fees": to_lakhs(mar25_ta),
            "Management Fees": to_lakhs(mar25_mgt),
            "Profit Incentive": to_lakhs(mar25_pro)
        },
        {
            "month": "March'26",
            "TA Fees": to_lakhs(mar26_ta),
            "Management Fees": to_lakhs(mar26_mgt),
            "Profit Incentive": to_lakhs(mar26_pro)
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
        "feb26_total": to_lakhs(feb26_sum),
        "mar26_total": to_lakhs(mar26_sum),
        "mar25_total": to_lakhs(mar25_sum)
    }
