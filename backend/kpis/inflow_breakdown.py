from excel_parser import get_sheet_values, safe_float


def _ta_block_bounds(rows: list[list]) -> tuple[int | None, int | None]:
    start_i = end_i = None
    for i, row in enumerate(rows):
        if not row or len(row) < 2:
            continue
        a = str(row[1] or "").replace("\xa0", " ").strip()
        if start_i is None and "TA" in a.upper() and "FEE" in a.upper() and a.strip().startswith("1"):
            start_i = i + 1
            continue
        if start_i is not None and a.upper() == "TOTAL TA FEES":
            end_i = i
            break
    return start_i, end_i


def _ta_from_inflow(rows: list[list]) -> list[dict]:
    start_i, end_i = _ta_block_bounds(rows)
    if start_i is None:
        return []
    if end_i is None:
        end_i = len(rows)
    out: list[dict] = []
    brand = "Spark"
    for row in rows[start_i:end_i]:
        if not row or len(row) < 10:
            continue
        name = str(row[1] or "").replace("\xa0", " ").strip()
        if not name:
            continue
        ul = name.upper()
        if ul.startswith("A) "):
            brand = "Spark"
            continue
        if ul.startswith("B) "):
            brand = "Olive"
            continue
        if ul.startswith("C) "):
            brand = "Open"
            continue
        tgt = safe_float(row[2]) or 0
        w1 = safe_float(row[4]) or 0 if len(row) > 4 else 0
        w2 = safe_float(row[5]) or 0 if len(row) > 5 else 0
        w3 = safe_float(row[6]) or 0 if len(row) > 6 else 0
        w4 = safe_float(row[7]) or 0 if len(row) > 7 else 0
        w5 = safe_float(row[8]) or 0 if len(row) > 8 else 0
        received = safe_float(row[9]) if len(row) > 9 else None
        if received is None:
            received = w1 + w2 + w3 + w4 + w5
        expected = safe_float(row[10]) if len(row) > 10 else 0.0
        if tgt <= 0 and received <= 0 and (expected or 0) <= 0:
            continue
        out.append({
            "brand": brand,
            "property": name,
            "collected_outstanding": 0.0,
            "target": tgt,
            "w1": w1,
            "w2": w2,
            "w3": w3,
            "w4": w4,
            "w5": w5,
            "received": float(received or 0),
            "expected": float(expected or 0),
        })
    return out


def _ta_from_legacy_ta_fee_sheet(ta_rows: list[list]) -> list[dict]:
    ta_fees: list[dict] = []
    current_brand = "Unknown"
    for r in ta_rows[1:]:
        if not r or len(r) < 2:
            continue
        name_cell = str(r[1]).strip() if r[1] else ""
        if "SPARK" in name_cell.upper():
            current_brand = "Spark"
            continue
        if "OLIVE" in name_cell.upper():
            current_brand = "Olive"
            continue
        if len(r) > 46 and "Mock Property" in name_cell:
            collected_out = safe_float(r[40])
            target = safe_float(r[41])
            w1 = safe_float(r[42])
            w2 = safe_float(r[43])
            w3 = safe_float(r[44])
            w4 = safe_float(r[45])
            expected = safe_float(r[46])
            received = w1 + w2 + w3 + w4
            ta_fees.append({
                "brand": current_brand,
                "property": name_cell,
                "collected_outstanding": collected_out,
                "target": target,
                "w1": w1,
                "w2": w2,
                "w3": w3,
                "w4": w4,
                "w5": 0.0,
                "received": received,
                "expected": expected,
            })
    return ta_fees


def _mgmt_profit_from_inflow(rows: list[list]) -> tuple[list[dict], list[dict]]:
    mgmt: list[dict] = []
    profit: list[dict] = []
    for row in rows:
        if not row or len(row) < 10:
            continue
        label = str(row[1] or "").replace("\xa0", " ").strip()
        if not label:
            continue
        low = label.lower()
        if "management" in low and "fee" in low:
            tgt = safe_float(row[2]) or 0
            rec = safe_float(row[9]) if len(row) > 9 else 0
            exp = safe_float(row[10]) if len(row) > 10 else 0
            mgmt.append({
                "property": label,
                "aging_0_30": 0.0,
                "aging_30_60": 0.0,
                "aging_60_90": 0.0,
                "aging_90_120": 0.0,
                "target": tgt,
                "received": rec or 0,
                "expected": exp or 0,
            })
        if "profit" in low and "incentive" in low:
            tgt = safe_float(row[2]) or 0
            rec = safe_float(row[9]) if len(row) > 9 else 0
            exp = safe_float(row[10]) if len(row) > 10 else 0
            profit.append({
                "party": label,
                "aging_0_30": 0.0,
                "aging_30_60": 0.0,
                "aging_60_90": 0.0,
                "aging_90_120": 0.0,
                "target": tgt,
                "received": rec or 0,
                "expected": exp or 0,
            })
    return mgmt, profit


def get_inflow_breakdown():
    rows_in = get_sheet_values("Inflow") or []
    ta_fees = _ta_from_inflow(rows_in)

    if not ta_fees:
        ta_rows = get_sheet_values("TA Fee")
        if ta_rows:
            ta_fees = _ta_from_legacy_ta_fee_sheet(ta_rows)

    mgmt_fees: list[dict] = []
    mgmt_rows = get_sheet_values("Mgmt Fee")
    if mgmt_rows:
        for r in mgmt_rows[1:]:
            if not r or len(r) < 8:
                continue
            mgmt_fees.append({
                "property": str(r[0]),
                "aging_0_30": safe_float(r[1]),
                "aging_30_60": safe_float(r[2]),
                "aging_60_90": safe_float(r[3]),
                "aging_90_120": safe_float(r[4]),
                "target": safe_float(r[5]),
                "received": safe_float(r[6]),
                "expected": safe_float(r[7])
            })

    profit_incentives: list[dict] = []
    pi_rows = get_sheet_values("Profit Incentive")
    if pi_rows:
        for r in pi_rows[1:]:
            if not r or len(r) < 32:
                continue
            party = str(r[0]) if r[0] else "Unknown Party"
            if not r[25] and not r[26] and not r[27] and not r[28] and not r[29] and not r[30] and not r[31]:
                continue
            profit_incentives.append({
                "party": party,
                "aging_0_30": safe_float(r[25]),
                "aging_30_60": safe_float(r[26]),
                "aging_60_90": safe_float(r[27]),
                "aging_90_120": safe_float(r[28]),
                "target": safe_float(r[29]),
                "received": safe_float(r[30]),
                "expected": safe_float(r[31])
            })

    if not mgmt_fees and rows_in:
        m, p = _mgmt_profit_from_inflow(rows_in)
        mgmt_fees = m
        if not profit_incentives:
            profit_incentives = p

    return {
        "ta_fees": ta_fees,
        "mgmt_fees": mgmt_fees,
        "profit_incentive": profit_incentives
    }
