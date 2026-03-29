"""
KPI 8: Business Health — Integrated decision engine
Synthesizes all 8 KPIs into funnel, risk score, and auto-generated insights
"""
from kpis.signings import get_signings
from kpis.openings import get_openings
from kpis.sales import get_sales
from kpis.cashflow import get_cashflow
from kpis.inflow_detail import get_inflow_detail
from kpis.outflow import get_outflow
from kpis.bd_performance import get_bd_performance


def get_business_health() -> dict:
    signings = get_signings()
    openings = get_openings()
    sales = get_sales()
    cashflow = get_cashflow()
    inflow = get_inflow_detail()
    outflow = get_outflow()
    bd = get_bd_performance()

    # --- Funnel Conversion ---
    deals_signed = signings.get("grand_achieved", 0)
    deals_targeted = signings.get("grand_target", 1)
    keys_opened = openings.get("total_achieved", 0)
    keys_targeted = openings.get("total_target", 1)
    revenue = sales.get("grand_total", 0)

    signing_conv = round(deals_signed / deals_targeted * 100, 1) if deals_targeted else 0
    opening_conv = round(keys_opened / deals_signed * 100, 1) if deals_signed else 0

    funnel = [
        {"stage": "Target Signings", "value": deals_targeted, "color": "#6366f1"},
        {"stage": "Actual Signings", "value": deals_signed, "color": "#8b5cf6"},
        {"stage": "Target Openings", "value": keys_targeted, "color": "#3b82f6"},
        {"stage": "Actual Openings", "value": keys_opened, "color": "#22c55e"},
    ]

    # --- Risk Score (0-100, higher = more risk) ---
    risk_factors = []
    risk_score = 0

    # Signing performance
    if signing_conv < 60:
        risk_score += 30
        risk_factors.append({"factor": "Signings critically below target", "severity": "critical", "score": 30})
    elif signing_conv < 80:
        risk_score += 15
        risk_factors.append({"factor": "Signings below target", "severity": "warning", "score": 15})

    # Opening execution
    if opening_conv < 50:
        risk_score += 20
        risk_factors.append({"factor": "Property openings lagging", "severity": "warning", "score": 20})

    # Cashflow
    cf_summary = cashflow.get("summary", {})
    net_pos = cf_summary.get("net_position", 0)
    if net_pos < 0:
        risk_score += 30
        risk_factors.append({"factor": "Negative cash position", "severity": "critical", "score": 30})
    elif net_pos < 5000000:
        risk_score += 15
        risk_factors.append({"factor": "Low cash buffer (<50L)", "severity": "warning", "score": 15})

    # Collections
    inflow_summary = inflow.get("summary", {})
    coll_pct = inflow_summary.get("collection_pct", 100)
    if coll_pct < 50:
        risk_score += 20
        risk_factors.append({"factor": "Collection rate critically low", "severity": "critical", "score": 20})

    # BD team
    if bd.get("team_pct", 100) < 60:
        risk_score += 15
        risk_factors.append({"factor": "BD team underperforming", "severity": "warning", "score": 15})

    risk_score = min(100, risk_score)
    risk_level = "critical" if risk_score >= 60 else ("warning" if risk_score >= 30 else "healthy")

    # --- Efficiency Score ---
    efficiency = round(100 - risk_score * 0.8)
    efficiency = max(0, min(100, efficiency))

    # --- Recommendations ---
    recommendations = []
    if bd.get("underperformers"):
        recommendations.append({
            "action": f"Coach underperforming BDs: {', '.join(bd['underperformers'][:2])}",
            "priority": "high",
            "impact": "Signing target recovery"
        })
    if coll_pct < 70:
        recommendations.append({
            "action": "Escalate TA Fee collections — high outstanding detected",
            "priority": "critical",
            "impact": "Cashflow improvement"
        })
    if net_pos < 0:
        recommendations.append({
            "action": "Delay non-critical payments to stabilize cash",
            "priority": "critical",
            "impact": "Liquidity protection"
        })
    if opening_conv < 70:
        recommendations.append({
            "action": "Review property readiness — opening delays detected",
            "priority": "medium",
            "impact": "Inventory activation"
        })

    # --- All Insights ---
    all_insights = (
        signings.get("insights", []) +
        openings.get("insights", []) +
        sales.get("insights", []) +
        cashflow.get("insights", []) +
        inflow.get("insights", []) +
        outflow.get("insights", []) +
        bd.get("insights", [])
    )

    return {
        "funnel": funnel,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "efficiency_score": efficiency,
        "risk_factors": risk_factors,
        "recommendations": recommendations,
        "all_insights": all_insights,
        "summary": {
            "signing_conv_pct": signing_conv,
            "opening_conv_pct": opening_conv,
            "revenue_total": revenue,
            "cash_balance": cf_summary.get("bank_balance", 0),
            "collection_pct": coll_pct,
            "team_pct": bd.get("team_pct", 0)
        }
    }
