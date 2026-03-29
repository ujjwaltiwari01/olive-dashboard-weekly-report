"""
KPI 4: Cashflow — March
Reads live from Excel (cashflow sheet), Weekly update support file V4.xlsx

cashflow sheet layout (1-indexed cols):
  col2 = label | col3 = Target | col4 = Received | col5 = Expected
  R8  : TA Fees
  R9  : Management Fees
  R10 : Profit Incentive
  R12 : Outflow total (col5)
  R15 : Current Bank Balance (col5)
  R16 : Coliving Operations (col3)
  R17 : Coliving (col3)
  R18 : VARS (col3)
  R20 : Closing Cash (col5)
"""
import os
import openpyxl

EXCEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..",
    "Weekly update support file V4.xlsx"
)


def _read():
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    ws = wb["cashflow"]

    def v(row, col):
        val = ws.cell(row, col).value
        return float(val) if val is not None else 0.0

    inflows = [
        {"type": "TA Fees",          "target": v(8, 3),  "received": v(8, 4),  "expected": v(8, 5)},
        {"type": "Management Fees",  "target": v(9, 3),  "received": v(9, 4),  "expected": v(9, 5)},
        {"type": "Profit Incentive", "target": v(10, 3), "received": v(10, 4), "expected": v(10, 5)},
    ]

    total_outflow    = v(12, 5)   # Outflow row — col5
    current_balance  = v(15, 5)   # Current bank balance — col5
    closing_balance  = v(20, 5)   # Closing Cash — col5

    account_balance = [
        {"account": "Coliving Operations", "amount": v(16, 3)},
        {"account": "Coliving",            "amount": v(17, 3)},
        {"account": "VARS",                "amount": v(18, 3)},
    ]

    wb.close()
    return inflows, total_outflow, current_balance, closing_balance, account_balance


def get_cashflow() -> dict:
    try:
        inflows, total_outflow, current_balance, closing_balance, account_balance = _read()
    except Exception as e:
        return {"error": str(e)}

    return {
        "inflows":          inflows,
        "account_balance":  account_balance,
        "summary": {
            "current_balance": current_balance,
            "total_inflow":    sum(i['received'] for i in inflows),
            "total_outflow":   total_outflow,
            "closing_balance": closing_balance,
        },
    }
