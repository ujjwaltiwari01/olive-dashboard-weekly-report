import openpyxl
try:
    wb = openpyxl.load_workbook(r"d:\olive weekly report dashboard\Weekly update support file - 06.04.2026 - v4.xlsx", read_only=True)
    print(wb.sheetnames)
except Exception as e:
    print(f"Error: {e}")
