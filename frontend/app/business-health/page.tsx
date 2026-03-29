"use client";
import { useEffect, useState, useCallback } from "react";
import KPICard from "../components/KPICard";
import InsightStrip from "../components/InsightStrip";
import { fetchKPI, formatCurrency, formatPct, pctColor } from "../../lib/api";

const REFRESH = 60000;

const RISK_GAUGE_COLORS = ["#16a34a", "#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444", "#dc2626"];

function RiskGauge({ score }: { score: number }) {
  const color = score < 20 ? "#16a34a" : score < 40 ? "#84cc16" : score < 60 ? "#eab308" : score < 80 ? "#f97316" : "#dc2626";
  const angle = -135 + (score / 100) * 270;

  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <svg viewBox="0 0 200 120" width="200" height="120" style={{ overflow: "visible" }}>
        {/* Background arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
        {/* Colored arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 251.3} 251.3`} />
        {/* Center text */}
        <text x="100" y="95" textAnchor="middle" fontSize="28" fontWeight="800" fill={color}>{score}</text>
        <text x="100" y="115" textAnchor="middle" fontSize="11" fill="#94a3b8">Risk Score</text>
      </svg>
    </div>
  );
}

export default function BusinessHealthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setData(await fetchKPI("business-health")); setLoading(false); }, []);
  useEffect(() => { load(); const t = setInterval(load, REFRESH); return () => clearInterval(t); }, [load]);

  if (loading) return <div style={{ padding: "32px", color: "#64748b" }}>Loading…</div>;
  if (!data) return <div style={{ padding: "32px" }}>⚠️ API Error</div>;

  const { summary, risk_score, risk_level, funnel, risk_factors, recommendations, all_insights, efficiency_score } = data;

  const riskBg = risk_score < 30 ? "#f0fdf4" : risk_score < 60 ? "#fffbeb" : "#fef2f2";
  const riskBorder = risk_score < 30 ? "#bbf7d0" : risk_score < 60 ? "#fde68a" : "#fecaca";
  const riskColor = risk_score < 30 ? "#16a34a" : risk_score < 60 ? "#d97706" : "#dc2626";

  return (
    <div style={{ padding: "32px", maxWidth: "1400px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: 0 }}>🟣 Business Health — Decision Engine</h1>
        <p style={{ color: "#64748b", marginTop: "4px", fontSize: "14px" }}>Integrated view of all KPIs, risk scoring, and recommendations</p>
      </div>

      {/* Top Score Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" }}>
        <KPICard title="Risk Score" value={`${risk_score}/100`} subtitle={risk_level?.toUpperCase()} color={risk_score < 30 ? "green" : risk_score < 60 ? "amber" : "red"} icon="🎯" size="lg" />
        <KPICard title="Efficiency Score" value={`${efficiency_score}/100`} color={efficiency_score >= 70 ? "green" : efficiency_score >= 50 ? "amber" : "red"} icon="⚡" size="lg" />
        <KPICard title="Signing Conv." value={formatPct(summary?.signing_conv_pct ?? 0)} color={(summary?.signing_conv_pct ?? 0) >= 80 ? "green" : "red"} icon="✍️" size="lg" />
        <KPICard title="Collection Rate" value={formatPct(summary?.collection_pct ?? 0)} color={(summary?.collection_pct ?? 0) >= 70 ? "green" : "red"} icon="💰" size="lg" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "20px", marginBottom: "20px" }}>
        {/* Risk Gauge */}
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: `2px solid ${riskBorder}`, background: riskBg }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Overall Risk Assessment</h3>
          <RiskGauge score={risk_score} />
          <div style={{ marginTop: "8px" }}>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{ display: "inline-block", padding: "4px 20px", borderRadius: "20px", fontSize: "13px", fontWeight: 800, background: "white", color: riskColor, border: `2px solid ${riskBorder}` }}>
                {risk_level?.toUpperCase() ?? "—"}
              </span>
            </div>
            {risk_factors?.slice(0, 4).map((rf: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.6)" }}>
                <span style={{ fontSize: "12px" }}>{rf.severity === "critical" ? "🔴" : "🟡"}</span>
                <span style={{ fontSize: "12px", color: "#374151", flex: 1 }}>{rf.factor}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: rf.severity === "critical" ? "#dc2626" : "#d97706" }}>-{rf.score}pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Business Funnel */}
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: "13px", fontWeight: 700 }}>Business Conversion Funnel</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {funnel?.map((stage: any, i: number) => {
              const maxVal = funnel[0]?.value || 1;
              const width = Math.max(20, (stage.value / maxVal) * 100);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "140px", fontSize: "12px", color: "#64748b", fontWeight: 600, flexShrink: 0 }}>{stage.stage}</div>
                  <div style={{ flex: 1, background: "#f8fafc", borderRadius: "6px", height: "32px", position: "relative", overflow: "hidden" }}>
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      width: `${width}%`, background: stage.color,
                      borderRadius: "6px", opacity: 0.85,
                      display: "flex", alignItems: "center", paddingLeft: "12px",
                      transition: "width 0.8s ease",
                    }}>
                      <span style={{ color: "white", fontSize: "12px", fontWeight: 700 }}>{stage.value}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* KPI Summary Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "24px" }}>
            <div style={{ textAlign: "center", padding: "12px", background: "#f8fafc", borderRadius: "10px" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#4f46e5" }}>{formatCurrency(summary?.revenue_total ?? 0, true)}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Total Revenue</div>
            </div>
            <div style={{ textAlign: "center", padding: "12px", background: "#f8fafc", borderRadius: "10px" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: (summary?.cash_balance ?? 0) > 0 ? "#16a34a" : "#dc2626" }}>{formatCurrency(summary?.cash_balance ?? 0, true)}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cash Balance</div>
            </div>
            <div style={{ textAlign: "center", padding: "12px", background: "#f8fafc", borderRadius: "10px" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: pctColor(summary?.team_pct ?? 0) }}>{formatPct(summary?.team_pct ?? 0)}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>BD Team Perf.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations?.length > 0 && (
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>🚀 Recommended Actions</h3>
          <InsightStrip insights={[]} recommendations={recommendations} />
        </div>
      )}

      {/* All Insights */}
      {all_insights?.length > 0 && (
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>💡 All System Insights</h3>
          <InsightStrip insights={all_insights.slice(0, 8)} />
        </div>
      )}
    </div>
  );
}
