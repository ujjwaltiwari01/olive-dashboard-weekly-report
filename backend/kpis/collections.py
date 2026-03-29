from excel_parser import get_sheet_values, safe_int

def get_collections() -> dict:
    rows = get_sheet_values("Inflow")
    if not rows:
        return {"error": "Inflow sheet not found or empty"}

    def parse_property_row(r_idx):
        if r_idx >= len(rows): return None
        row = rows[r_idx]
        name = row[1]
        if not name: return None

        target   = safe_int(row[2])
        received = safe_int(row[4])
        expected = safe_int(row[5])
        total    = (received or 0) + (expected or 0)

        return {
            "name": name,
            "target": target,
            "received": received,
            "expected": expected,
            "total": total
        }

    # 1. TA FEES
    # a) Spark (Rows 10-19 -> idx 9-18)
    spark_props = []
    for i in range(9, 20):
        p = parse_property_row(i)
        if p and p["name"] and "b)" not in str(p["name"]):
            spark_props.append(p)

    # b) Olive (Rows 21-27 -> idx 20-26)
    olive_props = []
    for i in range(20, 27):
        p = parse_property_row(i)
        if p and p["name"] and "c)" not in str(p["name"]) and "Total" not in str(p["name"]):
            olive_props.append(p)

    # c) Open set-up (Row 28 -> idx 27)
    open_setup = parse_property_row(27)

    # Total TA Fees (Row 30 -> idx 29)
    ta_fees_total_row = parse_property_row(29)
    ta_fees_total = ta_fees_total_row["total"] if ta_fees_total_row else 0

    # 2. Management Fees (Row 33 -> idx 32)
    mgmt_fees = parse_property_row(32)
    mgmt_total = mgmt_fees["total"] if mgmt_fees else 0

    # 3. Profit Incentive (Row 35 -> idx 34)
    profit_incentive = parse_property_row(34)
    profit_total = profit_incentive["total"] if profit_incentive else 0

    # Final Total Inflow (Row 39 -> idx 38)
    total_inflow_row = parse_property_row(38)
    total_inflow = total_inflow_row["total"] if total_inflow_row else 0

    # ── SUB-TOTAL CALCULATIONS ───────────────────────────────────────
    def get_subtotal(props, name):
        return {
            "name": name,
            "target":   sum(p["target"]   for p in props if p["target"]),
            "received": sum(p["received"] for p in props if p["received"]),
            "expected": sum(p["expected"] for p in props if p["expected"]),
            "total":    sum(p["total"]    for p in props if p["total"])
        }

    subtotal_spark = get_subtotal(spark_props, "Subtotal Spark")
    subtotal_olive = get_subtotal(olive_props, "Subtotal Olive")

    return {
        "title": "Collections — March",
        "subtitle": "Collections breakdown by revenue stream",
        "sections": [
            {
                "name": "TA Fees",
                "target":   ta_fees_total_row["target"],
                "received": ta_fees_total_row["received"],
                "expected": ta_fees_total_row["expected"],
                "total":    ta_fees_total,
                "subsections": [
                    {
                        "name": "Spark",
                        "properties": spark_props,
                        "subtotal": subtotal_spark
                    },
                    {
                        "name": "Olive",
                        "properties": olive_props,
                        "subtotal": subtotal_olive
                    },
                    {
                        "name": "Open set-up fees",
                        "target":   open_setup["target"],
                        "received": open_setup["received"],
                        "expected": open_setup["expected"],
                        "total":    open_setup["total"]
                    }
                ]
            },
            {
                "name": "Management Fees",
                "target":   mgmt_fees["target"],
                "received": mgmt_fees["received"],
                "expected": mgmt_fees["expected"],
                "total":    mgmt_total
            },
            {
                "name": "Profit Incentive",
                "target":   profit_incentive["target"],
                "received": profit_incentive["received"],
                "expected": profit_incentive["expected"],
                "total":    profit_total
            }
        ],
        "total_inflow": {
            "name":     "Total Inflow",
            "target":   total_inflow_row["target"],
            "received": total_inflow_row["received"],
            "expected": total_inflow_row["expected"],
            "total":    total_inflow
        }
    }
