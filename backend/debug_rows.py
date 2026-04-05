import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from excel_parser import get_sheet_values

rows = get_sheet_values("Operational")
for i in range(14, 25):
    if i < len(rows):
        print(f"Row {i}: {rows[i][:10]}")
