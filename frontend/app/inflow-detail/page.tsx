"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import KPICard from "../components/KPICard";
import InsightStrip from "../components/InsightStrip";
import { fetchKPI, formatCurrency, formatPct, pctColor } from "../../lib/api";

const REFRESH = 60000;

export default function InflowDetailPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setData(await fetchKPI("inflow-detail")); setLoading(false); }, []);
  useEffect(() => { load(); const t = setInterval(load, REFRESH); return () => clearInterval(t); }, [load]);

  if (loading) return <div style={{ padding: "32px", color: "#64748b" }}>Loading…</div>;
  if (!data) return <div style={{ padding: "32px" }}>⚠️ API Error</div>;

  const { summary } = data;

  const topDue = data.properties?.slice(0, 8).map((p: any) => ({
    name: p.name.length > 18 ? p.name.substring(0, 18) + "…" : p.name,
    Due: p.mar26_due,
    Collected: p.mar26_collected,
  })) ?? [];

  return (
    <div style={{ padding: "32px", maxWidth: "1400px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: 0 }}>🔶 Inflow Detail — Collection Engine</h1>
        <p style={{ color: "#64748b", marginTop: "4px", fontSize: "14px" }}>TA Fee collection per property for Mar'26</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "20px" }}>
        <KPICard title="Mar'26 Collectable" value={formatCurrency(summary?.total_target ?? 0, true)} color="blue" icon="📋" size="lg" />
        <KPICard title="Collected" value={formatCurrency(summary?.total_collected ?? 0, true)} color="green" icon="✅" size="lg" />
        <KPICard title="Outstanding" value={formatCurrency(summary?.total_due ?? 0, true)} color={(summary?.total_due ?? 0) > 1000000 ? "red" : "amber"} icon="⏳" size="lg" />
        <KPICard title="Collection %" value={formatPct(summary?.collection_pct ?? 0)} color={(summary?.collection_pct ?? 0) >= 80 ? "green" : (summary?.collection_pct ?? 0) >= 60 ? "amber" : "red"} icon="💯" size="lg" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Collections vs Outstanding (Top Properties)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topDue} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} formatter={(v: number) => formatCurrency(v, true)} />
              <Bar dataKey="Collected" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="Due" fill="#dc2626" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Collection % by property */}
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Collection Rate by Property</h3>
          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
            {data.properties?.filter((p: any) => p.mar26_target > 0).slice(0, 12).map((p: any) => (
              <div key={p.name} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "11px" }}>{p.name.substring(0, 28)}</span>
                  <span style={{ color: pctColor(p.collection_pct), fontWeight: 700, fontSize: "12px" }}>{p.collection_pct}%</span>
                </div>
                <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "6px" }}>
                  <div style={{ background: pctColor(p.collection_pct), height: "100%", borderRadius: "4px", width: `${Math.min(100, p.collection_pct)}%`, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                  Collected: {formatCurrency(p.mar26_collected, true)} | Due: {formatCurrency(p.mar26_due, true)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Table */}
      <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "20px", overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Property-Level Collection Detail</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              <th style={thS}>Property</th>
              <th style={thS}>City</th>
              <th style={thS}>BD</th>
              <th style={thS}>Mar'26 Target</th>
              <th style={thS}>Collected</th>
              <th style={thS}>Due</th>
              <th style={thS}>Collection %</th>
              <th style={thS}>Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {data.properties?.map((p: any) => (
              <tr key={p.name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ ...tdS, maxWidth: "180px" }}><strong>{p.name}</strong></td>
                <td style={tdS}>{p.city || "—"}</td>
                <td style={tdS}>{p.bd || "—"}</td>
                <td style={tdS}>{formatCurrency(p.mar26_target, true)}</td>
                <td style={tdS}><span style={{ color: "#16a34a", fontWeight: 600 }}>{formatCurrency(p.mar26_collected, true)}</span></td>
                <td style={tdS}><span style={{ color: p.mar26_due > 0 ? "#dc2626" : "#64748b", fontWeight: p.mar26_due > 0 ? 700 : 400 }}>{formatCurrency(p.mar26_due, true)}</span></td>
                <td style={tdS}><span style={{ color: pctColor(p.collection_pct), fontWeight: 700 }}>{p.collection_pct}%</span></td>
                <td style={tdS}>{formatCurrency(p.cumulative, true)}</td>
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
