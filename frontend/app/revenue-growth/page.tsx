"use client";

import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { fetchKPI } from "../../lib/api";

export default function RevenueGrowthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPI("sales_yoy")
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={loadingStyle}>Syncing Revenue Growth...</div>;
  if (!data || data.error) return <div style={errorStyle}>Failed to load KPI 4 data.</div>;

  const chartData = data.chart_data || [];
  
  // Custom label renderer for absolute value + % inside segments
  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;
    if (!value || value === 0) return null;

    // Calculate total for this bar to find percentage
    const barData = chartData[index];
    const total = (barData["Walk-in"] || 0) + (barData["Online"] || 0) + (barData["Corporate"] || 0);
    const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;

    return (
      <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "12px", fontWeight: 700 }}>
        {`₹${value}L (${percentage}%)`}
      </text>
    );
  };

  return (
    <div style={pageStyle}>
      <div style={headerNavStyle}>
        <div>
          <h1 style={titleStyle}>KPI 4: Revenue Growth (YoY)</h1>
          <p style={subtitleStyle}>Year-over-Year comparison between March 2025 and March 2026</p>
        </div>
        <div style={yoyContainerStyle}>
          <span style={yoyLabelStyle}>YoY Growth</span>
          <span style={{ ...yoyValueStyle, color: data.yoy_pct >= 0 ? "#16A34A" : "#DC2626" }}>
            {data.yoy_pct >= 0 ? "+" : ""}{data.yoy_pct}%
          </span>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ height: "550px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }} barSize={100}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 13, fill: "#111827", fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} />
              <Tooltip cursor={{ fill: "#F9FAFB" }} contentStyle={tooltipStyle} />
              <Legend verticalAlign="top" align="left" wrapperStyle={{ paddingBottom: "30px", fontSize: "12px", fontWeight: 600 }} iconType="circle" />
              
              <Bar dataKey="Walk-in" stackId="b" fill="#E4572E">
                <LabelList dataKey="Walk-in" content={renderCustomLabel} />
              </Bar>
              <Bar dataKey="Online" stackId="b" fill="#111827">
                <LabelList dataKey="Online" content={renderCustomLabel} />
              </Bar>
              <Bar dataKey="Corporate" stackId="b" fill="#9CA3AF">
                <LabelList dataKey="Corporate" content={renderCustomLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={footerMetricsStyle}>
          <div style={metricBoxStyle}>
            <span style={metricLabelStyle}>March'25 Total Revenue</span>
            <span style={metricValueStyle}>₹{data.mar25_total} Lakhs</span>
          </div>
          <div style={metricBoxStyle}>
            <span style={metricLabelStyle}>March'26 Total Revenue</span>
            <span style={metricValueStyle}>₹{data.mar26_total} Lakhs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { padding: "40px", backgroundColor: "#F9FAFB", minHeight: "100vh" };
const headerNavStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" };
const titleStyle: React.CSSProperties = { fontSize: "24px", fontWeight: 800, color: "#111827", margin: 0 };
const subtitleStyle: React.CSSProperties = { fontSize: "14px", color: "#6B7280", marginTop: "4px" };
const cardStyle: React.CSSProperties = { backgroundColor: "#fff", padding: "32px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" };

const yoyContainerStyle: React.CSSProperties = { textAlign: "right" };
const yoyLabelStyle: React.CSSProperties = { display: "block", fontSize: "12px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 };
const yoyValueStyle: React.CSSProperties = { fontSize: "32px", fontWeight: 800 };

const footerMetricsStyle: React.CSSProperties = { display: "flex", gap: "48px", marginTop: "32px", paddingTop: "32px", borderTop: "1px solid #E5E7EB" };
const metricBoxStyle: React.CSSProperties = { display: "flex", flexDirection: "column" };
const metricLabelStyle: React.CSSProperties = { fontSize: "12px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" };
const metricValueStyle: React.CSSProperties = { fontSize: "24px", fontWeight: 800, color: "#111827" };

const tooltipStyle = { borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "13px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" };
const loadingStyle: React.CSSProperties = { padding: "40px", fontSize: "16px", color: "#6B7280" };
const errorStyle: React.CSSProperties = { padding: "40px", color: "#DC2626", fontWeight: 600 };
