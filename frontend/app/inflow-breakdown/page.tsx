"use client";

import React, { useEffect, useState } from "react";
import { fetchKPI } from "../../lib/api";

export default function InflowBreakdownPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPI("inflow_breakdown")
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching KPI 7:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: "40px", fontSize: "18px", color: "#6B7280" }}>Syncing native Inflow records...</div>;
  if (!data) return <div style={{ padding: "40px", color: "#DC2626" }}>Failed to parse Inflow Breakdown payload.</div>;

  const { ta_fees = [], mgmt_fees = [], profit_incentive = [] } = data;

  // Group TA Fees by Brand
  const sparkProperties = ta_fees.filter((x: any) => x.brand === "Spark");
  const oliveProperties = ta_fees.filter((x: any) => x.brand === "Olive");
  const unknownProperties = ta_fees.filter((x: any) => x.brand === "Unknown");

  const formatCurrency = (val: number) => {
      if (!val || val === 0) return "₹0";
      return "₹" + val.toLocaleString("en-IN");
  };

  const highRiskStyle = (val: number) => {
      if (val > 0) return { color: "#DC2626", fontWeight: 700, backgroundColor: "#FEF2F2" };
      return { color: "#9CA3AF" };
  };

  return (
    <div style={pageStyle}>
      <PageHeader title="🏦 KPI 7: Inflow Breakdown" subtitle="Collection vs Outstanding tracking matrix mapping W1-W4 recoveries and >90 Delayed Buckets" />

      {/* SECTION A: TA FEES (Collection Tracking) */}
      <div style={cardStyle}>
        <h3 style={cardHeaderStyle}>SECTION A — TA FEES (COLLECTION TRACKING)</h3>
        
        {/* Spark Brand Group */}
        {(sparkProperties.length > 0 || unknownProperties.length > 0) && (
            <div style={{ marginTop: "24px" }}>
              <div style={brandBadgeStyle}>SPARK</div>
              <TAFeeTable rows={[...sparkProperties, ...unknownProperties]} format={formatCurrency} />
            </div>
        )}

        {/* Olive Brand Group */}
        {oliveProperties.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <div style={brandBadgeStyle}>OLIVE</div>
              <TAFeeTable rows={oliveProperties} format={formatCurrency} />
            </div>
        )}
      </div>

      {/* SECTION B: MANAGEMENT FEES (Aging Bucket) */}
      <div style={cardStyle}>
        <h3 style={cardHeaderStyle}>SECTION B — MANAGEMENT FEES (AGING BUCKET)</h3>
        <div style={{ overflowX: "auto", marginTop: "16px", border: "1px solid #E5E7EB", borderRadius: "6px" }}>
            <table style={tableStyle}>
                <thead>
                    <tr style={{ backgroundColor: "#F9FAFB" }}>
                        <th style={thStyle}>Property</th>
                        <th style={{...thStyle, textAlign: "right"}}>0–30</th>
                        <th style={{...thStyle, textAlign: "right"}}>30–60</th>
                        <th style={{...thStyle, textAlign: "right"}}>60–90</th>
                        <th style={{...thStyle, textAlign: "right", color: "#DC2626"}}>90–120</th>
                        <th style={{...thStyle, textAlign: "right"}}>Target</th>
                        <th style={{...thStyle, textAlign: "right", backgroundColor: "#FFF7ED", color: "#EA580C"}}>Received</th>
                        <th style={{...thStyle, textAlign: "right"}}>Expected</th>
                    </tr>
                </thead>
                <tbody>
                    {mgmt_fees.map((r: any, i: number) => (
                        <tr key={i} style={rowStyle(i)}>
                            <td style={{...tdStyle, fontWeight: 600, color: "#111827"}}>{r.property}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#6B7280"}}>{formatCurrency(r.aging_0_30)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#6B7280"}}>{formatCurrency(r.aging_30_60)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#4B5563", fontWeight: 500}}>{formatCurrency(r.aging_60_90)}</td>
                            <td style={{...tdStyle, textAlign: "right", ...highRiskStyle(r.aging_90_120)}}>{formatCurrency(r.aging_90_120)}</td>
                            
                            <td style={{...tdStyle, textAlign: "right", color: "#6B7280", borderLeft: "2px solid #E5E7EB"}}>{formatCurrency(r.target)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#E4572E", fontWeight: 800, backgroundColor: "#FFF7ED"}}>{formatCurrency(r.received)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#F97316"}}>{formatCurrency(r.expected)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* SECTION C: PROFIT INCENTIVE */}
      <div style={cardStyle}>
        <h3 style={cardHeaderStyle}>SECTION C — PROFIT INCENTIVE</h3>
        <div style={{ overflowX: "auto", marginTop: "16px", border: "1px solid #E5E7EB", borderRadius: "6px" }}>
            <table style={tableStyle}>
                <thead>
                    <tr style={{ backgroundColor: "#F9FAFB" }}>
                        <th style={thStyle}>Party Name</th>
                        <th style={{...thStyle, textAlign: "right"}}>0–30</th>
                        <th style={{...thStyle, textAlign: "right"}}>30–60</th>
                        <th style={{...thStyle, textAlign: "right"}}>60–90</th>
                        <th style={{...thStyle, textAlign: "right", color: "#DC2626"}}>90–120</th>
                        <th style={{...thStyle, textAlign: "right"}}>Target</th>
                        <th style={{...thStyle, textAlign: "right", backgroundColor: "#FFF7ED", color: "#EA580C"}}>Received</th>
                        <th style={{...thStyle, textAlign: "right"}}>Expected</th>
                    </tr>
                </thead>
                <tbody>
                    {profit_incentive.map((r: any, i: number) => (
                        <tr key={i} style={rowStyle(i)}>
                            <td style={{...tdStyle, fontWeight: 600, color: "#111827"}}>{r.party}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#6B7280"}}>{formatCurrency(r.aging_0_30)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#6B7280"}}>{formatCurrency(r.aging_30_60)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#4B5563", fontWeight: 500}}>{formatCurrency(r.aging_60_90)}</td>
                            <td style={{...tdStyle, textAlign: "right", ...highRiskStyle(r.aging_90_120)}}>{formatCurrency(r.aging_90_120)}</td>
                            
                            <td style={{...tdStyle, textAlign: "right", color: "#6B7280", borderLeft: "2px solid #E5E7EB"}}>{formatCurrency(r.target)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#E4572E", fontWeight: 800, backgroundColor: "#FFF7ED"}}>{formatCurrency(r.received)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#F97316"}}>{formatCurrency(r.expected)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
}

// ─── TA FEES TABLE COMPONENT ──────────────────────
function TAFeeTable({ rows, format }: { rows: any[], format: any }) {
    if (rows.length === 0) return null;

    return (
        <div style={{ overflowX: "auto", marginTop: "12px", border: "1px solid #E5E7EB", borderRadius: "6px" }}>
            <table style={tableStyle}>
                <thead>
                    <tr style={{ backgroundColor: "#F9FAFB" }}>
                        <th style={thStyle}>Property</th>
                        <th style={{...thStyle, textAlign: "right"}}>Collected Outstanding</th>
                        <th style={{...thStyle, textAlign: "right"}}>Target</th>
                        <th style={{...thStyle, textAlign: "right"}}>W1</th>
                        <th style={{...thStyle, textAlign: "right"}}>W2</th>
                        <th style={{...thStyle, textAlign: "right"}}>W3</th>
                        <th style={{...thStyle, textAlign: "right"}}>W4</th>
                        <th style={{...thStyle, textAlign: "right", backgroundColor: "#FFF7ED", color: "#EA580C"}}>Received</th>
                        <th style={{...thStyle, textAlign: "right"}}>Expected</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} style={rowStyle(i)}>
                            <td style={{...tdStyle, fontWeight: 600, color: "#111827"}}>{r.property}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#4B5563"}}>{format(r.collected_outstanding)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#6B7280"}}>{format(r.target)}</td>
                            
                            <td style={{...tdStyle, textAlign: "right", color: "#4B5563", borderLeft: "1px dashed #E5E7EB"}}>{format(r.w1)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#4B5563"}}>{format(r.w2)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#4B5563"}}>{format(r.w3)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#4B5563", borderRight: "1px dashed #E5E7EB"}}>{format(r.w4)}</td>
                            
                            <td style={{...tdStyle, textAlign: "right", color: "#E4572E", fontWeight: 800, backgroundColor: "#FFF7ED"}}>{format(r.received)}</td>
                            <td style={{...tdStyle, textAlign: "right", color: "#F97316"}}>{format(r.expected)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


// ─── STYLES & HELPERS ──────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { padding: "40px", maxWidth: "1400px", backgroundColor: "#F9FAFB", minHeight: "100vh" };
const cardStyle: React.CSSProperties = { background: "#FFFFFF", borderRadius: "8px", padding: "24px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "32px" };
const cardHeaderStyle: React.CSSProperties = { margin: "0", fontSize: "15px", fontWeight: 800, color: "#111827", letterSpacing: "0.05em" };
const brandBadgeStyle: React.CSSProperties = { display: "inline-block", padding: "4px 12px", backgroundColor: "#1F2937", color: "#FFFFFF", fontSize: "11px", fontWeight: 700, borderRadius: "4px", letterSpacing: "0.1em" };

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" };
const thStyle: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid #E5E7EB", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em" };
const tdStyle: React.CSSProperties = { padding: "10px 16px" };
const rowStyle = (i: number): React.CSSProperties => ({
    borderBottom: "1px solid #E5E7EB", 
    backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#FAFAFA" 
});

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "0 0 8px 0", color: "#111827" }}>{title}</h1>
      <p style={{ margin: 0, fontSize: "16px", color: "#6B7280" }}>{subtitle}</p>
    </div>
  );
}
