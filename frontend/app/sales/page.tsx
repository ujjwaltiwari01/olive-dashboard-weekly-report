"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import KPICard from "../components/KPICard";
import InsightStrip from "../components/InsightStrip";
import { fetchKPI, formatCurrency, formatPct } from "../../lib/api";

const REFRESH = 60000;
const PROPERTY_COLORS = ["#4f46e5", "#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#be185d"];

export default function SalesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setData(await fetchKPI("sales")); setLoading(false); }, []);
  useEffect(() => { load(); const t = setInterval(load, REFRESH); return () => clearInterval(t); }, [load]);

  if (loading) return <div style={{ padding: "32px", color: "#64748b" }}>Loading…</div>;
  if (!data) return <div style={{ padding: "32px" }}>⚠️ API Error</div>;

  // Build stacked bar data
  const stackedData = data.monthly_totals?.map((m: any) => {
    const row: any = { month: m.month };
    data.properties?.forEach((p: any, i: number) => {
      const mv = p.monthly?.find((mm: any) => mm.month === m.month);
      if (mv) row[p.name.replace("Olive ", "").substring(0, 12)] = mv.revenue;
    });
    return row;
  }) ?? [];

  const propertyNames = data.properties?.map((p: any) => p.name.replace("Olive ", "").substring(0, 12)) ?? [];

  const growthData = data.monthly_totals?.map((m: any) => ({
    month: m.month,
    Revenue: m.total_revenue,
    Growth: m.growth_pct ?? 0,
  })) ?? [];

  return (
    <div style={{ padding: "32px", maxWidth: "1400px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: 0 }}>🟡 Sales — Revenue Engine</h1>
        <p style={{ color: "#64748b", marginTop: "4px", fontSize: "14px" }}>Monthly revenue by property — Apr'25 through Mar'26</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "20px" }}>
        <KPICard title="Total Revenue (FY)" value={formatCurrency(data.grand_total, true)} color="blue" icon="💰" size="lg" />
        <KPICard title="Mar'26 Revenue" value={formatCurrency(data.latest_month_revenue, true)} color="green" icon="📈" size="lg" />
        <KPICard title="MoM Growth" value={formatPct(Math.abs(data.latest_growth_pct))} trend={data.latest_growth_pct} color={data.latest_growth_pct >= 0 ? "green" : "red"} icon="📊" size="lg" />
        <KPICard title="Properties" value={`${data.properties?.length ?? 0}`} subtitle="revenue generating" color="purple" icon="🏢" size="lg" />
      </div>

      {/* Stacked bar chart */}
      <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Monthly Revenue by Property (Stacked)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stackedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }} formatter={(v: number) => formatCurrency(v, true)} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            {propertyNames.slice(0, 8).map((name: string, i: number) => (
              <Bar key={name} dataKey={name} stackId="rev" fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Growth chart */}
      <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Total Monthly Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={growthData}>
            <defs>
              <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} formatter={(v: number) => [formatCurrency(v, true), "Revenue"]} />
            <Area type="monotone" dataKey="Revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#revAreaGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Property breakdown table */}
      <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "20px", overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Property Revenue Summary</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              <th style={thS}>Property</th>
              <th style={thS}>Total Revenue (FY)</th>
              <th style={thS}>Mar'26</th>
              <th style={thS}>Share %</th>
            </tr>
          </thead>
          <tbody>
            {data.properties?.map((p: any) => (
              <tr key={p.name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={tdS}><strong>{p.name}</strong></td>
                <td style={tdS}>{formatCurrency(p.total_revenue, true)}</td>
                <td style={tdS}>{formatCurrency(p.monthly?.[p.monthly.length - 1]?.revenue ?? 0, true)}</td>
                <td style={tdS}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "6px", width: "80px" }}>
                      <div style={{ background: "#4f46e5", height: "100%", borderRadius: "4px", width: `${Math.min(100, (p.total_revenue / (data.grand_total || 1)) * 100)}%` }} />
                    </div>
                    <span style={{ color: "#64748b", fontSize: "11px" }}>{((p.total_revenue / (data.grand_total || 1)) * 100).toFixed(1)}%</span>
                  </div>
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
