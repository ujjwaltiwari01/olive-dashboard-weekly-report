"""
KPI 4: Cashflow — March
Reads live from Excel (cashflow sheet), Weekly update - 20.04.2026 v6.xlsx

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

from excel_parser import EXCEL_PATH, excel_workbook_missing_message


def _read():
    if not os.path.isfile(EXCEL_PATH):
        raise FileNotFoundError(excel_workbook_missing_message())
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    ws = wb["cashflow"]

    def v(row, col):
        val = ws.cell(row, col).value
        return float(val) if val is not None else 0.0

    inflows = [
        {"type": "TA Fees",          "target": v(8, 3),  "w1": v(8, 4), "w2": v(8, 5), "w3": v(8, 6), "w4": v(8, 7),  "expected": v(8, 8)},
        {"type": "Management Fees",  "target": v(9, 3),  "w1": v(9, 4), "w2": v(9, 5), "w3": v(9, 6), "w4": v(9, 7),  "expected": v(9, 8)},
        {"type": "Profit Incentive", "target": v(10, 3), "w1": v(10, 4), "w2": v(10, 5), "w3": v(10, 6), "w4": v(10, 7), "expected": v(10, 8)},
    ]

    for inf in inflows:
        inf["received"] = inf["w1"] + inf["w2"] + inf["w3"] + inf["w4"]

    total_outflow    = v(12, 8)   # Outflow row — col8
    current_balance  = v(15, 8)   # Current bank balance — col8
    closing_balance  = v(20, 8)   # Closing Cash — col8

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
        "inflows":           inflows,
        "account_balance":   account_balance,
        "inflow_totals": {
            "target":   sum(i['target']   for i in inflows),
            "received": sum(i['received'] for i in inflows),
            "w1":       sum(i['w1']       for i in inflows),
            "w2":       sum(i['w2']       for i in inflows),
            "w3":       sum(i['w3']       for i in inflows),
            "w4":       sum(i['w4']       for i in inflows),
            "expected": sum(i['expected'] for i in inflows),
        },
        "summary": {
            "immediate_payments": total_outflow,
            "current_balance":    current_balance,
            "total_inflow":       sum(i['received'] for i in inflows),
            "total_outflow":      total_outflow,
            "closing_balance":    closing_balance,
        },
    }
