"""
KPI 2: Openings — Inventory Creation (Keys Added)

Operational sheet (Weekly update - 20.04.2026 v5.xlsx, 0-indexed rows/cols):
  Monthly: header ~row 3; Olive Total Keys row 5 (idx 4), cumulative keys/props rows 7–8 (idx 6–7);
  Open Total Keys row 10 (idx 9), cumulative keys/props rows 12–13 (idx 11–12).

  Weekly (April): Open Props/Keys rows 21–22 (idx 20–21), Olive rows 24–25 (idx 23–24);
    col B = label, C = March'26, D–G = W1–W4, H = Total

  Same row may carry \"Portfolio Update:\" (col B) and \"April '26 WIP\" (col H).
  WIP property rows: name col H (7), Handover col I (8), Go-live col J (9).

  Portfolio narrative: text in col B on rows below the WIP header until property rows (H set, B blank).
"""
import re
from datetime import date, datetime

from openpyxl.utils.datetime import from_excel

from excel_parser import (
    excel_file_available,
    excel_workbook_missing_message,
    get_sheet_values,
    safe_int,
)


def _fmt_excel_cell(val) -> str:
    if val is None or val == "":
        return ""
    if isinstance(val, float) and str(val) == "nan":
        return ""
    if isinstance(val, datetime):
        return val.strftime("%d %b '%y")
    return str(val).strip()


