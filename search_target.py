import os
import sys

import pandas as pd

_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_ROOT, "backend"))
from excel_parser import EXCEL_PATH  # noqa: E402

xls = pd.ExcelFile(EXCEL_PATH)
try:
    for sheet in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet, header=None)
        for ri, row in df.iterrows():
            for ci, cell in row.items():
                if pd.notna(cell) and 'target' in str(cell).lower():
                    print(f"--- Found target in sheet {sheet} at row {ri}, col {ci} ---")
                    print(df.iloc[max(0, ri-1):ri+4, max(0, ci-1):ci+5].to_string())
except Exception as e:
    print(e)
