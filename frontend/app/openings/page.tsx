/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea
} from "recharts";
import { fetchKPI } from "../../lib/api";

const REFRESH = 60_000;
const RECENT_N = 6;

const COLORS = {
  Olive: "#1A1A1A",
  Open:  "#E4572E",
} as const;

const makeDot = (brand: "Olive" | "Open") => (props: any) => {
  const { cx, cy, value, payload } = props;
  if (cx == null || cy == null || value == null) return null;
  const isRecent = payload.isRecent;
  const r = isRecent ? 5 : 3;
  const strokeW = isRecent ? 2 : 1;
  let labelPos = "above";
  if (brand === "Olive") labelPos = "above";
  else if (brand === "Open") labelPos = payload.Open >= payload.Olive ? "above" : "below";
  const textY = labelPos === "above" ? cy - 18 : cy + 24;
  const color = COLORS[brand];
  return (
    <g style={{ pointerEvents: "none" }}>
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={strokeW} />
      {isRecent && (
        <text x={cx} y={textY} textAnchor="middle" fontSize={11} fontWeight={800} fill={color}>
          {value}
        </text>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload, activeBrand }: any) => {
  if (!active || !payload?.length || !activeBrand) return null;
  const p = payload.find((item: any) => item.name === activeBrand);
  if (!p) return null;
  const brand = p.name;
  const cumProps = p.payload[`${brand}_cum_props`] || 0;
  const color = COLORS[brand as keyof typeof COLORS] || p.color;
  return (
    <div style={{
      background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px",
      padding: "16px", fontSize: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", minWidth: "200px"
    }}>
      <div style={{ fontWeight: 800, color, marginBottom: "8px", textTransform: "uppercase", fontSize: "12px" }}>{brand}</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
        <span style={{ color: "#6B6B6B" }}>Cumulative Keys</span>
        <span style={{ fontWeight: 700, color: "#1A1A1A" }}>{p.value}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginTop: "4px" }}>
        <span style={{ color: "#6B6B6B" }}>Cumulative Properties</span>
        <span style={{ fontWeight: 700, color: "#1A1A1A" }}>{cumProps}</span>
      </div>
    </div>
  );
};