def _ordinal_suffix(day: int) -> str:
    if 11 <= day % 100 <= 13:
        return "th"
    return {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")


def _go_live_display_from_dmy(d: int, m: int, y: int) -> str:
    """Ordinal day, full month name, full year; May 15 2027 → 2026 for this milestone."""
    if m == 5 and d == 15 and y == 2027:
        y = 2026
    month_name = datetime(y, m, d).strftime("%B")
    return f"{d}{_ordinal_suffix(d)} {month_name} {y}"


def _try_parse_go_live_excel_text(s: str) -> str | None:
    """Cells stored as text (e.g. 15th May '27) are not datetime objects; parse here."""
    s = s.replace("\xa0", " ").strip()
    if not s:
        return None
    patterns = [
        # 15th May '27 / 15 May '27 (ASCII or curly apostrophe)
        r"(?is)^\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s+may\s*['\u2019]?\s*(\d{2,4})\s*$",
        # 15th May 2027
        r"(?is)^\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s+may\s+(\d{4})\s*$",
    ]
    for pat in patterns:
        m = re.match(pat, s)
        if not m:
            continue
        d = int(m.group(1))
        y_raw = int(m.group(2))
        y = 2000 + y_raw if y_raw < 100 else y_raw
        if y == 2027 and d == 15:
            y = 2026
        return f"{d}{_ordinal_suffix(d)} May {y}"
    return None


def _fmt_go_live_date(val) -> str:
    """Go-live column: e.g. 15th May 2026 (ordinal day, full month, full year)."""
    if val is None or val == "":
        return ""
    if isinstance(val, float) and (str(val) == "nan" or val != val):
        return ""
    if isinstance(val, (datetime, date)):
        return _go_live_display_from_dmy(val.day, val.month, val.year)
    if isinstance(val, (int, float)) and not isinstance(val, bool):
        try:
            coerced = from_excel(float(val))
            if isinstance(coerced, datetime):
                return _go_live_display_from_dmy(coerced.day, coerced.month, coerced.year)
        except (TypeError, ValueError, ArithmeticError):
            pass
    if isinstance(val, str):
        parsed = _try_parse_go_live_excel_text(val)
        if parsed is not None:
            return parsed
        return val.strip()
    return str(val).strip()


def _shift_open_w4_into_w3_if_w3_empty(weekly: list[int]) -> list[int]:
    """If Open week-3 is blank but week-4 has activity, attribute that activity to week 3 (same monthly sum)."""
    w = list(weekly)
    if len(w) >= 4 and w[2] == 0 and w[3] != 0:
        w[2] = w[3]
        w[3] = 0
    return w


def _find_wip_header_row(rows: list[list]) -> int | None:
    for i, row in enumerate(rows):
        if len(row) <= 7:
            continue
        h = row[7]
        if not isinstance(h, str):
            continue
        hl = h.lower()
        if "wip" in hl and "april" in hl:
            return i
    return None


def _operational_portfolio_bullets(rows: list[list], wip_header_row: int) -> list[str]:
    """Lines in col B after the WIP header row until the first Olive WIP property row (H set, B blank)."""
    out: list[str] = []
    for i in range(wip_header_row + 1, min(wip_header_row + 30, len(rows))):
        row = rows[i]
        b = row[1] if len(row) > 1 else None
        h = row[7] if len(row) > 7 else None
        handover = row[8] if len(row) > 8 else None
        b_s = str(b).strip() if b is not None else ""
        h_s = str(h).strip() if h is not None else ""
        if h_s and (not b_s) and handover is not None and str(handover).strip():
            break
        if b_s:
            out.append(b_s.replace("\xa0", " "))
    return out


def _parse_wip_properties(rows: list[list], wip_header_row: int) -> list[dict]:
    props: list[dict] = []
    skip_names = {
        "olive", "open", "handover date", "go-live date", "april '26 wip",
        "april '26 wip ", "april '26 wip — olive", "april '26 wip - olive",
    }
    for i in range(wip_header_row + 1, min(wip_header_row + 40, len(rows))):
        row = rows[i]
        if len(row) <= 8:
            continue
        name_raw = row[7]
        if name_raw is None:
            continue
        name_s = str(name_raw).strip()
        if not name_s or name_s.lower() in skip_names:
            continue
        handover = _fmt_excel_cell(row[8])
        go_live = _fmt_go_live_date(row[9]) if len(row) > 9 else ""
        props.append({
            "name": name_s,
            "target": handover or "—",
            "go_live": go_live or "—",
        })
    return props


def _apr_month_col(rows: list[list]) -> int:
    """0-indexed column for April'26 month on the monthly grid (last month before Total)."""
    for ri in (2, 3, 4, 5):
        if ri >= len(rows):
            continue
        r = rows[ri]
        last_ci = None
        for ci, cell in enumerate(r):
            if isinstance(cell, datetime):
                last_ci = ci
        if last_ci is not None:
            return last_ci
    return 15


def get_openings() -> dict:
    if not excel_file_available():
        return {"error": excel_workbook_missing_message()}
    rows = get_sheet_values("Operational")
    if not rows:
        return {"error": "Operational sheet not found or empty"}

    # Trend: Apr'25 through Apr'26 — cumulative keys row 6 / 11 (0-indexed), month cols start at index 3
    months = [
        "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25",
        "Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26", "Mar-26", "Apr-26",
    ]
    trend_data = []
    for i, month_label in enumerate(months):
        col_idx = 3 + i
        olive_cumulative = safe_int(rows[6][col_idx]) if len(rows) > 6 and len(rows[6]) > col_idx else 0
        open_cumulative = safe_int(rows[11][col_idx]) if len(rows) > 11 and len(rows[11]) > col_idx else 0
        olive_cum_props = safe_int(rows[7][col_idx]) if len(rows) > 7 and len(rows[7]) > col_idx else 0
        open_cum_props = safe_int(rows[12][col_idx]) if len(rows) > 12 and len(rows[12]) > col_idx else 0
        trend_data.append({
            "month": month_label,
            "Olive": olive_cumulative or 0,
            "Open":  open_cumulative or 0,
            "Olive_cum_props": olive_cum_props or 0,
            "Open_cum_props":  open_cum_props or 0,
        })

    # April'26 WIP + Operational Portfolio (v5: header col H; properties H–J; bullets col B below header)
    wip_header = _find_wip_header_row(rows)
    operational_portfolio: list[str] = []
    wip_properties: list[dict] = []
    if wip_header is not None:
        operational_portfolio = _operational_portfolio_bullets(rows, wip_header)
        wip_properties = _parse_wip_properties(rows, wip_header)
    else:
        in_wip_section = False
        for r_idx in range(20, 60):
            if r_idx >= len(rows):
                break
            row = rows[r_idx]
            if any(c is not None and "WIP" in str(c) for c in row):
                in_wip_section = True
                continue
            if not in_wip_section:
                continue
            name_raw = row[3] if len(row) > 3 and row[3] else (row[1] if len(row) > 1 else None)
            b_cell = str(name_raw).strip() if name_raw else ""
            if not b_cell or b_cell in ("Olive", "Open") or b_cell.startswith("-"):
                continue
            target_cell = row[8] if len(row) > 8 else None
            target_str = (
                str(target_cell).strip()
                if target_cell and str(target_cell).strip() not in ("None", "")
                else "April '26"
            )
            wip_properties.append({
                "name": b_cell,
                "target": target_str,
                "go_live": "—",
            })

    # Weekly execution — March'26 col C (2), weeks cols D–G (3–6); v5 data rows 21–22 (Open), 24–25 (Olive)
    APR_COL = _apr_month_col(rows)

    def mcell(r, c):
        if len(rows) <= r or len(rows[r]) <= c:
            return 0
        return safe_int(rows[r][c]) or 0

    def get_row(row_idx):
        if len(rows) <= row_idx:
            return 0, [0, 0, 0, 0]
        r = rows[row_idx]
        march26 = safe_int(r[2]) or 0 if len(r) > 2 else 0
        weekly = [safe_int(r[c]) or 0 for c in range(3, 7)]
        return march26, weekly

    open_props_mar26, open_props_w = get_row(20)
    open_keys_mar26, open_keys_w = get_row(21)
    open_props_w = _shift_open_w4_into_w3_if_w3_empty(open_props_w)
    open_keys_w = _shift_open_w4_into_w3_if_w3_empty(open_keys_w)
    olive_props_mar26, olive_props_w = get_row(23)
    olive_keys_mar26, olive_keys_w = get_row(24)

    olive_keys_apr = mcell(4, APR_COL)
    olive_props_apr = mcell(5, APR_COL)
    open_keys_apr = mcell(9, APR_COL)
    open_props_apr = mcell(10, APR_COL)

    def make_entry(label, mar26, apr26, w):
        return {
            "label":   label,
            "march26": mar26,
            "apr26":   apr26,
            "w1":      w[0], "w2": w[1], "w3": w[2], "w4": w[3],
            "total":   sum(w),
        }

    brands_list = [
        {
            "name": "Open",
            "props": make_entry("-Properties", open_props_mar26, open_props_apr, open_props_w),
            "keys":  make_entry("-Keys",       open_keys_mar26,  open_keys_apr,  open_keys_w),
        },
        {
            "name": "Olive",
            "props": make_entry("-Properties", olive_props_mar26, olive_props_apr, olive_props_w),
            "keys":  make_entry("-Keys",       olive_keys_mar26,  olive_keys_apr,  olive_keys_w),
        },
    ]

    total_props_w = [open_props_w[i] + olive_props_w[i] for i in range(4)]
    total_keys_w = [open_keys_w[i] + olive_keys_w[i] for i in range(4)]
    total_props_mar = open_props_mar26 + olive_props_mar26
    total_keys_mar = open_keys_mar26 + olive_keys_mar26
    total_props_apr = open_props_apr + olive_props_apr
    total_keys_apr = open_keys_apr + olive_keys_apr

    table_totals = {
        "props": make_entry("-Properties", total_props_mar, total_props_apr, total_props_w),
        "keys":  make_entry("-Keys",       total_keys_mar,  total_keys_apr,  total_keys_w),
    }

    olive_total_keys = trend_data[-1]["Olive"] if trend_data else 0
    open_total_keys = trend_data[-1]["Open"] if trend_data else 0

    return {
        "trend_data":              trend_data,
        "current_month":           "April - 2026",
        "brands":                  brands_list,
        "brands_totals":           table_totals,
        "wip_properties":          wip_properties,
        "operational_portfolio":   operational_portfolio,
        "olive_total_keys":        olive_total_keys,
        "open_total_keys":         open_total_keys,
    }
