import openpyxl

from excel_parser import EXCEL_PATH

try:
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True)
    print(wb.sheetnames)
except Exception as e:
    print(f"Error: {e}")
