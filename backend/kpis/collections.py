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
        w1       = safe_int(row[4])
        w2       = safe_int(row[5])
        w3       = safe_int(row[6])
        w4       = safe_int(row[7])
        received = (w1 or 0) + (w2 or 0) + (w3 or 0) + (w4 or 0)
        expected = safe_int(row[8])
        total    = received + (expected or 0)

        return {
            "name":     name,
            "target":   target,
            "w1":       w1,
            "w2":       w2,
            "w3":       w3,
            "w4":       w4,
            "received": received,
            "expected": expected,
            "total":    total,
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
            "name":     name,
            "target":   sum(p["target"]   for p in props if p["target"]),
            "w1":       sum(p["w1"]       for p in props if p["w1"]),
            "w2":       sum(p["w2"]       for p in props if p["w2"]),
            "w3":       sum(p["w3"]       for p in props if p["w3"]),
            "w4":       sum(p["w4"]       for p in props if p["w4"]),
            "received": sum(p["received"] for p in props if p["received"]),
            "expected": sum(p["expected"] for p in props if p["expected"]),
            "total":    sum(p["total"]    for p in props if p["total"]),
        }

    subtotal_spark = get_subtotal(spark_props, "Subtotal Spark")
    subtotal_olive = get_subtotal(olive_props, "Subtotal Olive")

    def row_fields(r):
        """Extract all fields from a parsed row dict safely."""
        if not r:
            return {"target": None, "w1": None, "w2": None, "w3": None, "w4": None, "received": 0, "expected": None, "total": 0}
        return r

    tf  = row_fields(ta_fees_total_row)
    mf  = row_fields(mgmt_fees)
    pi  = row_fields(profit_incentive)
    tif = row_fields(total_inflow_row)
    os_ = row_fields(open_setup)

    return {
        "title":    "Collections — April'26",
        "subtitle": "Collections breakdown by revenue stream",
        "sections": [
            {
                "name":     "TA Fees",
                "target":   tf["target"],
                "w1":       tf["w1"],
                "w2":       tf["w2"],
                "w3":       tf["w3"],
                "w4":       tf["w4"],
                "received": tf["received"],
                "expected": tf["expected"],
                "total":    ta_fees_total,
                "subsections": [
                    {
                        "name":       "Spark",
                        "properties": spark_props,
                        "subtotal":   subtotal_spark,
                    },
                    {
                        "name":       "Olive",
                        "properties": olive_props,
                        "subtotal":   subtotal_olive,
                    },
                    {
                        "name":     "Open set-up fees",
                        "target":   os_["target"],
                        "w1":       os_["w1"],
                        "w2":       os_["w2"],
                        "w3":       os_["w3"],
                        "w4":       os_["w4"],
                        "received": os_["received"],
                        "expected": os_["expected"],
                        "total":    os_["total"],
                    },
                ],
            },
            {
                "name":     "Management Fees",
                "target":   mf["target"],
                "w1":       mf["w1"],
                "w2":       mf["w2"],
                "w3":       mf["w3"],
                "w4":       mf["w4"],
                "received": mf["received"],
                "expected": mf["expected"],
                "total":    mgmt_total,
            },
            {
                "name":     "Profit Incentive",
                "target":   pi["target"],
                "w1":       pi["w1"],
                "w2":       pi["w2"],
                "w3":       pi["w3"],
                "w4":       pi["w4"],
                "received": pi["received"],
                "expected": pi["expected"],
                "total":    profit_total,
            },
        ],
        "total_inflow": {
            "name":     "Total Inflow",
            "target":   tif["target"],
            "w1":       tif["w1"],
            "w2":       tif["w2"],
            "w3":       tif["w3"],
            "w4":       tif["w4"],
            "received": tif["received"],
            "expected": tif["expected"],
            "total":    total_inflow,
        },
    }