export default function OpeningsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await fetchKPI("openings");
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <Loading />;
  if (!data || data.error) return <div style={pageStyle}><p>⚠️ Cannot load KPI data. {data?.error}</p></div>;

  const totalCount  = data.trend_data?.length || 0;
  const recentCount = Math.min(RECENT_N, totalCount);
  const recentStart = totalCount - recentCount;

  let currentX = 0;
  const allData: any[] = (data.trend_data ?? []).map((m: any, idx: number) => {
    const isRecent = idx >= recentStart;
    const ptX = currentX;
    currentX += isRecent ? 3 : 1;
    return {
      month: m.month,
      xValue: ptX,
      isRecent,
      Olive: m.Olive,
      Open:  m.Open,
      Olive_cum_props: m.Olive_cum_props,
      Open_cum_props:  m.Open_cum_props,
    };
  });

  return (
    <div style={pageStyle}>
      <PageHeader title="Operational" />

      {/* ── OUTER COLUMN ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>

        {/* ── TOP ROW: Chart | Weekly Breakdown (same height via stretch) ── */}
        <div style={{ display: "flex", gap: "16px", alignItems: "stretch", width: "100%" }}>

          {/* ── KEY COUNT CHART ─────────────────────────────────────────── */}
          <div style={{ ...cardStyle, flex: "1 1 0%", minWidth: 0, display: "flex", flexDirection: "column", padding: "16px 20px" }}>
            <h3 style={{ ...cardHeaderStyle, fontSize: "14px", margin: "0 0 8px 0" }}>
              Key Count
              <span style={{ display: "block", height: "3px", width: "36px", background: "#E4572E", borderRadius: "2px", marginTop: "5px" }} />
            </h3>

            {/* Chart — flex:1 fills remaining card height naturally */}
            <div style={{ flex: 1, minHeight: "180px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={allData} margin={{ top: 24, right: 20, left: -10, bottom: 16 }}
                  onMouseLeave={() => setActiveBrand(null)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECECEC" />
                  <ReferenceArea
                    x1={allData[recentStart]?.xValue}
                    x2={allData[allData.length - 1]?.xValue}
                    fill="#FFFBF0" strokeOpacity={0}
                  />
                  <XAxis dataKey="xValue" type="number" domain={["dataMin", "dataMax"]}
                    ticks={allData.map(d => d.xValue)}
                    tickFormatter={(val) => { const item = allData.find(d => d.xValue === val); return item ? item.month : ""; }}
                    tick={{ fontSize: 10, fill: "#6B6B6B", fontWeight: 600 }}
                    axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={8}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#6B6B6B", fontWeight: 500 }}
                    axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dx={-4}
                  />
                  <RechartsTooltip content={<CustomTooltip activeBrand={activeBrand} />} shared={true}
                    cursor={{ stroke: "#E5E7EB", strokeWidth: 2, strokeDasharray: "4 4" }}
                  />
                  {(["Olive", "Open"] as const).map(brand => (
                    <Line key={`cap-${brand}`} type="monotone" dataKey={brand} stroke="transparent"
                      strokeWidth={30} dot={false} activeDot={false}
                      onMouseEnter={() => setActiveBrand(brand)} onMouseMove={() => setActiveBrand(brand)} connectNulls
                    />
                  ))}
                  <Line type="monotone" dataKey="Olive" name="Olive" stroke={COLORS.Olive} strokeWidth={2.5}
                    dot={makeDot("Olive")} activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff", fill: COLORS.Olive }}
                    onMouseEnter={() => setActiveBrand("Olive")} onMouseMove={() => setActiveBrand("Olive")}
                    connectNulls style={{ pointerEvents: "none" }}
                  />
                  <Line type="monotone" dataKey="Open" name="Open" stroke={COLORS.Open} strokeWidth={2.5}
                    dot={makeDot("Open")} activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff", fill: COLORS.Open }}
                    onMouseEnter={() => setActiveBrand("Open")} onMouseMove={() => setActiveBrand("Open")}
                    connectNulls style={{ pointerEvents: "none" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Round pill legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
              {([{ label: "Olive", color: "#1A1A1A" }, { label: "Open", color: "#E4572E" }]).map(({ label, color }) => (
                <span key={label} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "#F3F4F6", borderRadius: "999px",
                  padding: "4px 12px", fontSize: "11px", fontWeight: 700, color: "#374151"
                }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, display: "inline-block" }} />
                  {label}
                </span>
              ))}
            </div>

            {/* Totals below legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "20px" }}>
              <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "12px 16px", minWidth: "140px", flex: "1", maxWidth: "200px", textAlign: "left", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Properties</div>
                <div style={{ fontWeight: 800, color: "#1A1A1A", fontSize: "24px", lineHeight: 1 }}>
                  {data?.trend_data && data.trend_data.length > 0 
                    ? (data.trend_data[data.trend_data.length - 1].Olive_cum_props + data.trend_data[data.trend_data.length - 1].Open_cum_props).toLocaleString('en-IN') 
                    : 0}
                </div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "12px 16px", minWidth: "140px", flex: "1", maxWidth: "200px", textAlign: "left", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total Keys</div>
                <div style={{ fontWeight: 800, color: "#E4572E", fontSize: "24px", lineHeight: 1 }}>
                  {((data?.olive_total_keys ?? 0) + (data?.open_total_keys ?? 0)).toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>

          {/* ── WEEKLY BREAKDOWN ─────────────────────────────────────────── */}
          <div style={{ ...cardStyle, flex: "1.4 1 0%", display: "flex", flexDirection: "column", padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ ...cardHeaderStyle, fontSize: "16px" }}>
                Weekly Breakdown
                <span style={{ display: "block", height: "3px", width: "36px", background: "#E4572E", borderRadius: "2px", marginTop: "6px" }} />
              </h3>
              <span style={{ color: "#E4572E", fontWeight: 700, fontSize: "13px", letterSpacing: "0.3px" }}>
                {data?.current_month || "April - 2026"}
              </span>
            </div>

            {/* Inner white table container */}
            <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #EBEBEB", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <colgroup>
                  <col style={{ width: "32%" }} />
                  <col style={{ width: "13%", background: "#FFF4F1" }} />
                  <col /><col /><col /><col />
                  <col style={{ width: "11%", background: "#FFFBF0" }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid #EBEBEB" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Brand</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#E4572E", textTransform: "uppercase", letterSpacing: "0.5px", background: "#FFF4F1" }}>Mar &apos;26</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>W1</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>W2</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>W3</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>W4</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#E4572E", textTransform: "uppercase", letterSpacing: "0.5px", background: "#FFF4F1" }}>April &apos;26</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.brands?.map((brand: any) => (
                    <React.Fragment key={brand.name}>
                      {/* Properties row */}
                      <tr style={{ borderBottom: "1px solid #F7F7F7" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1A1A1A", fontSize: "13px" }}>{brand.name} <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: "11px" }}>— Props</span></td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#E4572E", background: "#FFF4F1", fontSize: "14px" }}>{brand.props.march26}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "#9CA3AF", fontWeight: 500 }}>{brand.props.w1}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "#9CA3AF", fontWeight: 500 }}>{brand.props.w2}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "#9CA3AF", fontWeight: 500 }}>{brand.props.w3}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "#9CA3AF", fontWeight: 500 }}>{brand.props.w4}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#E4572E", background: "#FFFBF0", fontSize: "14px" }}>{brand.props.total}</td>
                      </tr>
                      {/* Keys row */}
                      <tr style={{ borderBottom: "1px solid #EBEBEB" }}>
                        <td style={{ padding: "10px 14px 10px 24px", fontWeight: 500, color: "#6B7280", fontSize: "12px" }}>{brand.name} <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: "11px" }}>— Keys</span></td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#E4572E", background: "#FFF4F1", fontSize: "14px" }}>{brand.keys.march26}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "#9CA3AF", fontWeight: 500 }}>{brand.keys.w1}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "#9CA3AF", fontWeight: 500 }}>{brand.keys.w2}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "#9CA3AF", fontWeight: 500 }}>{brand.keys.w3}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "#9CA3AF", fontWeight: 500 }}>{brand.keys.w4}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#E4572E", background: "#FFFBF0", fontSize: "14px" }}>{brand.keys.total}</td>
                      </tr>
                    </React.Fragment>
                  ))}

                  {/* TOTAL — Properties */}
                  <tr style={{ borderTop: "2px solid #E4572E", background: "#FAFAFA" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 800, color: "#1A1A1A", fontSize: "13px" }}>Total <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: "11px" }}>— Props</span></td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 800, color: "#E4572E", background: "#FFF4F1", fontSize: "15px" }}>{data?.brands_totals?.props?.march26}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data?.brands_totals?.props?.w1}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data?.brands_totals?.props?.w2}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data?.brands_totals?.props?.w3}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data?.brands_totals?.props?.w4}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 800, color: "#E4572E", fontSize: "15px", background: "#FFF4F1" }}>{data?.brands_totals?.props?.total}</td>
                  </tr>
                  {/* TOTAL — Keys */}
                  <tr style={{ background: "#FAFAFA" }}>
                    <td style={{ padding: "12px 14px 12px 24px", fontWeight: 700, color: "#374151", fontSize: "13px" }}>Total <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: "11px" }}>— Keys</span></td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 800, color: "#E4572E", background: "#FFF4F1", fontSize: "15px" }}>{data?.brands_totals?.keys?.march26}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data?.brands_totals?.keys?.w1}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data?.brands_totals?.keys?.w2}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data?.brands_totals?.keys?.w3}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data?.brands_totals?.keys?.w4}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 800, color: "#E4572E", fontSize: "15px", background: "#FFF4F1" }}>{data?.brands_totals?.keys?.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>{/* end top row */}

        {/* ── APRIL'26 WIP CARD (restricted width) ─────────────────── */}
        <div style={{ ...cardStyle, padding: "14px 20px", maxWidth: "650px" }}>
          <h3 style={{ ...contextHeaderStyle, fontSize: "11px", marginBottom: "12px", color: "#E4572E" }}>April&apos;26 WIP — Olive</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                <th style={{ textAlign: "left", padding: "4px 10px", fontWeight: 700, fontSize: "11px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Property</th>
                <th style={{ textAlign: "center", padding: "4px 10px", fontWeight: 700, fontSize: "11px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Handover date</th>
              </tr>
            </thead>
            <tbody>
              {(data?.wip_properties ?? []).length > 0
                ? (data.wip_properties as any[]).map((prop: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "6px 10px", color: "#1A1A1A", fontWeight: 500 }}>
                        <span style={{ color: "#1A1A1A", marginRight: "6px", fontWeight: 800 }}>•</span>{prop.name}
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 500, color: "#6B7280" }}>{prop.target}</td>
                    </tr>
                  ))
                : (
                  /* Fallback when API has no wip_properties */
                  [{ name: "Nagavara (JC Reddy)", target: "April '26" },
                   { name: "Journalist colony (Hyd)", target: "April '26" },
                   { name: "VIP Road, Vizag (Venkata Savitri Ravisett)", target: "April '26" },
                   { name: "JP Nagar (Santosh)", target: "April '26" },
                   { name: "Hulimavu", target: "April '26" },
                   { name: "Guntur", target: "April '26" },
                  ].map((prop, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "6px 10px", color: "#1A1A1A", fontWeight: 500 }}>
                        <span style={{ color: "#1A1A1A", marginRight: "6px", fontWeight: 800 }}>•</span>{prop.name}
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 500, color: "#6B7280" }}>{prop.target}</td>
                    </tr>
                  ))
                )
              }
            </tbody>
          </table>
        </div>

      </div>{/* end outer column */}
    </div>
  );
}

