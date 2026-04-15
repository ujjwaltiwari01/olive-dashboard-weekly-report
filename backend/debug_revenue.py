import openpyxl

wb = openpyxl.load_workbook(r'd:\olive weekly report dashboard\Weekly update support file - 13.04.2026 v2.xlsx', data_only=True)
ws = wb['Revenue']
for i in range(1, 35):
    row_vals = [ws.cell(i, j).value for j in range(1, 12)]
    print(f'Row {i}: {row_vals}')
