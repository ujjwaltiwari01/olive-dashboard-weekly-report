/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { fetchKPI } from "../../lib/api";

const REFRESH = 60000;

function fmt(v: number) {
  return "₹" + Math.abs(v).toLocaleString("en-IN");
}

export default function CashflowPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetchKPI("cashflow");
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH);
    return () => clearInterval(t);
  }, [load]);

  if (loading)
    return <div style={pageStyle}><p style={{ color: "#6B7280" }}>Loading Cashflow Panel...</p></div>;
  if (!data || data.error)
    return <div style={pageStyle}><p>⚠️ Cannot load KPI data. {data?.error}</p></div>;

  const { inflows = [], account_balance = [], summary = {}, inflow_totals = {} } = data;

  const sumTarget   = (inflow_totals as any).target   || inflows.reduce((a: number, c: any) => a + (c.target   || 0), 0);
  const sumW1       = (inflow_totals as any).w1       || inflows.reduce((a: number, c: any) => a + (c.w1       || 0), 0);
  const sumW2       = (inflow_totals as any).w2       || inflows.reduce((a: number, c: any) => a + (c.w2       || 0), 0);
  const sumW3       = (inflow_totals as any).w3       || inflows.reduce((a: number, c: any) => a + (c.w3       || 0), 0);
  const sumW4       = (inflow_totals as any).w4       || inflows.reduce((a: number, c: any) => a + (c.w4       || 0), 0);
  const sumTotalReceived = (inflow_totals as any).total_received || inflows.reduce((a: number, c: any) => a + (c.total_received || c.received || 0), 0);
  const sumReceived = (inflow_totals as any).received || inflows.reduce((a: number, c: any) => a + (c.received || 0), 0);
  const sumExpected = (inflow_totals as any).expected || inflows.reduce((a: number, c: any) => a + (c.expected || 0), 0);

  const immediatePayments = summary.immediate_payments || 0;
  const totalOutflow    = summary.total_outflow   || 0;
  const currentBalance  = summary.current_balance || 0;
  const closingBalance  = summary.closing_balance || 0;
  const isPositive      = closingBalance >= 0;

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cf-header { animation: fadeInUp 0.4s ease both; }
        .cf-table  { opacity: 0; animation: fadeInUp 0.5s ease both 0.1s; }
        .cf-card   { opacity: 0; animation: fadeInUp 0.5s ease both; }
        .cf-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.09) !important;
          transform: translateY(-2px);
          transition: box-shadow 0.22s ease, transform 0.22s ease;
        }
        .recv-highlight { background: #FFF7ED; }
        .outflow-recv   { background: #FEE2E2; }
      `}</style>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
      <div
        className="cf-header"
        style={{ marginBottom: "28px", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px" }}
      >
        <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
          🏦 Cashflow Summary - April'26
        </h1>
      </div>

      {/* ── MERGED TABLE: INFLOW + OUTFLOW ──────────────────────────────────── */}
      <div className="cf-table" style={cardStyle}>
        <h3 style={sectionTitleStyle}>Inflow &amp; Outflow</h3>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "#F9FAFB" }}>
              <TH align="left" rowSpan={2}></TH>
              <TH rowSpan={2}>Target</TH>
              <TH highlight align="center" colSpan={5}>Received</TH>
              <TH rowSpan={2}>To be collected</TH>
            </tr>
            <tr style={{ background: "#F9FAFB" }}>
              <TH highlight>W1</TH>
              <TH highlight>W2</TH>
              <TH highlight>W3</TH>
              <TH highlight>W4</TH>
              <TH highlight>Total</TH>
            </tr>
          </thead>

          <tbody>
            {/* INFLOW HEADER ROW — no amounts, labels only */}
            <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
              <td style={{ ...tdStyle, fontWeight: 800, color: "#111827", textTransform: "uppercase" }}>Inflow</td>
              <td style={{ ...tdStyle }} />
              <td style={{ ...tdStyle }} />
              <td style={{ ...tdStyle }} />
              <td style={{ ...tdStyle }} />
              <td style={{ ...tdStyle }} />
              <td style={{ ...tdStyle }} />
              <td style={{ ...tdStyle }} />
            </tr>

            {inflows.map((inf: any, i: number) => (
              <tr key={i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ ...tdStyle, fontWeight: 600, color: "#374151" }}>{inf.type}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: "#6B7280" }}>
                  {fmt(inf.target)}
                </td>
                <td className="recv-highlight" style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#E4572E" }}>
                  {inf.w1 > 0 ? fmt(inf.w1) : ""}
                </td>
                <td className="recv-highlight" style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#E4572E" }}>
                  {inf.w2 > 0 ? fmt(inf.w2) : ""}
                </td>
                <td className="recv-highlight" style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#E4572E" }}>
                  {inf.w3 > 0 ? fmt(inf.w3) : ""}
                </td>
                <td className="recv-highlight" style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#E4572E" }}>
                  {inf.w4 > 0 ? fmt(inf.w4) : ""}
                </td>
                <td className="recv-highlight" style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: "#B45309" }}>
                  {(inf.total_received || inf.received || 0) > 0 ? fmt(inf.total_received || inf.received || 0) : ""}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", color: "#F97316" }}>
                  {inf.expected > 0 ? fmt(inf.expected) : ""}
                </td>
              </tr>
            ))}


            {/* GREEN TOTAL ROW (above Outflow) — no border */}
            <tr style={{ background: "#F0FDF4" }}>
              <td style={{ ...tdStyle, fontWeight: 800, color: "#15803D" }}>Total</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#15803D" }}>{fmt(sumTarget)}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#15803D" }}>{fmt(sumW1)}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#15803D" }}>{fmt(sumW2)}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#15803D" }}>{fmt(sumW3)}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#15803D" }}>{fmt(sumW4)}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: "#15803D" }}>{fmt(sumTotalReceived)}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#15803D" }}>{fmt(sumExpected)}</td>
            </tr>

            {/* OUTFLOW HEADER ROW — shows amount in To be collected col per Excel row 12 */}
            <tr style={{ background: "#FEF2F2", borderTop: "2px solid #FECACA", borderBottom: "1px solid #FECACA" }}>
              <td style={{ ...tdStyle, fontWeight: 800, color: "#991B1B", textTransform: "uppercase" }}>Outflow</td>
              <td style={{ ...tdStyle }} />
              <td colSpan={5} style={{ ...tdStyle }} />
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: "#DC2626" }}>{fmt(immediatePayments)}</td>
            </tr>


          </tbody>
        </table>
      </div>

      <div style={{ height: "20px" }} />

      {/* ── 3 CARDS ROW ─────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>


        {/* Card 1 — Current Bank Balance */}
        <div
          className="cf-card"
          style={{ ...cardStyle, borderLeft: "4px solid #1f2937", animationDelay: "0.2s" }}
        >
          <div style={cardLabelStyle}>Current Bank Balance</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#111827", marginTop: "10px", letterSpacing: "-0.5px" }}>
            {fmt(currentBalance)}
          </div>
        </div>


        {/* Card 2 — Account Balance */}
        <div
          className="cf-card"
          style={{ ...cardStyle, borderLeft: "4px solid #E4572E", animationDelay: "0.3s" }}
        >
          <div style={cardLabelStyle}>Account Balance</div>
          <table style={{ width: "100%", marginTop: "12px", borderCollapse: "collapse" }}>
            <tbody>
              {account_balance.map((s: any, i: number) => (
                <tr
                  key={i}
                  style={{ borderBottom: i < account_balance.length - 1 ? "1px solid #F3F4F6" : "none" }}
                >
                  <td style={{ padding: "7px 0", fontSize: "13px", color: "#374151" }}>{s.account}</td>
                  <td style={{ padding: "7px 0", fontSize: "13px", fontWeight: 700, textAlign: "right", color: "#111827" }}>
                    {fmt(s.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card 3 — Cash required (Expected outflow − current balance) */}
        <div
          className="cf-card"
          style={{
            ...cardStyle,
            borderLeft: `4px solid ${isPositive ? "#16a34a" : "#dc2626"}`,
            animationDelay: "0.4s",
          }}
        >
          <div style={cardLabelStyle}>Cash required (Expected outflow - current balance)</div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: isPositive ? "#16a34a" : "#dc2626",
              marginTop: "10px",
              letterSpacing: "-0.5px",
            }}
          >
            {isPositive ? "+" : "-"}{fmt(closingBalance)}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────────

function TH({
  children,
  align,
  highlight,
  colSpan,
  rowSpan,
}: {
  children?: React.ReactNode;
  align?: string;
  highlight?: boolean;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={{
        padding: "10px 14px",
        textAlign: (align as any) || "right",
        fontSize: "11px",
        fontWeight: 700,
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        borderBottom: "1px solid #E5E7EB",
        background: highlight ? "#FFF7ED" : undefined,
      }}
    >
      {children}
    </th>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = {
  padding: "24px 0",
  backgroundColor: "transparent",
  minHeight: "100vh",
};

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: "10px",
  padding: "22px",
  border: "1px solid #E5E7EB",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  transition: "box-shadow 0.22s ease, transform 0.22s ease",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const tdStyle: React.CSSProperties = { padding: "9px 14px" };

const cardLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  color: "#9CA3AF",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 14px 0",
  fontSize: "14px",
  fontWeight: 700,
  color: "#1A1A1A",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "2px solid #E4572E",
  paddingBottom: "4px",
  display: "inline-block",
};
