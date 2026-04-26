"""
Excel Parser — reads the CFO weekly workbook
`Weekly update - 27.04.2024 v2.xlsx` (multi-sheet).

Production (Railway, Docker): set OLIVE_WEEKLY_EXCEL_PATH or EXCEL_PATH to an absolute path
where that workbook is stored (volume mount, build artifact, etc.). If unset, the file
next to the repo root is used: Weekly update - 27.04.2024 v2.xlsx
"""
import os
import time
from typing import Any
import openpyxl
import pandas as pd

# Canonical weekly workbook for this dashboard (repo root). All KPI readers use EXCEL_PATH.
# Override only via OLIVE_WEEKLY_EXCEL_PATH / EXCEL_PATH — do not hardcode alternate .xlsx names in KPI modules.
WEEKLY_WORKBOOK_FILENAME = "Weekly update - 27.04.2024 v2.xlsx"
_DEFAULT_WORKBOOK = WEEKLY_WORKBOOK_FILENAME


def resolve_excel_path() -> str:
    """Resolve the canonical workbook path.

    Default: `<repo-root>/Weekly update - 27.04.2024 v2.xlsx`.
    Env overrides (`OLIVE_WEEKLY_EXCEL_PATH`, `EXCEL_PATH`) are honoured **only** if they
    point at a file that exists. Any stale path (e.g. an old shell still exporting a v6
    file) is ignored, so the dashboard cannot silently load the wrong workbook.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    default_path = os.path.abspath(os.path.join(here, "..", _DEFAULT_WORKBOOK))

    for key in ("OLIVE_WEEKLY_EXCEL_PATH", "EXCEL_PATH"):
        raw = os.environ.get(key, "").strip().strip('"').strip("'")
        if not raw:
            continue
        candidate = os.path.abspath(os.path.expanduser(raw))
        if os.path.isfile(candidate):
            return candidate
    return default_path


EXCEL_PATH = resolve_excel_path()


def excel_source_path() -> str:
    return EXCEL_PATH


def excel_file_available() -> bool:
    return os.path.isfile(EXCEL_PATH)


def excel_workbook_missing_message() -> str:
    """Single user-facing hint when the weekly xlsx is absent (API / exceptions)."""
    return (
        "Weekly Excel workbook is missing. "
        f"Add `{WEEKLY_WORKBOOK_FILENAME}` at the repository root (beside `backend/` and `frontend/`), "
        "or set OLIVE_WEEKLY_EXCEL_PATH / EXCEL_PATH to its absolute path (e.g. Railway Variables). "
        f"Resolved path: {excel_source_path()}"
    )


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
    if not excel_file_available():
        return []
    wb = _get_workbook(data_only=True)
    if sheet_name not in wb.sheetnames:
        return []
    ws = wb[sheet_name]
    rows = []
    for row in ws.iter_rows(values_only=True):
        rows.append(list(row))
    return rows


def safe_float(val) -> float | None:
    """Parse a cell value as float. Handles Indian-style commas (e.g. 1,79,56,000.00), ₹, %, and accounting negatives."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        try:
            f = float(val)
        except (TypeError, ValueError):
            return None
        if f != f:  # NaN
            return None
        return f
    if isinstance(val, str):
        s = val.strip()
        if not s or s.upper() in ("#N/A", "N/A", "-", "–", "—"):
            return None
        if s.startswith("#") and len(s) > 1:
            return None
        pct_suffix = s.endswith("%")
        if pct_suffix:
            s = s[:-1].strip()
        s = s.replace("₹", "").replace(",", "").replace(" ", "")
        neg = False
        if s.startswith("(") and s.endswith(")"):
            neg = True
            s = s[1:-1].strip()
        if not s:
            return None
        try:
            out = float(s)
        except ValueError:
            return None
        if neg:
            out = -out
        return out
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def safe_int(val) -> int | None:
    f = safe_float(val)
    return int(f) if f is not None else None
