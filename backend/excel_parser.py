"""
Excel Parser — reads the Olive Weekly Status Update xlsx file
and returns structured data for each KPI module.
"""
import os
import time
from typing import Any
import openpyxl
import pandas as pd

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "..", "Weekly update support file V5.xlsx")

_cache: dict[str, Any] = {}
_cache_mtime: float = 0.0


def _get_workbook(data_only: bool = True) -> openpyxl.Workbook:
    return openpyxl.load_workbook(EXCEL_PATH, data_only=data_only)


def _should_reload() -> bool:
    global _cache_mtime
    try:
        mtime = os.path.getmtime(EXCEL_PATH)
        if mtime != _cache_mtime:
            _cache_mtime = mtime
            return True
        return False
    except Exception:
        return True


def get_sheet_values(sheet_name: str) -> list[list]:
    """Return all rows (as list of values) from a given sheet."""
    wb = _get_workbook(data_only=True)
    if sheet_name not in wb.sheetnames:
        return []
    ws = wb[sheet_name]
    rows = []
    for row in ws.iter_rows(values_only=True):
        rows.append(list(row))
    return rows


def safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def safe_int(val) -> int | None:
    f = safe_float(val)
    return int(f) if f is not None else None
