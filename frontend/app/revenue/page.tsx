/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { fetchKPI } from "../../lib/api";

const REFRESH = 60000;

export default function RevenuePage() {
  const [mixData, setMixData] = useState<any>(null);
  const [yoyData, setYoyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [mixRes, yoyRes] = await Promise.all([
        fetchKPI("sales_mix"),
        fetchKPI("sales_yoy")
      ]);
      setMixData(mixRes);
      setYoyData(yoyRes);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { 
    load(); 
    const t = setInterval(load, REFRESH); 
    return () => clearInterval(t); 
  }, [load]);

  if (loading) return <Loading />;
  if (!mixData || mixData.error || !yoyData || yoyData.error) {
     return <div style={pageStyle}><p>⚠️ Cannot load Revenue KPI data. Backend returned an error.</p></div>;
  }

  return (
    <div style={pageStyle}>
      <PageHeader title="🟠 Revenue Dashboard (KPI 3 & 4)" subtitle="Channel-wise sales mix & Year-over-Year revenue comparison (₹ in Lakhs)" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "1400px" }}>
        
        {/* PART 1: MoM COMPARISON STACKED BARS (KPI 3) */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px", marginBottom: "24px" }}>
            <h3 style={cardHeaderStyle}>Monthly Revenue Mix</h3>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: "12px", color: "#6B6B6B", marginBottom: "4px" }}>MoM Growth</span>
                <span style={{ 
                    background: mixData.mom_pct >= 0 ? "#F0FDF4" : "#FEF2F2", 
                    color: mixData.mom_pct >= 0 ? "#16A34A" : "#DC2626", 
                    padding: "6px 16px", 
                    borderRadius: "20px", 
                    fontSize: "16px", 
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                }}>
                    {mixData.mom_pct >= 0 ? "↗" : "↘"} {mixData.mom_pct > 0 ? "+" : ""}{mixData.mom_pct}%
                </span>
            </div>
          </div>

          <div style={{ height: "450px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mixData.chart_data || []} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} barSize={100}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 14, fill: "#1A1A1A", fontWeight: 600 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#6B6B6B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dx={-10} tickFormatter={(val) => `${val}L`} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(val: number) => [`₹${val}L`, "Revenue"]} />
                <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "20px", color: "#1A1A1A" }} iconType="circle" />
                
                <Bar dataKey="Walk-in" stackId="a" fill="#E4572E">
                    <LabelList dataKey="Walk-in" position="center" fill="#FFFFFF" fontSize={13} fontWeight={600} formatter={(v: any) => v && v > 0 ? `${v}L` : ''} />
                </Bar>
                <Bar dataKey="Online" stackId="a" fill="#1A1A1A">
                    <LabelList dataKey="Online" position="center" fill="#FFFFFF" fontSize={13} fontWeight={600} formatter={(v: any) => v && v > 0 ? `${v}L` : ''} />
                </Bar>
                <Bar dataKey="Corporate" stackId="a" fill="#9CA3AF">
                    <LabelList dataKey="Corporate" position="center" fill="#FFFFFF" fontSize={13} fontWeight={600} formatter={(v: any) => v && v > 0 ? `${v}L` : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed #E5E7EB", fontSize: "14px", color: "#4B5563" }}>
            <div><strong style={{ color: "#1A1A1A"}}>Feb Total:</strong> ₹{mixData.feb_total}L</div>
            <div><strong style={{ color: "#1A1A1A"}}>Mar Total:</strong> ₹{mixData.mar_total}L</div>
          </div>
        </div>

        {/* PART 2: YoY COMPARISON STACKED BARS (KPI 4) */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px", marginBottom: "24px" }}>
            <h3 style={cardHeaderStyle}>Annual YoY Revenue Mix</h3>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: "12px", color: "#6B6B6B", marginBottom: "4px" }}>YoY Growth</span>
                <span style={{ 
                    background: yoyData.yoy_pct >= 0 ? "#F0FDF4" : "#FEF2F2", 
                    color: yoyData.yoy_pct >= 0 ? "#16A34A" : "#DC2626", 
                    padding: "6px 16px", 
                    borderRadius: "20px", 
                    fontSize: "16px", 
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                }}>
                    {yoyData.yoy_pct >= 0 ? "↗" : "↘"} {yoyData.yoy_pct > 0 ? "+" : ""}{yoyData.yoy_pct}%
                </span>
            </div>
          </div>

          <div style={{ height: "450px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yoyData.chart_data || []} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} barSize={100}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 14, fill: "#1A1A1A", fontWeight: 600 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#6B6B6B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dx={-10} tickFormatter={(val) => `${val}L`} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(val: number) => [`₹${val}L`, "Revenue"]} />
                <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "20px", color: "#1A1A1A" }} iconType="circle" />
                
                <Bar dataKey="Walk-in" stackId="a" fill="#E4572E">
                    <LabelList dataKey="Walk-in" position="center" fill="#FFFFFF" fontSize={13} fontWeight={600} formatter={(v: any) => v && v > 0 ? `${v}L` : ''} />
                </Bar>
                <Bar dataKey="Online" stackId="a" fill="#1A1A1A">
                    <LabelList dataKey="Online" position="center" fill="#FFFFFF" fontSize={13} fontWeight={600} formatter={(v: any) => v && v > 0 ? `${v}L` : ''} />
                </Bar>
                <Bar dataKey="Corporate" stackId="a" fill="#9CA3AF">
                    <LabelList dataKey="Corporate" position="center" fill="#FFFFFF" fontSize={13} fontWeight={600} formatter={(v: any) => v && v > 0 ? `${v}L` : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed #E5E7EB", fontSize: "14px", color: "#4B5563" }}>
            <div><strong style={{ color: "#1A1A1A"}}>Mar'25 Total:</strong> ₹{yoyData.mar25_total}L</div>
            <div><strong style={{ color: "#1A1A1A"}}>Mar'26 Total:</strong> ₹{yoyData.mar26_total}L</div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── STYLES & HELPERS ──────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { padding: "40px", maxWidth: "1400px", backgroundColor: "#FFFFFF", minHeight: "100vh" };
const cardStyle: React.CSSProperties = { background: "#FAFAFA", borderRadius: "12px", padding: "32px", border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" };
const cardHeaderStyle: React.CSSProperties = { margin: "0", fontSize: "18px", fontWeight: 700, color: "#1A1A1A" };

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: "32px", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>{title}</h1>
      <p style={{ color: "#6B6B6B", marginTop: "8px", fontSize: "15px", fontWeight: 400 }}>{subtitle}</p>
    </div>
  );
}

const tooltipStyle = { borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "13px", backgroundColor: "#FFFFFF", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" };

function Loading() { return <div style={{ ...pageStyle, color: "#6B6B6B", display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}><div style={{ fontSize: "16px", fontWeight: 500 }}>Loading Executive Dashboard...</div></div>; }
