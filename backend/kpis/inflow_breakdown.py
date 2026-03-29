from excel_parser import get_sheet_values, safe_float

def get_inflow_breakdown():
    # 1. TA FEES
    ta_rows = get_sheet_values("TA Fee")
    ta_fees = []
    
    current_brand = "Unknown"
    for r in ta_rows[1:]:  # skip header row 0 just in case
        if not r or len(r) < 2: continue
        
        name_cell = str(r[1]).strip() if r[1] else ""
        
        if "SPARK" in name_cell.upper():
            current_brand = "Spark"
            continue
        if "OLIVE" in name_cell.upper():
            current_brand = "Olive"
            continue
            
        # Check for KPI7 columns at index 40-46
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
                "received": received,
                "expected": expected
            })

    # 2. MGMT FEES
    mgmt_rows = get_sheet_values("Mgmt Fee")
    mgmt_fees = []
    if mgmt_rows:
        for r in mgmt_rows[1:]: # skip header row
            if not r or len(r) < 8: continue
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

    # 3. PROFIT INCENTIVE
    pi_rows = get_sheet_values("Profit Incentive")
    profit_incentives = []
    for r in pi_rows[1:]:
        if not r or len(r) < 32: continue
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

    return {
        "ta_fees": ta_fees,
        "mgmt_fees": mgmt_fees,
        "profit_incentive": profit_incentives
    }
