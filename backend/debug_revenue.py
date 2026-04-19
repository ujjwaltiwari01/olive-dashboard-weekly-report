import openpyxl

from excel_parser import EXCEL_PATH

wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
ws = wb['Revenue']
for i in range(1, 35):
    row_vals = [ws.cell(i, j).value for j in range(1, 12)]
    print(f'Row {i}: {row_vals}')
