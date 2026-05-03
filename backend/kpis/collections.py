import re
from excel_parser import (
    excel_file_available,
    excel_workbook_missing_message,
    get_sheet_values,
    safe_int,
)


def _cell_b(rows, ri: int) -> str | None:
    if ri >= len(rows):
        return None
    r = rows[ri]
    if len(r) < 2 or r[1] is None:
        return None
    s = str(r[1]).strip()
    return s if s else None


def _find_row_b(rows, pred, start: int = 0) -> int | None:
    for i in range(start, len(rows)):
        b = _cell_b(rows, i)
        if b is None:
            continue
        if pred(b):
            return i
    return None


def get_collections() -> dict:
    if not excel_file_available():
        return {"error": excel_workbook_missing_message()}
    rows = get_sheet_values("Inflow")
    if not rows:
        return {"error": "Inflow sheet not found or empty"}

    def parse_property_row(r_idx):
        """Inflow sheet: B name, C target, E–I = W1–W5, J = Total received, K = To be collected (0-based indices)."""
        if r_idx >= len(rows):
            return None
        row = rows[r_idx]
        name = row[1]
        if not name:
            return None

        target = safe_int(row[2])
        w1 = safe_int(row[4]) if len(row) > 4 else 0
        w2 = safe_int(row[5]) if len(row) > 5 else 0
        w3 = safe_int(row[6]) if len(row) > 6 else 0
        w4 = safe_int(row[7]) if len(row) > 7 else 0
        w5 = safe_int(row[8]) if len(row) > 8 else 0
        weekly_sum = (w1 or 0) + (w2 or 0) + (w3 or 0) + (w4 or 0) + (w5 or 0)
        j_total = safe_int(row[9]) if len(row) > 9 else None
        received_total = j_total if j_total is not None else weekly_sum
        if (received_total or 0) == 0 and weekly_sum:
            received_total = weekly_sum
        to_be_collected = safe_int(row[10]) if len(row) > 10 else 0

        return {
            "name": name,
            "target": target,
            "w1": w1,
            "w2": w2,
            "w3": w3,
            "w4": w4,
            "w5": w5,
            "received_total": received_total,
            "to_be_collected": to_be_collected,
            "total": received_total,
        }

    # ── TA Fees: scan by section headers (col B) — positions move between workbook versions ──
    spark_props: list = []
    i_spark = _find_row_b(rows, lambda b: re.search(r"a\)\s*spark", b, re.I) is not None)
    if i_spark is not None:
        i = i_spark + 1
        while i < len(rows):
            b = _cell_b(rows, i)
            if b and re.search(r"b\)\s*olive", b, re.I):
                break
            if b and re.search(r"a\)\s*spark", b, re.I):
                i += 1
                continue
            p = parse_property_row(i)
            if p and p.get("name"):
                spark_props.append(p)
            i += 1

    olive_props: list = []
    i_olive = _find_row_b(rows, lambda b: re.search(r"b\)\s*olive", b, re.I) is not None)
    if i_olive is not None:
        i = i_olive + 1
        while i < len(rows):
            b = _cell_b(rows, i)
            if b and re.search(r"c\)\s*open", b, re.I):
                break
            if b and re.search(r"b\)\s*olive", b, re.I):
                i += 1
                continue
            if b and "total ta" in b.lower():
                break
            p = parse_property_row(i)
            if p and p.get("name") and "total" not in str(p["name"]).lower():
                olive_props.append(p)
            i += 1

    i_open = _find_row_b(rows, lambda b: re.search(r"c\)\s*open", b, re.I) is not None)
    open_setup = parse_property_row(i_open) if i_open is not None else None

    i_ta_tot = _find_row_b(rows, lambda b: b.lower().startswith("total ta"))
    ta_fees_total_row = parse_property_row(i_ta_tot) if i_ta_tot is not None else None
    ta_fees_total = ta_fees_total_row["total"] if ta_fees_total_row else 0

    i_mgmt = _find_row_b(
        rows, lambda b: "management" in b.lower() and "fee" in b.lower()
    )
    mgmt_fees = parse_property_row(i_mgmt) if i_mgmt is not None else None
    mgmt_total = mgmt_fees["total"] if mgmt_fees else 0

    i_pi = _find_row_b(
        rows, lambda b: "profit" in b.lower() and "incentive" in b.lower()
    )
    profit_incentive = parse_property_row(i_pi) if i_pi is not None else None
    profit_total = profit_incentive["total"] if profit_incentive else 0

    i_tif = _find_row_b(
        rows,
        lambda b: re.match(r"^total\s+inflow\s*$", b.lower()) is not None,
    )
    total_inflow_row = parse_property_row(i_tif) if i_tif is not None else None
    total_inflow = total_inflow_row["total"] if total_inflow_row else 0

    # ── SUB-TOTAL CALCULATIONS ───────────────────────────────────────
    def get_subtotal(props, name):
        return {
            "name": name,
            "target": sum((p["target"] or 0) for p in props),
            "w1": sum((p["w1"] or 0) for p in props),
            "w2": sum((p["w2"] or 0) for p in props),
            "w3": sum((p["w3"] or 0) for p in props),
            "w4": sum((p["w4"] or 0) for p in props),
            "w5": sum((p["w5"] or 0) for p in props),
            "received_total": sum((p["received_total"] or 0) for p in props),
            "to_be_collected": sum((p["to_be_collected"] or 0) for p in props),
            "total": sum((p["total"] or 0) for p in props),
        }

    subtotal_spark = get_subtotal(spark_props, "Subtotal Spark")
    subtotal_olive = get_subtotal(olive_props, "Subtotal Olive")

    def row_fields(r):
        if not r:
            return {
                "target": None,
                "w1": None,
                "w2": None,
                "w3": None,
                "w4": None,
                "w5": None,
                "received_total": 0,
                "to_be_collected": None,
                "total": 0,
            }
        return r

    tf = row_fields(ta_fees_total_row)
    mf = row_fields(mgmt_fees)
    pi = row_fields(profit_incentive)
    tif = row_fields(total_inflow_row)
    os_ = row_fields(open_setup)

    return {
        "title": "Collections — April'26",
        "subtitle": "Collections breakdown by revenue stream",
        "sections": [
            {
                "name": "TA Fees",
                "target": tf["target"],
                "w1": tf["w1"],
                "w2": tf["w2"],
                "w3": tf["w3"],
                "w4": tf["w4"],
                "w5": tf["w5"],
                "received_total": tf["received_total"],
                "to_be_collected": tf["to_be_collected"],
                "total": ta_fees_total,
                "subsections": [
                    {
                        "name": "Spark",
                        "properties": spark_props,
                        "subtotal": subtotal_spark,
                    },
                    {
                        "name": "Olive",
                        "properties": olive_props,
                        "subtotal": subtotal_olive,
                    },
                    {
                        "name": "Open set-up fees",
                        "target": os_["target"],
                        "w1": os_["w1"],
                        "w2": os_["w2"],
                        "w3": os_["w3"],
                        "w4": os_["w4"],
                        "w5": os_["w5"],
                        "received_total": os_["received_total"],
                        "to_be_collected": os_["to_be_collected"],
                        "total": os_["total"],
                    },
                ],
            },
            {
                "name": "Management Fees",
                "target": mf["target"],
                "w1": mf["w1"],
                "w2": mf["w2"],
                "w3": mf["w3"],
                "w4": mf["w4"],
                "w5": mf["w5"],
                "received_total": mf["received_total"],
                "to_be_collected": mf["to_be_collected"],
                "total": mgmt_total,
            },
            {
                "name": "Profit Incentive",
                "target": pi["target"],
                "w1": pi["w1"],
                "w2": pi["w2"],
                "w3": pi["w3"],
                "w4": pi["w4"],
                "w5": pi["w5"],
                "received_total": pi["received_total"],
                "to_be_collected": pi["to_be_collected"],
                "total": profit_total,
            },
        ],
        "total_inflow": {
            "name": "Total Inflow",
            "target": tif["target"],
            "w1": tif["w1"],
            "w2": tif["w2"],
            "w3": tif["w3"],
            "w4": tif["w4"],
            "w5": tif["w5"],
            "received_total": tif["received_total"],
            "to_be_collected": tif["to_be_collected"],
            "total": total_inflow,
        },
    }
