"""
KPI 1: Signings — Deal closures vs targets per Brand with Weekly breakdown

Signings sheet (Weekly update support file - 13.04.2026 v2 layout, 0-indexed rows/cols):
  Row 2  = Olive Total Keys     | Cols: B = brought forward, C..O = Apr'25..Apr'26
  Row 7  = Spark Total Keys
  Row 12 = Open   Total Keys
  Cumulative properties / keys on the rows below each brand block.
  Weekly (April execution): rows 23–25 = Open, Olive, Spark
    col A = name, B = Mar'26, C–F = W1–W4, G = Total
  Portfolio Update: label in col A or B (e.g. "1. Portfolio Update:") then bullets in the same column until blank.
"""
import re

from excel_parser import excel_file_available, excel_source_path, get_sheet_values, safe_int


def _portfolio_title_match(text: str) -> bool:
    t = re.sub(r"^\s*\d+\s*[\.)]\s*", "", text.lower().replace(":", "").strip())
    return "portfolio update" in t


# Preferred wording for Open signings line (sheet may still have legacy copy).
_PORTFOLIO_OPEN_LINE_LEGACY = (
    "The following properties have been signed under the Open brand, each with 25 rooms:"
)
_PORTFOLIO_OPEN_LINE_PREFERRED = (
    "We have signed the following Open properties, each with 25 rooms:"
)


def _normalize_portfolio_line(text: str) -> str:
    if _PORTFOLIO_OPEN_LINE_LEGACY in text:
        return text.replace(_PORTFOLIO_OPEN_LINE_LEGACY, _PORTFOLIO_OPEN_LINE_PREFERRED, 1)
    return text


def _portfolio_update_bullets(rows: list[list]) -> list[str]:
    """Read narrative bullets from the sheet below the Portfolio Update heading."""
    start_idx: int | None = None
    title_col = 0
    for i, r in enumerate(rows):
        if not r:
            continue
        for col in (0, 1):
            if len(r) <= col:
                continue
            v = r[col]
            if not isinstance(v, str) or not v.strip():
                continue
            if _portfolio_title_match(v.strip()):
                start_idx = i + 1
                title_col = col
                break
        if start_idx is not None:
            break
    if start_idx is None:
        return []

    out: list[str] = []
    for j in range(start_idx, min(start_idx + 25, len(rows))):
        r = rows[j]
        if not r or len(r) <= title_col:
            break
        cell = r[title_col]
        if cell is None:
            break
        if isinstance(cell, str):
            text = cell.replace("\xa0", " ").strip()
        else:
            text = str(cell).strip() if cell is not None else ""
        if not text:
            break
        out.append(_normalize_portfolio_line(text))
    return out


def _signing_rows():
    for name in ("Signings", "Signing"):
        rows = get_sheet_values(name)
        if rows:
            return rows
    return []


