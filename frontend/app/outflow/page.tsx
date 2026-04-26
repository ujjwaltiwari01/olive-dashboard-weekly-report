"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import KPICard from "../components/KPICard";
import InsightStrip from "../components/InsightStrip";
import { fetchKPI, formatCurrency } from "../../lib/api";

const REFRESH = 60000;

export default function OutflowPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setData(await fetchKPI("outflow")); setLoading(false); }, []);
  useEffect(() => { load(); const t = setInterval(load, REFRESH); return () => clearInterval(t); }, [load]);

  if (loading) return <div style={{ padding: "32px", color: "#64748b" }}>Loading…</div>;
  if (!data || data.error) return <div style={{ padding: "32px" }}>⚠️ API Error{data?.error ? ` — ${data.error}` : ""}</div>;

  const { summary } = data;

  const burnChart = data.burn_forecast?.map((b: any) => ({
    month: b.month,
    "Monthly Burn": b.total,
  })) ?? [];

  const topVendors = data.vendors?.slice(0, 8).map((v: any) => ({
    name: v.vendor.length > 20 ? v.vendor.substring(0, 20) + "…" : v.vendor,
    Amount: v.amount_due,
    entity: v.entity,
  })) ?? [];

  return (
    <div style={{ padding: "32px", maxWidth: "1400px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: 0 }}>🔴 Outflow — Payables Engine</h1>
        <p style={{ color: "#64748b", marginTop: "4px", fontSize: "14px" }}>Vendor obligations, upcoming dues, and monthly burn forecast</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "20px" }}>
        <KPICard title="Total Payables" value={formatCurrency(summary?.total_payable ?? 0, true)} color="red" icon="💳" size="lg" />
        <KPICard title="HQ Payables" value={formatCurrency(summary?.hq_payable ?? 0, true)} color="amber" icon="🏢" size="lg" />
        <KPICard title="Paragon Payables" value={formatCurrency(summary?.paragon_payable ?? 0, true)} color="purple" icon="🏗️" size="lg" />
        <KPICard title="Next Month Burn" value={formatCurrency(summary?.next_month_burn ?? 0, true)} color={(summary?.next_month_burn ?? 0) > 10000000 ? "red" : "amber"} icon="🔥" size="lg" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        {/* Top Vendors */}
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Top Payable Vendors</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topVendors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v, true)} />
              <Bar dataKey="Amount" fill="#dc2626" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Burn Forecast */}
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Monthly Burn Forecast (Feb – Sep 2026)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={burnChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `₹${(v / 10000000).toFixed(1)}Cr`} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v, true)} />
              <Line type="monotone" dataKey="Monthly Burn" stroke="#dc2626" strokeWidth={2.5} dot={{ fill: "#dc2626", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vendor Table */}
      <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700 }}>Vendor Payables Detail</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={thS}>#</th>
              <th style={thS}>Vendor</th>
              <th style={thS}>Entity</th>
              <th style={thS}>Amount Due</th>
              <th style={thS}>Relative Size</th>
            </tr>
          </thead>
          <tbody>
            {data.vendors?.map((v: any, i: number) => {
              const maxAmt = data.vendors[0]?.amount_due || 1;
              return (
                <tr key={v.vendor + i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={tdS}>{i + 1}</td>
                  <td style={{ ...tdS, fontWeight: 600, color: "#0f172a" }}>{v.vendor}</td>
                  <td style={tdS}>
                    <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "11px", background: v.entity === "HQ" ? "#eff6ff" : "#f5f3ff", color: v.entity === "HQ" ? "#1d4ed8" : "#6d28d9" }}>{v.entity}</span>
                  </td>
                  <td style={tdS}><span style={{ color: "#dc2626", fontWeight: 700 }}>{formatCurrency(v.amount_due, true)}</span></td>
                  <td style={tdS}>
                    <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "6px", width: "120px" }}>
                      <div style={{ background: "#dc2626", height: "100%", borderRadius: "4px", width: `${(v.amount_due / maxAmt) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
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
