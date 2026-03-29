/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";
import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea
} from "recharts";
import { fetchKPI } from "../../lib/api";

const REFRESH = 60_000;
const RECENT_N = 6; // Months to highlight with data labels

const COLORS = {
  Olive: "#1A1A1A",
  Open:  "#E4572E",
} as const;

// ─── CUSTOM DOT: dynamic positioning preventing label overlap ────────────
const makeDot = (brand: "Olive" | "Open") => (props: any) => {
  const { cx, cy, value, payload } = props;
  if (cx == null || cy == null || value == null) return null;

  const isRecent = payload.isRecent;
  const opacity  = 1;                   // Solid color everywhere
  const r        = isRecent ? 5 : 3;    // Consistent with Signings
  const strokeW  = isRecent ? 2 : 1;    // Restore the white stroke border for historical dots
  
  // Dynamic collision logic
  let labelPos = "above";
  if (brand === "Olive") {
    labelPos = "above";
  } else if (brand === "Open") {
    labelPos = payload.Open >= payload.Olive ? "above" : "below";
  }

  const textY = labelPos === "above" ? cy - 18 : cy + 24;
  const color = COLORS[brand];

  return (
    <g opacity={opacity} style={{ pointerEvents: "none" }}>
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={strokeW} />
      {isRecent && (
        <text
          x={cx} y={textY}
          textAnchor="middle"
          fontSize={11} fontWeight={800} // Smaller labels for professional look
          fill={color}
        >
          {value}
        </text>
      )}
    </g>
  );
};

