from __future__ import annotations

"""
KPI: Revenue Composition — reads the Revenue sheet from the workbook at
`excel_parser.EXCEL_PATH` (see `excel_parser.WEEKLY_WORKBOOK_FILENAME` at repo root).
Override with `OLIVE_WEEKLY_EXCEL_PATH` or `EXCEL_PATH` if the workbook lives elsewhere.

SECTION 1: Target vs Actual (managed)     → rows 5,6,8  | achievement col J (10)
SECTION 2: YoY managed (Short / Long stay) → rows 14,15,17 | growth col J (10)
SECTION 3: MoM franchised — anchored on title "MoM Growth - Franchised…" then
            month labels row +2; rupee amounts for Open (and Others/Total when present) use the
            same columns as the month headers (C/E/G). v4 may interleave % in D/F/H and omit Others/Total rows.
"""
import os

from excel_parser import EXCEL_PATH, excel_workbook_missing_message, safe_float, shared_workbook


def _revenue_sheet_is_may2026_managed_block(ws) -> bool:
    """May 2026 weekly workbook: managed online/offline block title on row 21, col C."""
    t = str(ws.cell(21, 3).value or "")
    return "8th May" in t and "Online" in t


def _read_property_revenue_trend() -> dict:
    """Revenue sheet top block: Jan-Apr monthly revenue and 8th May weekly MTD."""
    wb = shared_workbook()
    ws = wb["Revenue"]

    def rupees(row: int, col: int) -> float:
        f = safe_float(ws.cell(row, col).value)
        return f if f is not None else 0.0

    months: list[dict] = []
    for col in range(3, 8):
        raw_label = ws.cell(4, col).value
        if raw_label is None:
            continue
        label_raw = str(raw_label).strip().lower()
        if "jan" in label_raw:
            label = "Jan"
        elif "feb" in label_raw:
            label = "Feb"
        elif "mar" in label_raw:
            label = "March"
        elif "apr" in label_raw:
            label = "April"
        elif "may" in label_raw:
            label = "May"
        else:
            label = str(raw_label).strip()
        if not label:
            continue

        long_stay = rupees(5, col)
        short_stay = rupees(6, col)
        total = rupees(7, col) or (long_stay + short_stay)
        if total <= 0:
            continue

        months.append({
            "month": label,
            "long_stay": round(long_stay),
            "short_stay": round(short_stay),
            "total": round(total),
            "long_stay_lakhs": round(long_stay / 100000, 1),
            "short_stay_lakhs": round(short_stay / 100000, 1),
            "total_lakhs": round(total / 100000, 1),
        })

    return {
        "title": "Property Revenue - Trend",
        "unit": "lakhs",
        "bars": months,
    }


def _read_property_revenue_comparison() -> dict:
    """Revenue sheet second block: same-period YoY and sequential MoM revenue comparison."""
    wb = shared_workbook()
    ws = wb["Revenue"]

    def rupees(row: int, col: int) -> float:
        f = safe_float(ws.cell(row, col).value)
        return f if f is not None else 0.0

    def bar(label: str, long_stay: float, short_stay: float, total: float) -> dict:
        t = total or (long_stay + short_stay)
        return {
            "month": label,
            "long_stay": round(long_stay),
            "short_stay": round(short_stay),
            "total": round(t),
            "long_stay_lakhs": round(long_stay / 100000, 1),
            "short_stay_lakhs": round(short_stay / 100000, 1),
            "total_lakhs": round(t / 100000, 1),
        }

    may25 = bar("May '25", rupees(13, 3), rupees(14, 3), rupees(15, 3))
    may26_yoy = bar("May '26", rupees(13, 4), rupees(14, 4), rupees(15, 4))
    apr26 = bar("April '26", rupees(13, 7), rupees(14, 7), rupees(15, 7))
    may26_mom = bar("May '26", rupees(13, 8), rupees(14, 8), rupees(15, 8))

    def growth(prev: dict, curr: dict) -> float:
        p = float(prev["total"])
        c = float(curr["total"])
        return round((c - p) / p * 100, 1) if p else 0.0

    return {
        "title": "Property Revenue - vs MoM vs YoY",
        "subtitle": "Same period",
        "unit": "lakhs",
        "yoy": {
            "label": "YoY",
            "growth_pct": growth(may25, may26_yoy),
            "bars": [may25, may26_yoy],
        },
        "mom": {
            "label": "MoM",
            "growth_pct": growth(apr26, may26_mom),
            "bars": [apr26, may26_mom],
        },
    }


