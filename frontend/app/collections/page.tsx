/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { fetchKPI, formatCurrency } from "../../lib/api";

const REFRESH = 60000;

// ─── UI COMPONENTS ──────────────────────────────────────────────────────────

const DescriptionTd = ({ name, level, zebra }: { name: string; level: number; zebra?: boolean }) => {
  const indent = level === 1 ? "0" : level === 2 ? "12px" : "32px";
  const fontWeight = level === 1 ? 800 : level === 2 ? 700 : 400;
  const paddingLeft = indent;
  const bg = zebra ? "#f8fafc" : "white";

  return (
    <td style={{
      padding: "2px 8px",
      textAlign: "left",
      color: level === 1 ? "#0f172a" : level === 2 ? "#334155" : "#475569",
      fontWeight: fontWeight,
      paddingLeft: paddingLeft,
      fontSize: level === 1 ? "13px" : "11px",
      borderBottom: "1px solid #f1f5f9",
      background: bg,
    }}>
      {name}
    </td>
  );
};

const ValueTd = ({ value, target, bold, greyOut, zebra, type }: { value: any; target?: any; bold?: boolean; greyOut?: boolean; zebra?: boolean; type?: "received" | "target" | "expected" | "total" }) => {
  let displayValue = "";
  let color = bold ? "#0f172a" : "#475569";
  let fontWeight = bold ? 700 : 400;
  const bg = zebra ? "#f8fafc" : "white";

  if (greyOut) {
    displayValue = "—";
    color = "#94a3b8";
  } else if (value === 0 || value === null || value === undefined) {
    displayValue = "—";
    color = "#cbd5e1";
    fontWeight = 400;
  } else {
    displayValue = formatCurrency(value);
    // Success Green for Received column if > 0
    if (type === "received" && value > 0 && !bold) {
      color = "#059669"; 
      fontWeight = 600;
    }
  }

  return (
    <td style={{
      padding: "2px 8px",
      textAlign: "right",
      color: color,
      fontWeight: fontWeight,
      fontSize: "11px",
      fontFamily: "var(--font-geist-mono), monospace",
      borderBottom: "1px solid #f1f5f9",
      background: bg
    }}>
      {displayValue}
    </td>
  );
};

export default function CollectionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await fetchKPI("collections");
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <div style={pageStyle}><p>Loading collection details...</p></div>;
  if (!data || data.error) return (
    <div style={pageStyle}>
      <div style={{ padding: "24px", background: "#fef2f2", color: "#991b1b", borderRadius: "12px", border: "1px solid #fecaca" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>⚠️ Data Integrity Error</h2>
        <p style={{ fontSize: "14px", lineHeight: 1.5 }}>{data?.error || "Cannot load collection data from Excel."}</p>
      </div>
    </div>
  );

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", marginBottom: "0px", letterSpacing: "-0.02em" }}>{data.title}</h1>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0f172a" }}>
              <th style={{ ...thStyle, color: "white" }}>Description</th>
              <th style={{ ...thStyle, textAlign: "right", color: "#94a3b8" }}>Target</th>
              <th style={{ ...thStyle, textAlign: "right", color: "#10b981" }}>Received</th>
              <th style={{ ...thStyle, textAlign: "right", color: "#f59e0b" }}>Expected</th>
              <th style={{ ...thStyle, textAlign: "right", color: "white" }}>Total Inflow</th>
            </tr>
          </thead>
          <tbody>
            {data.sections.map((section: any, sIdx: number) => (
              <React.Fragment key={sIdx}>
                {sIdx > 0 && (
                  <tr>
                    <td colSpan={5} style={{ height: "12px", background: "#f8fafc", border: "none" }} />
                  </tr>
                )}
                {/* Level 1 Category (TA Fees, Mgmt, etc.) */}
                <tr style={{ background: "#f8fafc", borderTop: sIdx > 0 ? "1px solid #e2e8f0" : "none" }}>
                  <DescriptionTd name={section.name} level={1} />
                  <ValueTd value={section.target} bold />
                  <ValueTd value={section.received} bold type="received" />
                  <ValueTd value={section.expected} bold />
                  <ValueTd value={section.total} bold />
                </tr>

                {/* Subsections (Spark, Olive, Open) */}
                {section.subsections?.map((sub: any, subIdx: number) => (
                  <React.Fragment key={subIdx}>
                    {sub.properties && (
                      <tr style={{ background: "white" }}>
                        <DescriptionTd name={sub.name} level={2} />
                        <ValueTd value={null} />
                        <ValueTd value={null} />
                        <ValueTd value={null} />
                        <ValueTd value={null} />
                      </tr>
                    )}
                    
                    {sub.properties?.map((prop: any, pIdx: number) => (
                      <tr key={pIdx} style={{ background: pIdx % 2 === 0 ? "white" : "#fafafa" }}>
                        <DescriptionTd name={prop.name} level={3} />
                        <ValueTd value={prop.target} />
                        <ValueTd value={prop.received} target={prop.target} type="received" />
                        <ValueTd value={prop.expected} />
                        <ValueTd value={prop.total} />
                      </tr>
                    ))}

                    {/* Render non-property sub-items if no properties exist (e.g. Open set-up fees) */}
                    {!sub.properties && (
                      <tr style={{ background: "white" }}>
                        <DescriptionTd name={sub.name} level={2} />
                        <ValueTd value={sub.target} />
                        <ValueTd value={sub.received} target={sub.target} type="received" />
                        <ValueTd value={sub.expected} />
                        <ValueTd value={sub.total} />
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}

            {/* GRAND TOTAL ROW */}
            <tr style={{ background: "linear-gradient(to right, #0f172a, #1a2a44)", borderTop: "4px solid #ea580c" }}>
              <td style={{ padding: "6px 12px", textAlign: "left", fontWeight: 800, color: "white", fontSize: "14px", letterSpacing: "0.02em" }}>
                {data.total_inflow.name}
              </td>
              <ValueTd value={data.total_inflow.target} bold />
              <ValueTd value={data.total_inflow.received} bold type="received" />
              <ValueTd value={data.total_inflow.expected} bold />
              <td style={{ 
                padding: "6px 12px", 
                textAlign: "right", 
                fontWeight: 900, 
                color: "#ff8c00", // Theme Orange
                fontSize: "15px",
                fontFamily: "var(--font-geist-mono), monospace"
              }}>
                {formatCurrency(data.total_inflow.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: "32px 48px",
  maxWidth: "1200px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  minHeight: "100vh",
};
const thStyle: React.CSSProperties = { padding: "4px 8px", textAlign: "left", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" };
