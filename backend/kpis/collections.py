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
        if r_idx >= len(rows):
            return None
        row = rows[r_idx]
        name = row[1]
        if not name:
            return None

        target = safe_int(row[2])
        w1 = safe_int(row[4])
        w2 = safe_int(row[5])
        w3 = safe_int(row[6])
        w4 = safe_int(row[7])
        received = (w1 or 0) + (w2 or 0) + (w3 or 0) + (w4 or 0)
        expected = safe_int(row[8])
        total = received + (expected or 0)

        return {
            "name": name,
            "target": target,
            "w1": w1,
            "w2": w2,
            "w3": w3,
            "w4": w4,
            "received": received,
            "expected": expected,
            "total": total,
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
            "target": sum(p["target"] for p in props if p["target"]),
            "w1": sum(p["w1"] for p in props if p["w1"]),
            "w2": sum(p["w2"] for p in props if p["w2"]),
            "w3": sum(p["w3"] for p in props if p["w3"]),
            "w4": sum(p["w4"] for p in props if p["w4"]),
            "received": sum(p["received"] for p in props if p["received"]),
            "expected": sum(p["expected"] for p in props if p["expected"]),
            "total": sum(p["total"] for p in props if p["total"]),
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
                "received": 0,
                "expected": None,
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
                "received": tf["received"],
                "expected": tf["expected"],
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
                        "received": os_["received"],
                        "expected": os_["expected"],
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
                "received": mf["received"],
                "expected": mf["expected"],
                "total": mgmt_total,
            },
            {
                "name": "Profit Incentive",
                "target": pi["target"],
                "w1": pi["w1"],
                "w2": pi["w2"],
                "w3": pi["w3"],
                "w4": pi["w4"],
                "received": pi["received"],
                "expected": pi["expected"],
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
            "received": tif["received"],
            "expected": tif["expected"],
            "total": total_inflow,
        },
    }