def _read_online_offline_ota_obe() -> dict:
    """Revenue sheet third block: Actual vs Target by channel and Online split."""
    wb = shared_workbook()
    ws = wb["Revenue"]

    def rupees(row: int, col: int) -> float:
        f = safe_float(ws.cell(row, col).value)
        return f if f is not None else 0.0

    def channel_bar(label: str, value_col: int) -> dict:
        walk_in = rupees(25, value_col)
        corporate = rupees(26, value_col)
        online = rupees(27, value_col)
        total = rupees(28, value_col) or (walk_in + corporate + online)
        return {
            "month": label,
            "walk_in": round(walk_in),
            "corporate": round(corporate),
            "online": round(online),
            "total": round(total),
            "walk_in_lakhs": round(walk_in / 100000, 1),
            "corporate_lakhs": round(corporate / 100000, 1),
            "online_lakhs": round(online / 100000, 1),
            "total_lakhs": round(total / 100000, 1),
        }

    obe = rupees(25, 8)
    ota = rupees(27, 8)
    online_total = rupees(28, 8) or (obe + ota)

    return {
        "title": "Property Revenue - Online vs Offline and OTA vs OBE- 8th May '26",
        "unit": "lakhs",
        "actual_vs_target": {
            "label": "Actual vs Target",
            "bars": [
                channel_bar("May '26", 3),
                channel_bar("Target", 4),
            ],
        },
        "online_split": {
            "label": "OBE vs OTAs",
            "bars": [
                {
                    "month": "Online",
                    "obe": round(obe),
                    "otas": round(ota),
                    "total": round(online_total),
                    "obe_lakhs": round(obe / 100000, 1),
                    "otas_lakhs": round(ota / 100000, 1),
                    "total_lakhs": round(online_total / 100000, 1),
                    "obe_pct": round(obe / online_total * 100) if online_total else 0,
                    "otas_pct": round(ota / online_total * 100) if online_total else 0,
                }
            ],
        },
    }


def _read_may2026_managed_revenue(ws) -> tuple[dict, dict, dict]:
    """Revenue sheet layout from Weekly update - 08.05.2026 v1.xlsx (blocks 1–3, rows ≤ 31)."""

    def val(row: int, col: int) -> float:
        v = ws.cell(row, col).value
        f = safe_float(v)
        return f if f is not None else 0.0

    walk_a, walk_t = val(25, 3), val(25, 4)
    corp_a, corp_t = val(26, 3), val(26, 4)
    on_a, on_t = val(27, 3), val(27, 4)

    actual_online = walk_a + on_a
    target_online = walk_t + on_t
    actual_offline = corp_a
    target_offline = corp_t
    actual_total = val(28, 3) or (actual_online + actual_offline)
    target_total = val(28, 4) or (target_online + target_offline)

    achievement_pct = round(actual_total / target_total * 100) if target_total else 0
    achievement_online_pct = round(actual_online / target_online * 100) if target_online else 0
    achievement_offline_pct = round(actual_offline / target_offline * 100) if target_offline else 0

    section1 = {
        "label": "Target vs Actual (May'26)",
        "achievement_pct": achievement_pct,
        "achievement_online_pct": achievement_online_pct,
        "achievement_offline_pct": achievement_offline_pct,
        "bars": [
            {
                "name": "Target",
                "online": round(target_online),
                "offline": round(target_offline),
                "total": round(target_total),
                "online_pct": round(target_online / target_total * 100) if target_total else 0,
                "offline_pct": round(target_offline / target_total * 100) if target_total else 0,
            },
            {
                "name": "Actual",
                "online": round(actual_online),
                "offline": round(actual_offline),
                "total": round(actual_total),
                "online_pct": round(actual_online / actual_total * 100) if actual_total else 0,
                "offline_pct": round(actual_offline / actual_total * 100) if actual_total else 0,
            },
        ],
    }

    l25 = val(13, 3)
    s25 = val(14, 3)
    t25 = val(15, 3)
    l26 = val(13, 4)
    s26 = val(14, 4)
    t26 = val(15, 4)

    yoy_pct = round((t26 - t25) / t25 * 100) if t25 else 0
    yoy_short_stay_pct = round((s26 - s25) / s25 * 100) if s25 else 0
    yoy_long_stay_pct = round((l26 - l25) / l25 * 100) if l25 else 0

    section2 = {
        "label": "YoY Growth (May 2025 vs May 2026)",
        "yoy_pct": yoy_pct,
        "yoy_short_stay_pct": yoy_short_stay_pct,
        "yoy_long_stay_pct": yoy_long_stay_pct,
        "bars": [
            {
                "name": "May 2025",
                "short_stay": round(s25),
                "long_stay": round(l25),
                "total": round(t25),
                "short_stay_pct": round(s25 / t25 * 100) if t25 else 0,
                "long_stay_pct": round(l25 / t25 * 100) if t25 else 0,
            },
            {
                "name": "May 2026",
                "short_stay": round(s26),
                "long_stay": round(l26),
                "total": round(t26),
                "short_stay_pct": round(s26 / t26 * 100) if t26 else 0,
                "long_stay_pct": round(l26 / t26 * 100) if t26 else 0,
            },
        ],
    }

    section3 = {
        "label": "MoM Growth - Franchised properties",
        "mom_open_pct": 0.0,
        "mom_others_pct": 0.0,
        "mom_total_pct": 0.0,
        "bars": [],
    }
    return section1, section2, section3