def get_signings() -> dict:
    if not excel_file_available():
        return {
            "error": (
                "Weekly Excel workbook is missing on the server. "
                "Set OLIVE_WEEKLY_EXCEL_PATH to the absolute path of your .xlsx file. "
                f"Checked: {excel_source_path()}"
            ),
            "portfolio_update": [],
        }
    rows = _signing_rows()
    if not rows:
        return {"error": "Signings sheet not found or empty", "portfolio_update": []}

    # Monthly trend: Apr'25 through Apr'26 (13 points); first month column index = 2
    months = [
        "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25",
        "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26", "Mar-26", "Apr-26",
    ]
    OLIVE_KEYS, SPARK_KEYS, OPEN_KEYS = 2, 7, 12
    OLIVE_CUM_P, OLIVE_CUM_K = 4, 5
    SPARK_CUM_P, SPARK_CUM_K = 9, 10
    OPEN_CUM_P, OPEN_CUM_K = 14, 15
    APR_MONTH_COL = 14  # Apr-26 on same axis as monthly grid (0-indexed)

    monthly_totals = []
    for i, month_label in enumerate(months):
        col_idx = 2 + i

        def cell(row_idx):
            if len(rows) <= row_idx or len(rows[row_idx]) <= col_idx:
                return None
            return rows[row_idx][col_idx]

        monthly_totals.append({
            "month": month_label,
            "Olive":       (safe_int(cell(OLIVE_KEYS)) or 0),
            "Spark":       (safe_int(cell(SPARK_KEYS)) or 0),
            "Open":        (safe_int(cell(OPEN_KEYS)) or 0),
            "Olive_props": (safe_int(cell(OLIVE_CUM_P)) or 0),
            "Spark_props": (safe_int(cell(SPARK_CUM_P)) or 0),
            "Open_props":  (safe_int(cell(OPEN_CUM_P)) or 0),
            "Olive_cum_keys": (safe_int(cell(OLIVE_CUM_K)) or 0),
            "Spark_cum_keys": (safe_int(cell(SPARK_CUM_K)) or 0),
            "Open_cum_keys":  (safe_int(cell(OPEN_CUM_K)) or 0),
        })

    def get_brand_weekly(row_idx, name, monthly_keys_row):
        if len(rows) <= row_idx:
            return {
                "name": name, "prev_month": 0, "apr26": 0,
                "w1": 0, "w2": 0, "w3": 0, "w4": 0, "total": 0,
            }
        r = rows[row_idx]
        apr26 = 0
        if len(rows) > monthly_keys_row and len(rows[monthly_keys_row]) > APR_MONTH_COL:
            apr26 = safe_int(rows[monthly_keys_row][APR_MONTH_COL]) or 0
        prev_m = safe_int(r[1]) or 0
        w1 = safe_int(r[2]) or 0
        w2 = safe_int(r[3]) or 0
        w3 = safe_int(r[4]) or 0
        w4 = safe_int(r[5]) or 0
        t_cell = safe_int(r[6]) if len(r) > 6 else None
        total = t_cell if t_cell is not None else (w1 + w2 + w3 + w4)
        return {
            "name": name, "prev_month": prev_m, "apr26": apr26,
            "w1": w1, "w2": w2, "w3": w3, "w4": w4, "total": total,
        }

    brands_list = [
        get_brand_weekly(24, "Olive", OLIVE_KEYS),
        get_brand_weekly(25, "Spark", SPARK_KEYS),
        get_brand_weekly(23, "Open", OPEN_KEYS),
    ]

    table_totals = {
        "prev_month": sum(b["prev_month"] for b in brands_list),
        "apr26":      sum(b["apr26"] for b in brands_list),
        "w1":         sum(b["w1"] for b in brands_list),
        "w2":         sum(b["w2"] for b in brands_list),
        "w3":         sum(b["w3"] for b in brands_list),
        "w4":         sum(b["w4"] for b in brands_list),
        "total":      sum(b["total"] for b in brands_list),
    }

    mar_total = (
        monthly_totals[-2]["Olive"] + monthly_totals[-2]["Spark"] + monthly_totals[-2]["Open"]
    )
    apr_total = (
        monthly_totals[-1]["Olive"] + monthly_totals[-1]["Spark"] + monthly_totals[-1]["Open"]
    )

    latest = monthly_totals[-1]
    total_properties = (latest["Olive_props"] or 0) + (latest["Spark_props"] or 0) + (latest["Open_props"] or 0)
    total_keys = (latest["Olive_cum_keys"] or 0) + (latest["Spark_cum_keys"] or 0) + (latest["Open_cum_keys"] or 0)

    return {
        "monthly_totals":    monthly_totals,
        "current_month":     "April - 2026",
        "brands":            brands_list,
        "brands_totals":     table_totals,
        "total_properties":  total_properties,
        "total_keys":        total_keys,
        "insights":          [],
        "comparison_note":   f"April Total Signings: {apr_total} (vs Mar: {mar_total})",
        "portfolio_update":  _portfolio_update_bullets(rows),
    }