// ─── CUSTOM TOOLTIP: Shows ONLY the targeted brand's metrics ─────────────────
const CustomTooltip = ({ active, payload, label, activeBrand }: any) => {
  if (!active || !payload?.length || !activeBrand) return null;
  
  // Find the exact payload item corresponding to the line the user is hovering
  const p = payload.find((item: any) => item.name === activeBrand);
  if (!p) return null;

  const brand = p.name;
  const cumProps = p.payload[`${brand}_cum_props`] || 0;
  const color = COLORS[brand as keyof typeof COLORS] || p.color;

  return (
    <div style={{
      background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px",
      padding: "16px", fontSize: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      minWidth: "220px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid #F3F4F6", paddingBottom: "8px" }}>
        <span style={{ fontWeight: 800, color: "#1A1A1A" }}>{label}</span>
        <span style={{ color, fontWeight: 700, textTransform: "uppercase", fontSize: "12px", letterSpacing: "1px" }}>{brand}</span>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6B6B6B", fontWeight: 500 }}>Cumulative Keys</span>
          <span style={{ color: "#1A1A1A", fontWeight: 800, fontSize: "16px" }}>{p.value}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6B6B6B", fontWeight: 500 }}>Cumulative Properties</span>
          <span style={{ color: "#1A1A1A", fontWeight: 800, fontSize: "16px" }}>{cumProps}</span>
        </div>
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

  // ── Build dataset with full properties and NEW CUMULATIVE Keys from Excel ──
  const totalCount    = data.trend_data?.length || 0;
  const recentCount   = Math.min(RECENT_N, totalCount);
  const recentStart   = totalCount - recentCount; 

  let currentX = 0;
  const allData: any[] = (data.trend_data ?? []).map((m: any, idx: number) => {
    const isRecent = idx >= recentStart;
    const ptX = currentX;
    
    // Slightly zoom out history (1 unit), zoom in recent (3 units spacing)
    currentX += isRecent ? 3 : 1;

    return {
      month: m.month,
      xValue: ptX,
      isRecent: isRecent,
      Olive: m.Olive,
      Open:  m.Open,
      Olive_cum_props: m.Olive_cum_props,
      Open_cum_props:  m.Open_cum_props,
    };
  });

  return (
    <div style={pageStyle}>

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <PageHeader title="Operational" />

      {/* ── ROW 1: TREND AND WEEKLY BREAKDOWN ──────────────────────────── */}
      <div style={{ display: "flex", gap: "20px", alignItems: "stretch", marginBottom: "16px", maxWidth: "1050px", margin: "0 auto" }}>
        
        {/* ── TREND CHART ──────────────────────────────────────────────────── */}
        <div style={{ ...cardStyle, flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", padding: "20px 24px" }}>

          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "12px" }}>
            <h3 style={{ ...cardHeaderStyle, fontSize: "15px" }}>Brand-wise</h3>
          </div>

          <div style={{ flex: 1, minHeight: "220px", width: "95%", margin: "0 auto" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={allData}
                margin={{ top: 30, right: 75, left: 10, bottom: 20 }}
                onMouseLeave={() => setActiveBrand(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECECEC" />

                <ReferenceArea
                  x1={allData[recentStart]?.xValue}
                  x2={allData[allData.length - 1]?.xValue}
                  fill="#FFFBF0"
                  strokeOpacity={0}
                />

                <XAxis
                  dataKey="xValue"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  ticks={allData.map(d => d.xValue)}
                  tickFormatter={(val) => {
                    const item = allData.find(d => d.xValue === val);
                    return item ? item.month : '';
                  }}
                  tick={{ fontSize: 13, fill: "#6B6B6B", fontWeight: 600 }}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tickLine={false}
                  dy={10}
                />
                
                <YAxis
                  tick={{ fontSize: 13, fill: "#6B6B6B", fontWeight: 500 }}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tickLine={false}
                  dx={-10}
                />

                {/* SHARED=TRUE: We get all data for the month, but purely filter on activeBrand */}
                <RechartsTooltip 
                  content={<CustomTooltip activeBrand={activeBrand} />} 
                  shared={true} 
                  cursor={{ stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '4 4' }}
                />

                {/* INVISIBLE CAPTURE LINES: Extra wide stroke for easy targeting */}
                {(["Olive", "Open"] as const).map((brand) => (
                  <Line
                    key={`capture-${brand}`}
                    type="monotone"
                    dataKey={brand}
                    stroke="transparent"
                    strokeWidth={30}
                    dot={false}
                    activeDot={false}
                    onMouseEnter={() => setActiveBrand(brand)}
                    onMouseMove={() => setActiveBrand(brand)}
                    connectNulls
                  />
                ))}

                <Line
                  type="monotone"
                  dataKey="Olive"
                  name="Olive"
                  stroke={COLORS.Olive}
                  strokeWidth={3.5}
                  dot={makeDot("Olive")}
                  activeDot={{ r: 9, strokeWidth: 3, stroke: "#fff", fill: COLORS.Olive }}
                  onMouseEnter={() => setActiveBrand("Olive")}
                  onMouseMove={() => setActiveBrand("Olive")}
                  connectNulls
                  style={{ pointerEvents: "none" }}
                />

                <Line
                  type="monotone"
                  dataKey="Open"
                  name="Open"
                  stroke={COLORS.Open}
                  strokeWidth={3.5}
                  dot={makeDot("Open")}
                  activeDot={{ r: 9, strokeWidth: 3, stroke: "#fff", fill: COLORS.Open }}
                  onMouseEnter={() => setActiveBrand("Open")}
                  onMouseMove={() => setActiveBrand("Open")}
                  connectNulls
                  style={{ pointerEvents: "none" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── GO-LIVE & WIP CONTEXT ───────────────────────────────── */}
        <div style={{ flex: "0 0 300px", display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden" }}>
          
          <div style={{ ...cardStyle, flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <h3 style={{ ...contextHeaderStyle, fontSize: "12px", marginBottom: "8px", color: "#E4572E" }}>March'26 Go-live</h3>
            <ul style={listStyle}>
              {["Hosa Road", "Urban Suites", "The Grand Vista Business Hotel", "The Botanica", "Mystic hotel", "Hilvon Business Hotel"].map((item, idx) => (
                <li key={idx} style={{ ...listItemStyle, fontSize: "12px", padding: "2px 0" }}>
                  <span style={{ color: "#E4572E", marginRight: "8px", fontWeight: 800 }}>•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ ...cardStyle, flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <h3 style={{ ...contextHeaderStyle, fontSize: "12px", marginBottom: "8px" }}>March'26 WIP</h3>
            <ul style={listStyle}>
              {["Nagavara", "Journalist colony", "VIP Road, Vizag", "JP Nagar", "Hulimavu", "Guntur"].map((item, idx) => (
                <li key={idx} style={{ ...listItemStyle, fontSize: "12px", padding: "2px 0" }}>
                  <span style={{ color: "#6B6B6B", marginRight: "8px", fontWeight: 800 }}>•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── ROW 2: WEEKLY BREAKDOWN (CENTERED) ─────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <div style={{ ...cardStyle, width: "100%", maxWidth: "850px", display: "flex", flexDirection: "column", padding: "16px 24px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={cardHeaderStyle}>Weekly Breakdown</h3>
            <span style={{
              background: "#FFF4F1", color: "#E4572E",
              padding: "6px 16px", borderRadius: "20px",
              fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.5px"
            }}>
              March - 2026
            </span>
          </div>

          <table style={tableStyle}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                <Th align="left">Brand</Th>
                <Th>W1</Th>
                <Th>W2</Th>
                <Th>W3</Th>
                <Th>W4</Th>
                <Th>Total</Th>
              </tr>
            </thead>
            <tbody>
              {/* Open: 3, 0, 0, 2, 5 */}
              <tr style={{ borderBottom: "1px solid #F3F4F6", transition: "background 0.2s" }} onMouseOver={e => (e.currentTarget.style.background = "#F9FAFB")} onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                <Td bold align="left">Open</Td>
                <Td>3</Td>
                <Td>0</Td>
                <Td>0</Td>
                <Td>2</Td>
                <Td bold style={{ color: "#E4572E" }}>5</Td>
              </tr>
              {/* Olive: 0, 0, 0, 0, 0 */}
              <tr style={{ borderBottom: "1px solid #F3F4F6", transition: "background 0.2s" }} onMouseOver={e => (e.currentTarget.style.background = "#F9FAFB")} onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                <Td bold align="left">Olive</Td>
                <Td>0</Td>
                <Td>0</Td>
                <Td>0</Td>
                <Td>0</Td>
                <Td bold style={{ color: "#E4572E" }}>0</Td>
              </tr>
              {/* TOTAL */}
              <tr style={{ background: "#FAFAFA", borderTop: "2px solid #E4572E" }}>
                <Td bold align="left">TOTAL</Td>
                <Td bold>3</Td>
                <Td bold>0</Td>
                <Td bold>0</Td>
                <Td bold>2</Td>
                <Td bold style={{ color: "#E4572E", fontSize: "16px" }}>5</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}

// ─── STYLES & HELPERS ──────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  padding: "12px 24px",
  maxWidth: "1400px",
  margin: "0 auto",
  backgroundColor: "#FFFFFF",
  minHeight: "100vh",
};

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: "16px",
  padding: "24px",
  border: "1px solid #F3F4F6",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
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

function Th({ children, align = "center" }: { children: React.ReactNode; align?: "left" | "center" | "right" }) {
  return (
    <th style={{
      padding: "16px 12px",
      textAlign: align,
      fontSize: "12px",
      fontWeight: 700,
      color: "#9CA3AF",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      borderBottom: "1px solid #F3F4F6",
    }}>
      {children}
    </th>
  );
}

function Td({ children, bold, align = "center", style = {} }: { children: React.ReactNode; bold?: boolean; align?: "left" | "center" | "right", style?: React.CSSProperties }) {
  return (
    <td style={{
      padding: "6px 12px",
      textAlign: align,
      color: bold ? "#1A1A1A" : "#6B6B6B",
      fontWeight: bold ? 700 : 500,
      borderBottom: "1px solid #F9FAFB",
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
