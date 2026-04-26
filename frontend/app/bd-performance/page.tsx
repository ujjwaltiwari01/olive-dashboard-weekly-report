"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import KPICard from "../components/KPICard";
import InsightStrip from "../components/InsightStrip";
import { fetchKPI, formatPct, pctColor } from "../../lib/api";

const REFRESH = 60000;
const STATUS_COLORS: Record<string, string> = { star: "#16a34a", good: "#2563eb", warning: "#d97706", critical: "#dc2626" };

export default function BDPerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setData(await fetchKPI("bd-performance")); setLoading(false); }, []);
  useEffect(() => { load(); const t = setInterval(load, REFRESH); return () => clearInterval(t); }, [load]);

  if (loading) return <div style={{ padding: "32px", color: "#64748b" }}>Loading…</div>;
  if (!data || data.error) return <div style={{ padding: "32px" }}>⚠️ API Error{data?.error ? ` — ${data.error}` : ""}</div>;

  const barData = data.leaderboard?.map((bd: any) => ({
    name: bd.name.split(" ")[0],
    Target: bd.total_target,
    Achieved: bd.total_achieved,
    "Ach%": bd.achievement_pct,
  })) ?? [];

  const pieData = data.leaderboard?.map((bd: any) => ({
    name: bd.name.split(" ")[0],
    value: bd.total_achieved,
  })) ?? [];

  const PIE_COLORS = ["#4f46e5", "#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];

  return (
    <div style={{ padding: "32px", maxWidth: "1400px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: 0 }}>🟣 BD Performance — People Engine</h1>
        <p style={{ color: "#64748b", marginTop: "4px", fontSize: "14px" }}>BD productivity leaderboard and contribution analysis</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "20px" }}>
        <KPICard title="Team Achievement" value={formatPct(data.team_pct)} color={data.team_pct >= 80 ? "green" : data.team_pct >= 60 ? "amber" : "red"} icon="🏆" size="lg" />
        <KPICard title="Team Target" value={`${data.team_target}`} subtitle="total signings targeted" color="blue" icon="🎯" size="lg" />
        <KPICard title="Team Achieved" value={`${data.team_achieved}`} color="purple" icon="✅" size="lg" />
        <KPICard title="Active BDs" value={`${data.total_bds}`} color="grey" icon="👥" size="lg" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Target vs Achieved by BD</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
              <Bar dataKey="Target" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="Achieved" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Deal Contribution Share</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={50} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {pieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>BD Leaderboard</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={thS}>Rank</th>
              <th style={thS}>BD Name</th>
              <th style={thS}>Target</th>
              <th style={thS}>Achieved</th>
              <th style={thS}>Achievement %</th>
              <th style={thS}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.leaderboard?.map((bd: any) => (
              <tr key={bd.name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={tdS}><span style={{ fontWeight: 800, color: bd.rank === 1 ? "#d97706" : "#0f172a" }}>#{bd.rank}</span></td>
                <td style={tdS}><strong>{bd.name}</strong></td>
                <td style={tdS}>{bd.total_target}</td>
                <td style={tdS}>{bd.total_achieved}</td>
                <td style={tdS}><span style={{ color: pctColor(bd.achievement_pct), fontWeight: 700 }}>{formatPct(bd.achievement_pct)}</span></td>
                <td style={tdS}>
                  <span style={{
                    padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                    background: `${STATUS_COLORS[bd.status]}22`, color: STATUS_COLORS[bd.status]
                  }}>{bd.status.toUpperCase()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.insights?.length > 0 && (
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700 }}>💡 Insights</h3>
          <InsightStrip insights={data.insights} />
        </div>
      )}
    </div>
  );
}

const thS: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", borderBottom: "2px solid #f1f5f9" };
const tdS: React.CSSProperties = { padding: "10px 12px", color: "#475569" };
