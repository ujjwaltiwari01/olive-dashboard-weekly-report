import openpyxl

from excel_parser import EXCEL_PATH

wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
ws = wb['Sheet1']
for i in range(1, 15):
    row_vals = [ws.cell(i, j).value for j in range(1, 10)]
    print(f"Row {i}: {row_vals}")
