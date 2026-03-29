"""
KPI 3: BD Performance — BD productivity leaderboard
Derived from the Signings sheet
"""
from kpis.signings import get_signings


def get_bd_performance() -> dict:
    signings = get_signings()
    bds = signings.get("bds", [])

    # Sort by achievement %
    leaderboard = sorted(bds, key=lambda x: x["achievement_pct"], reverse=True)

    # Add rank
    for idx, bd in enumerate(leaderboard):
        bd["rank"] = idx + 1

    # Category classification
    for bd in leaderboard:
        pct = bd["achievement_pct"]
        if pct >= 100:
            bd["status"] = "star"
        elif pct >= 75:
            bd["status"] = "good"
        elif pct >= 50:
            bd["status"] = "warning"
        else:
            bd["status"] = "critical"

    # Overall BD team metrics
    total_target = sum(b["total_target"] for b in bds)
    total_achieved = sum(b["total_achieved"] for b in bds)
    team_pct = round(total_achieved / total_target * 100, 1) if total_target else 0

    top_performers = [b["name"] for b in leaderboard if b["status"] in ("star", "good")]
    underperformers = [b["name"] for b in leaderboard if b["status"] in ("warning", "critical")]

    insights = []
    if top_performers:
        insights.append(f"Top performers: {', '.join(top_performers[:2])}")
    if underperformers:
        insights.append(f"Needs support: {', '.join(underperformers[:2])}")

    return {
        "leaderboard": leaderboard,
        "total_bds": len(bds),
        "team_target": total_target,
        "team_achieved": total_achieved,
        "team_pct": team_pct,
        "top_performers": top_performers,
        "underperformers": underperformers,
        "insights": insights
    }
