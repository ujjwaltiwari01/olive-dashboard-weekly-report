/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { fetchKPI } from "../../lib/api";

const REFRESH = 60000;

export default function RevenuePage() {
  const [compositionData, setCompositionData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const compositionRes = await fetchKPI("revenue_composition");
      setCompositionData(compositionRes);
      setTrendData(compositionRes?.property_revenue_trend ?? compositionRes);
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
  if (!compositionData || compositionData.error || !trendData || trendData.error) {
     return <div style={pageStyle}><p>⚠️ Cannot load Revenue KPI data. Backend returned an error.</p></div>;
  }
  const comparisonData = compositionData.property_revenue_comparison;

  return (
    <div style={pageStyle}>
      <PageHeader
        title="🟠 Revenue Dashboard — May 2026 (week ending 8 May)"
        subtitle=""
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "1400px" }}>
        
        {/* PART 1: Property revenue trend from the Revenue sheet top block */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px", marginBottom: "24px" }}>
            <h3 style={cardHeaderStyle}>{trendData.title || "Property Revenue - Trend"}</h3>
          </div>

          <div style={{ height: "450px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData.bars || []} margin={{ top: 36, right: 30, left: 0, bottom: 20 }} barSize={62}>
                <defs>
                  <pattern id="longStayHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                    <rect width="8" height="8" fill="#FFF4F1" />
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#E4572E" strokeWidth="3" />
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 14, fill: "#1A1A1A", fontWeight: 600 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#6B6B6B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dx={-10} tickFormatter={(val) => `${val}L`} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(val: any) => [`₹${val}L`, "Revenue"]} />
                <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "20px", color: "#1A1A1A" }} iconType="circle" />
                
                <Bar dataKey="short_stay_lakhs" name="Short stay" stackId="a" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={1.5}>
                    <LabelList dataKey="short_stay_lakhs" position="center" fill="#1A1A1A" fontSize={13} fontWeight={700} formatter={formatLakhsLabel} />
                </Bar>
                <Bar dataKey="long_stay_lakhs" name="Long stay" stackId="a" fill="url(#longStayHatch)" stroke="#E4572E" strokeWidth={1.5}>
                    <LabelList dataKey="long_stay_lakhs" position="center" fill="#E4572E" fontSize={12} fontWeight={800} formatter={formatLakhsLabel} />
                    <LabelList dataKey="total_lakhs" position="top" fill="#1A1A1A" fontSize={14} fontWeight={800} formatter={formatTotalLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PART 2: Same-period YoY and MoM comparison from the Revenue sheet */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px", marginBottom: "24px" }}>
            <div>
              <h3 style={cardHeaderStyle}>{comparisonData?.title || "Property Revenue - vs MoM vs YoY"}</h3>
              <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#6B6B6B", fontWeight: 600 }}>{comparisonData?.subtitle || "Same period"}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", height: "450px" }}>
            <ComparisonMiniChart data={comparisonData?.yoy} patternId="comparisonYoyHatch" />
            <ComparisonMiniChart data={comparisonData?.mom} patternId="comparisonMomHatch" />
          </div>
        </div>

        {/* PART 3: Online / offline channels and online split */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px", marginBottom: "24px" }}>
            <h3 style={cardHeaderStyle}>
              {compositionData.property_revenue_online_offline?.title || "Property Revenue - Online vs Offline and OTA vs OBE- 8th May '26"}
            </h3>
          </div>
          <OnlineOfflineChart data={compositionData.property_revenue_online_offline} />
        </div>

      </div>
    </div>
  );
}

// ─── STYLES & HELPERS ──────────────────────────────────────────────────────────

function ComparisonMiniChart({ data, patternId }: { data: any; patternId: string }) {
  const growth = Number(data?.growth_pct ?? 0);
  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: "12px", padding: "16px 14px 8px", background: "#FFFFFF", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1A1A1A" }}>{data?.label || "Comparison"}</h4>
        <span style={{
          background: growth >= 0 ? "#F0FDF4" : "#FEF2F2",
          color: growth >= 0 ? "#16A34A" : "#DC2626",
          borderRadius: "999px",
          padding: "4px 10px",
          fontSize: "12px",
          fontWeight: 800,
        }}>
          {growth > 0 ? "+" : ""}{growth}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data?.bars || []} margin={{ top: 34, right: 8, left: -18, bottom: 16 }} barSize={54}>
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#FFF4F1" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#E4572E" strokeWidth="3" />
            </pattern>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#1A1A1A", fontWeight: 700 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={8} />
          <YAxis tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} tickFormatter={(val) => `${val}L`} />
          <RechartsTooltip contentStyle={tooltipStyle} formatter={(val: any) => [`₹${val}L`, "Revenue"]} />
          <Bar dataKey="short_stay_lakhs" name="Short stay" stackId="a" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={1.5}>
            <LabelList dataKey="short_stay_lakhs" position="center" fill="#1A1A1A" fontSize={11} fontWeight={700} formatter={formatLakhsLabel} />
          </Bar>
          <Bar dataKey="long_stay_lakhs" name="Long stay" stackId="a" fill={`url(#${patternId})`} stroke="#E4572E" strokeWidth={1.5}>
            <LabelList dataKey="long_stay_lakhs" position="center" fill="#E4572E" fontSize={11} fontWeight={800} formatter={formatLakhsLabel} />
            <LabelList dataKey="total_lakhs" position="top" fill="#1A1A1A" fontSize={12} fontWeight={800} formatter={formatTotalLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function OnlineOfflineChart({ data }: { data: any }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr", gap: "24px", minHeight: "430px" }}>
      <div style={{ border: "1px solid #E5E7EB", borderRadius: "12px", padding: "18px 16px 8px", background: "#FFFFFF", minWidth: 0 }}>
        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1A1A1A" }}>
          {data?.actual_vs_target?.label || "Actual vs Target"}
        </h4>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data?.actual_vs_target?.bars || []} margin={{ top: 34, right: 24, left: -4, bottom: 22 }} barSize={72}>
            <defs>
              <pattern id="corporateHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="#FFF4F1" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="#E4572E" strokeWidth="3" />
              </pattern>
              <pattern id="walkInGrid" patternUnits="userSpaceOnUse" width="8" height="8">
                <rect width="8" height="8" fill="#111827" />
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.8" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: "#1A1A1A", fontWeight: 700 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={10} />
            <YAxis tick={{ fontSize: 12, fill: "#6B6B6B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} tickFormatter={(val) => `${val}L`} />
            <RechartsTooltip contentStyle={tooltipStyle} formatter={(val: any) => [`₹${val}L`, "Revenue"]} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "14px", color: "#1A1A1A" }} iconType="circle" />
            <Bar dataKey="online_lakhs" name="Online" stackId="a" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={1.5}>
              <LabelList dataKey="online_lakhs" position="center" fill="#1A1A1A" fontSize={12} fontWeight={700} formatter={formatLakhsLabel} />
            </Bar>
            <Bar dataKey="corporate_lakhs" name="Corporate" stackId="a" fill="url(#corporateHatch)" stroke="#E4572E" strokeWidth={1.5}>
              <LabelList dataKey="corporate_lakhs" position="center" fill="#E4572E" fontSize={12} fontWeight={800} formatter={formatLakhsLabel} />
            </Bar>
            <Bar dataKey="walk_in_lakhs" name="Walk-in" stackId="a" fill="url(#walkInGrid)" stroke="#111827" strokeWidth={1.5}>
              <LabelList dataKey="walk_in_lakhs" position="center" fill="#FFFFFF" fontSize={12} fontWeight={800} formatter={formatLakhsLabel} />
              <LabelList dataKey="total_lakhs" position="top" fill="#1A1A1A" fontSize={13} fontWeight={800} formatter={formatTotalLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ border: "1px solid #E5E7EB", borderRadius: "12px", padding: "18px 16px 8px", background: "#FFFFFF", minWidth: 0 }}>
        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1A1A1A" }}>
          {data?.online_split?.label || "OBE vs OTAs"}
        </h4>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data?.online_split?.bars || []} margin={{ top: 34, right: 16, left: -14, bottom: 22 }} barSize={78}>
            <defs>
              <pattern id="obeHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="#FFF4F1" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="#E4572E" strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: "#1A1A1A", fontWeight: 700 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={10} />
            <YAxis tick={{ fontSize: 12, fill: "#6B6B6B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} tickFormatter={(val) => `${val}L`} />
            <RechartsTooltip contentStyle={tooltipStyle} formatter={(val: any) => [`₹${val}L`, "Revenue"]} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "14px", color: "#1A1A1A" }} iconType="circle" />
            <Bar dataKey="otas_lakhs" name="OTAs" stackId="a" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={1.5}>
              <LabelList dataKey="otas_lakhs" position="center" fill="#1A1A1A" fontSize={12} fontWeight={700} formatter={formatLakhsLabel} />
            </Bar>
            <Bar dataKey="obe_lakhs" name="OBE" stackId="a" fill="url(#obeHatch)" stroke="#E4572E" strokeWidth={1.5}>
              <LabelList dataKey="obe_lakhs" position="center" fill="#E4572E" fontSize={12} fontWeight={800} formatter={formatLakhsLabel} />
              <LabelList dataKey="total_lakhs" position="top" fill="#1A1A1A" fontSize={13} fontWeight={800} formatter={formatTotalLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: "40px", maxWidth: "1400px", backgroundColor: "#FFFFFF", minHeight: "100vh" };
const cardStyle: React.CSSProperties = { background: "#FAFAFA", borderRadius: "12px", padding: "32px", border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" };
const cardHeaderStyle: React.CSSProperties = { margin: "0", fontSize: "18px", fontWeight: 700, color: "#1A1A1A" };

function formatLakhsLabel(v: any) {
  if (!v || Number(v) <= 0) return "";
  const n = Number(v);
  return n >= 100 ? `${Math.round(n)}L` : `${n.toFixed(1)}L`;
}

function formatTotalLabel(v: any) {
  if (!v || Number(v) <= 0) return "";
  return `₹${Math.round(Number(v))}L`;
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: "32px", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>{title}</h1>
      {subtitle ? <p style={{ color: "#6B6B6B", marginTop: "8px", fontSize: "15px", fontWeight: 400 }}>{subtitle}</p> : null}
    </div>
  );
}

const tooltipStyle = { borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "13px", backgroundColor: "#FFFFFF", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" };

function Loading() { return <div style={{ ...pageStyle, color: "#6B6B6B", display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}><div style={{ fontSize: "16px", fontWeight: 500 }}>Loading Executive Dashboard...</div></div>; }
