"""
KPI 4: Cashflow — May 2026
Reads live from Excel (`cashflow` sheet) via `excel_parser.EXCEL_PATH`.

cashflow sheet layout (1-indexed cols):
  col2 = label | col3 = Target | col4..8 = W1..W5 | col9 = Total | col10 = Expected
  R8  : TA Fees
  R9  : Management Fees
  R10 : Profit Incentive
  R12 : Outflow total (col10 fallback col9)
  R15 : Current Bank Balance (col10 fallback col9)
  R16 : Coliving Operations (col3)
  R17 : Coliving (col3)
  R18 : VARS (col3)
  R20 : Closing Cash (col10 fallback col9)
"""
import os

from excel_parser import EXCEL_PATH, excel_workbook_missing_message, shared_workbook


def _read():
    if not os.path.isfile(EXCEL_PATH):
        raise FileNotFoundError(excel_workbook_missing_message())
    wb = shared_workbook()
    ws = wb["cashflow"]

    def v(row, col):
        val = ws.cell(row, col).value
        return float(val) if val is not None else 0.0

    def v_first(row, cols: list[int]) -> float:
        for col in cols:
            val = ws.cell(row, col).value
            if val is not None:
                try:
                    return float(val)
                except (TypeError, ValueError):
                    continue
        return 0.0

    def inflow_row(row: int, label: str) -> dict:
        w1, w2, w3, w4, w5 = v(row, 4), v(row, 5), v(row, 6), v(row, 7), v(row, 8)
        total_received = v_first(row, [9]) or (w1 + w2 + w3 + w4 + w5)
        expected = v_first(row, [10, 9])
        return {
            "type": label,
            "target": v(row, 3),
            "w1": w1,
            "w2": w2,
            "w3": w3,
            "w4": w4,
            "w5": w5,
            "total_received": total_received,
            "expected": expected,
        }

    inflows = [
        inflow_row(8, "TA Fees"),
        inflow_row(9, "Management Fees"),
        inflow_row(10, "Profit Incentive"),
    ]

    for inf in inflows:
        inf["received"] = inf["total_received"]

    total_outflow    = v_first(12, [10, 9])   # Outflow row
    current_balance  = v_first(15, [10, 9])   # Current bank balance
    closing_balance  = v_first(20, [10, 9])   # Closing Cash

    account_balance = [
        {"account": "Coliving Operations", "amount": v(16, 3)},
        {"account": "Coliving",            "amount": v(17, 3)},
        {"account": "VARS",                "amount": v(18, 3)},
    ]

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
            "w5":       sum(i.get('w5', 0) for i in inflows),
            "total_received": sum(i['total_received'] for i in inflows),
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