def _read_revenue_sheet():
    if not os.path.isfile(EXCEL_PATH):
        raise FileNotFoundError(excel_workbook_missing_message())
    wb = shared_workbook()
    ws = wb["Revenue"]

    if _revenue_sheet_is_may2026_managed_block(ws):
        return _read_may2026_managed_revenue(ws)

    def val(row, col):
        v = ws.cell(row, col).value
        f = safe_float(v)
        return f if f is not None else 0.0

    def pct(row, col):
        """Read a % cell (stored as decimal in Excel, or as '45%' / text) and return as integer %."""
        v = ws.cell(row, col).value
        if v is None:
            return 0
        f = safe_float(v)
        if f is None:
            return 0
        if isinstance(v, str) and "%" in v:
            return round(f)
        return round(f * 100)

    # ── SECTION 1: Target vs Actual (managed — Online / Offline) ─────────────
    target_online = val(5, 3)
    target_offline = val(6, 3)
    target_total = val(8, 3)

    actual_online = val(5, 6)
    actual_offline = val(6, 6)
    actual_total = val(8, 6)

    achievement_pct = round(actual_total / target_total * 100) if target_total else 0
    achievement_online_pct = pct(5, 10)
    achievement_offline_pct = pct(6, 10)

    section1 = {
        "label": "Target vs Actual (April'26)",
        "achievement_pct": achievement_pct,
        "achievement_online_pct": achievement_online_pct,
        "achievement_offline_pct": achievement_offline_pct,
        "bars": [
            {
                "name": "Target",
                "online": round(target_online),
                "offline": round(target_offline),
                "total": round(target_total),
                "online_pct": round(target_online / target_total * 100) if target_total else 0,
                "offline_pct": round(target_offline / target_total * 100) if target_total else 0,
            },
            {
                "name": "Actual",
                "online": round(actual_online),
                "offline": round(actual_offline),
                "total": round(actual_total),
                "online_pct": round(actual_online / actual_total * 100) if actual_total else 0,
                "offline_pct": round(actual_offline / actual_total * 100) if actual_total else 0,
            },
        ],
    }

    # ── SECTION 2: YoY — Short stay / Long stay (cols C & F, totals row 17) ─
    s25 = val(14, 3)
    l25 = val(15, 3)
    t25 = val(17, 3)

    s26 = val(14, 6)
    l26 = val(15, 6)
    t26 = val(17, 6)

    yoy_pct = round((t26 - t25) / t25 * 100) if t25 else 0
    yoy_short_stay_pct = pct(14, 10)
    yoy_long_stay_pct = pct(15, 10)

    section2 = {
        "label": "YoY Growth (April 2025 vs April 2026)",
        "yoy_pct": yoy_pct,
        "yoy_short_stay_pct": yoy_short_stay_pct,
        "yoy_long_stay_pct": yoy_long_stay_pct,
        "bars": [
            {
                "name": "April 2025",
                "short_stay": round(s25),
                "long_stay": round(l25),
                "total": round(t25),
                "short_stay_pct": round(s25 / t25 * 100) if t25 else 0,
                "long_stay_pct": round(l25 / t25 * 100) if t25 else 0,
            },
            {
                "name": "April 2026",
                "short_stay": round(s26),
                "long_stay": round(l26),
                "total": round(t26),
                "short_stay_pct": round(s26 / t26 * 100) if t26 else 0,
                "long_stay_pct": round(l26 / t26 * 100) if t26 else 0,
            },
        ],
    }

    # ── SECTION 3: MoM franchised (Open vs others), month columns under sheet header ─
    # v2 layout: title ~R19 "MoM Growth - Franchised properties", month labels R21 (C,E,G),
    # Open R23, others R24, Total R26 — same column as each month label.
    # Do not rely on fixed rows alone: if EXCEL_PATH points at another workbook revision,
    # blind (23,3)/(23,5)/(23,7) reads pull unrelated cells. Anchor on the title row instead.

    def franchised_bar(
        name: str, o: float, ot: float, tot: float, contrib: float | None
    ) -> dict:
        t = float(tot) if tot and tot > 0 else float(o) + float(ot)
        if t <= 0:
            t = max(float(o) + float(ot), 1e-9)
        contrib_pct = None
        if contrib is not None and contrib >= 0:
            if contrib <= 1.0:
                contrib_pct = round(contrib * 100, 2)
            else:
                contrib_pct = round(contrib, 2)
        out = {
            "name": name,
            "fr_open": round(o, 2),
            "fr_others": round(ot, 2),
            "total": round(t, 2),
            "fr_open_pct": round(o / t * 100) if t else 0,
            "fr_others_pct": round(ot / t * 100) if t else 0,
        }
        if contrib_pct is not None:
            out["contribution_pct"] = contrib_pct
        return out

    def _find_franchised_title_row(ws) -> int | None:
        for r in range(1, 85):
            for c in range(1, 6):
                t = str(ws.cell(r, c).value or "").strip().lower()
                if "franchis" in t and "mom" in t:
                    return r
        return None

    def _scan_franchised_value_rows(ws, title_row: int) -> tuple[int, int | None, int | None, int | None]:
        """Locate Open / Others / Total / % of contribution rows by col-B label (v3 has no Others/Total; row 26 is contribution only)."""
        open_r: int | None = None
        others_r: int | None = None
        total_r: int | None = None
        contrib_r: int | None = None
        for r in range(title_row + 2, min(title_row + 16, 90)):
            lab = str(ws.cell(r, 2).value or "").strip().lower()
            if not lab:
                continue
            if "contribution" in lab:
                contrib_r = r
                continue
            if open_r is None and "open" in lab and "other" not in lab:
                open_r = r
                continue
            if others_r is None and "other" in lab:
                others_r = r
                continue
            if total_r is None and "total" in lab and "contribution" not in lab:
                total_r = r
                continue
        if open_r is None:
            return None, None, None, None
        return open_r, others_r, total_r, contrib_r

    def _read_franchised_bars(ws) -> list[dict]:
        """Read Feb / March / April from columns C,E,G (3,5,7). Totals follow a dedicated Total row when present; else Open+Others (v3 workbook has only Open + % of contribution)."""
        title_row = _find_franchised_title_row(ws)
        if title_row is not None:
            open_r, others_r, total_r, contrib_r = _scan_franchised_value_rows(ws, title_row)
            if open_r is None:
                return []
            open_label = str(ws.cell(open_r, 2).value or "").strip().lower()
            if "open" not in open_label:
                return []
        else:
            c21 = str(ws.cell(21, 3).value or "").strip().lower()
            if not c21.startswith("feb"):
                return []
            open_r, others_r, total_r, contrib_r = _scan_franchised_value_rows(ws, 19)
            if open_r is None:
                return []
            open_label = str(ws.cell(open_r, 2).value or "").strip().lower()
            if "open" not in open_label:
                return []

        # Canonical month columns (1-based): C, E, G — display names fixed for the chart.
        month_triple: list[tuple[int, str]] = [
            (3, "Feb"),
            (5, "March"),
            (7, "April"),
        ]

        bars: list[dict] = []
        for col, name in month_triple:
            o = val(open_r, col)
            ot = val(others_r, col) if others_r else 0.0
            sheet_tot = val(total_r, col) if total_r else 0.0
            tot = sheet_tot if sheet_tot > 0 else o + ot
            # Guard: never treat % of contribution decimals (e.g. 0.028) as rupee totals.
            if tot < 200 and max(o, ot) > 2000:
                tot = o + ot
            contrib = float(val(contrib_r, col)) if contrib_r else None
            if tot <= 0 and o <= 0 and ot <= 0:
                continue
            bars.append(franchised_bar(name, o, ot, tot, contrib))

        return bars

    bars_fr = _read_franchised_bars(ws)
    if len(bars_fr) >= 2:
        prev = bars_fr[-2]
        last = bars_fr[-1]
        po, lo = float(prev["fr_open"]), float(last["fr_open"])
        pto, lto = float(prev["fr_others"]), float(last["fr_others"])
        pt, lt = float(prev["total"]), float(last["total"])
        mom_open = round((lo - po) / po * 100, 1) if po else 0.0
        mom_others = round((lto - pto) / pto * 100, 1) if pto else 0.0
        mom_total = round((lt - pt) / pt * 100, 1) if pt else 0.0
    else:
        mom_open = mom_others = mom_total = 0.0

    section3 = {
        "label": "MoM Growth - Franchised properties",
        "mom_open_pct": mom_open,
        "mom_others_pct": mom_others,
        "mom_total_pct": mom_total,
        "bars": bars_fr,
    }

    return section1, section2, section3


def get_revenue_composition() -> dict:
    try:
        s1, s2, s3 = _read_revenue_sheet()
        trend = _read_property_revenue_trend()
        comparison = _read_property_revenue_comparison()
        online_offline = _read_online_offline_ota_obe()
    except Exception as e:
        return {"error": str(e)}

    return {
        "property_revenue_trend": trend,
        "property_revenue_comparison": comparison,
        "property_revenue_online_offline": online_offline,
        "section1": s1,
        "section2": s2,
        "section3": s3,
    }