// ─── STYLES & HELPERS ──────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  minHeight: "100vh",
  padding: "24px 0",
  margin: "0 auto",
  fontFamily: "'Inter', sans-serif",
};

const cardStyle: React.CSSProperties = {
  background: "#F8F9FA",
  borderRadius: "12px",
  padding: "24px",
  border: "1px solid #E5E7EB",
  boxShadow: "none",
};

const cardHeaderStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "20px",
  fontWeight: 700,
  color: "#1A1A1A",
  display: "inline-block",
};

const contextHeaderStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "15px",
  fontWeight: 800,
  color: "#9CA3AF",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

function PageHeader({ title }: { title: string }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1A1A1A", margin: 0 }}>{title}</h1>
    </div>
  );
}

function Th({ children, align = "center", style = {} }: { children: React.ReactNode; align?: "left" | "center" | "right"; style?: React.CSSProperties }) {
  return (
    <th style={{
      padding: "6px 12px",
      textAlign: align,
      fontSize: "11px",
      fontWeight: 700,
      color: "#9CA3AF",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      borderBottom: "2px solid #FFFFFF",
      ...style,
    }}>
      {children}
    </th>
  );
}

function Td({ children, bold, align = "center", style = {} }: {
  children?: React.ReactNode; bold?: boolean; align?: "left" | "center" | "right"; style?: React.CSSProperties;
}) {
  return (
    <td style={{
      padding: "4px 12px",
      textAlign: align,
      color: bold ? "#1A1A1A" : "#6B6B6B",
      fontWeight: bold ? 700 : 500,
      borderBottom: "1px solid #F3F4F6",
      ...style,
    }}>
      {children}
    </td>
  );
}

const listStyle: React.CSSProperties = { listStyleType: "none", padding: 0, margin: 0 };
const listItemStyle: React.CSSProperties = { padding: "8px 0", fontSize: "15px", color: "#1A1A1A", fontWeight: 500 };

function Loading() {
  return (
    <div style={{ ...pageStyle, display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
      <div style={{ fontSize: "16px", fontWeight: 600, color: "#9CA3AF" }}>Loading Exec View...</div>
    </div>
  );
}
