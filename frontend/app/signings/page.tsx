/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";
import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  ReferenceArea,
} from "recharts";
import { fetchKPI } from "../../lib/api";

const REFRESH = 60_000;
const RECENT_N = 6; // Months to highlight with data labels

const COLORS = {
  Olive: "#1A1A1A",
  Open:  "#E4572E",
  Spark: "#9CA3AF",
} as const;

// ─── CUSTOM DOT: dynamic positioning preventing label overlap ────────────
const makeDot = (
  brand: "Olive" | "Open" | "Spark"
) => (props: any) => {
  const { cx, cy, value, payload } = props;
  if (cx == null || cy == null || value == null) return null;

  const isRecent = payload.isRecent;
  const opacity  = 1;                   // Solid color everywhere
  const r        = isRecent ? 5 : 3;    // Make them slightly larger so they are easy to see
  const strokeW  = isRecent ? 2 : 1;    // Restore the white stroke border for historical dots
  
  // Dynamic collision logic (Olive is always top. Open & Spark cross over)
  let labelPos = "above";
  if (brand === "Olive") {
    labelPos = "above";
  } else if (brand === "Open") {
    labelPos = payload.Open >= payload.Spark ? "above" : "below";
  } else if (brand === "Spark") {
    labelPos = payload.Spark > payload.Open ? "above" : "below";
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
          fontSize={11} fontWeight={800} // Bolder, larger labels for focus
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
  const cumKeys = p.payload[`${brand}_cum_keys`] || 0;
  const color = COLORS[brand as keyof typeof COLORS] || p.color;

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${color}`,
      borderRadius: "12px",
      padding: "14px 18px",
      fontSize: "13px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
      minWidth: "180px",
    }}>

      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "8px", 
        marginBottom: "12px",
        paddingBottom: "8px",
        borderBottom: "1px solid #F3F4F6"
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
        <span style={{ fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px" }}>{brand}</span>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <span style={{ color: "#6B6B6B", fontWeight: 500 }}>Cumulative Property</span>
          <span style={{ color: color, fontWeight: 800 }}>{p.value}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <span style={{ color: "#6B6B6B", fontWeight: 500 }}>Cumulative Keys</span>
          <span style={{ color: color, fontWeight: 800 }}>{cumKeys}</span>
        </div>
      </div>
    </div>
  );
};

// ─── PAGE ──────────────────────────────────────────────────────────────────────
export default function SigningsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await fetchKPI("signings");
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <Loading />;
  if (!data || data.error)
    return <div style={pageStyle}><p>⚠️ Cannot load KPI data. {data?.error}</p></div>;

  // ── Build dataset with full properties and NEW CUMULATIVE Keys from Excel ──
  const totalCount    = data.monthly_totals?.length || 0;
  const recentCount   = Math.min(RECENT_N, totalCount);
  const recentStart   = totalCount - recentCount; 

  let currentX = 0;
  const allData: any[] = (data.monthly_totals ?? []).map((m: any, idx: number) => {
    const isRecent = idx >= recentStart;
    const ptX = currentX;
    
    // Slightly zoom out history (1 unit), zoom in recent (3 units spacing)
    currentX += isRecent ? 3 : 1;

    return {
      month: m.month,
      xValue: ptX,
      isRecent: isRecent,
      Olive: m.Olive_props,
      Open:  m.Open_props,
      Spark: m.Spark_props,
      Olive_cum_keys: m.Olive_cum_keys,
      Open_cum_keys:  m.Open_cum_keys,
      Spark_cum_keys: m.Spark_cum_keys,
    };
  });

  return (
    <div style={pageStyle}>
      <PageHeader title={
        <>Signings Trend <span style={{ color: "#9CA3AF", fontWeight: 600 }}>(Incl. LOI)</span></>
      } />

      <div style={{
        display: "flex", 
        gap: "24px", 
        alignItems: "stretch", 
        maxWidth: "1150px", 
        width: "100%", 
        margin: "24px auto 0", 
      }}>
        {/* ── TREND CHART ───────────────────────────────────────────── */}
        <div style={{ ...cardStyle, flex: "1 1 0%", minWidth: 0, padding: "24px" }}>
            <div style={cardLabelContainerStyle}>
              <h3 style={cardHeaderStyle}>
                No. of properties
                <span style={{ display: "block", height: "3px", width: "40px", background: "#E4572E", borderRadius: "2px", marginTop: "6px" }} />
              </h3>
            </div>

            <div style={{ height: "340px", width: "100%", marginTop: "12px" }}>
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={allData}
                    margin={{ top: 30, right: 30, left: 0, bottom: 20 }}
                    onMouseLeave={() => setActiveBrand(null)}
                  >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

                  <ReferenceArea
                    x1={allData[recentStart]?.xValue}
                    x2={allData[allData.length - 1]?.xValue}
                    fill="#F8FAFC"
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
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                    dy={12}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                    dx={-10}
                  />

                  <RechartsTooltip 
                    content={<CustomTooltip activeBrand={activeBrand} />} 
                    shared={true} 
                  />

                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", paddingTop: "32px", fontWeight: 600, color: "#475569" }}
                  />

                  {(["Olive", "Open", "Spark"] as const).map((brand) => (
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
                    strokeWidth={3}
                    dot={makeDot("Olive")}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff", fill: COLORS.Olive }}
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
                    strokeWidth={3}
                    dot={makeDot("Open")}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff", fill: COLORS.Open }}
                    onMouseEnter={() => setActiveBrand("Open")}
                    onMouseMove={() => setActiveBrand("Open")}
                    connectNulls
                    style={{ pointerEvents: "none" }}
                  />

                  <Line
                    type="monotone"
                    dataKey="Spark"
                    name="Spark"
                    stroke={COLORS.Spark}
                    strokeWidth={3}
                    dot={makeDot("Spark")}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff", fill: COLORS.Spark }}
                    onMouseEnter={() => setActiveBrand("Spark")}
                    onMouseMove={() => setActiveBrand("Spark")}
                    connectNulls
                    style={{ pointerEvents: "none" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── TOTALS STRIP ───────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <div style={{
                flex: 1,
                background: "#FFFFFF",
                borderRadius: "10px",
                padding: "12px 18px",
                border: "1px solid #E5E7EB",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Total Properties
                </div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.5px" }}>
                  {data.total_properties ?? 0}
                </div>
              </div>
              <div style={{
                flex: 1,
                background: "#FFFFFF",
                borderRadius: "10px",
                padding: "12px 18px",
                border: "1px solid #E5E7EB",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Total Keys
                </div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#E4572E", letterSpacing: "-0.5px" }}>
                  {data.total_keys ?? 0}
                </div>
              </div>
            </div>


          </div>

          {/* ── WEEKLY BREAKDOWN ───────────────────────────────────────── */}
          <div style={{
            flex: "1.2 1 0%",
            background: "#F8F9FA",
            borderRadius: "12px",
            border: "1px solid #E5E7EB",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            {/* Header: title and badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={cardHeaderStyle}>
                Weekly Breakdown
                <span style={{ display: "block", height: "3px", width: "40px", background: "#E4572E", borderRadius: "2px", marginTop: "6px" }} />
              </h3>
              <span style={{
                background: "#FFF4F1", color: "#E4572E",
                padding: "5px 14px", borderRadius: "20px",
                fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px"
              }}>
                {data.current_month || "March - 2026"}
              </span>
            </div>

            {/* Inner white panel - Moved up by removing flex:1 */}
            <div style={{
              background: "#FFFFFF",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left",   fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Brand</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#E4572E", textTransform: "uppercase", letterSpacing: "0.5px", background: "#FFF4F1" }}>Mar '26</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>W1</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>W2</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>W3</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>W4</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.brands?.map((b: any) => (
                    <tr key={b.name} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "10px 12px", textAlign: "left",   fontWeight: 600, color: "#1A1A1A", fontSize: "13px" }}>{b.name}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#E4572E", fontWeight: 700, background: "#FFFBF0" }}>{b.prev_month}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#6B7280" }}>{b.w1}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#6B7280" }}>{b.w2}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#6B7280" }}>{b.w3}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "#6B7280" }}>{b.w4}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{b.total}</td>
                    </tr>
                  ))}
                  {data.brands_totals && (
                    <tr style={{ borderTop: "2px solid #E4572E", background: "#FFFFFF" }}>
                      <td style={{ padding: "10px 12px", textAlign: "left",   fontWeight: 800, color: "#1A1A1A" }}>TOTAL</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, color: "#E4572E", background: "#FFF4F1" }}>{data.brands_totals.prev_month}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data.brands_totals.w1}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data.brands_totals.w2}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data.brands_totals.w3}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#1A1A1A" }}>{data.brands_totals.w4}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, color: "#E4572E", fontSize: "15px" }}>{data.brands_totals.total}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── PORTFOLIO UPDATE ───────────────────────────────────────── */}
            <div style={{
              background: "#FFFFFF",
              borderRadius: "8px",
              padding: "16px 20px",
              border: "1px solid #E5E7EB",
              marginTop: "auto",
            }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 800, color: "#1A1A1A" }}>Portfolio Update:</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: "12.5px", color: "#4B5563", lineHeight: "1.6" }}>
                <li style={{ marginBottom: "8px", display: "flex", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "#E4572E" }}>1.</span>
                  <span>Spark Indore: A Letter of Intent (LOI) was executed on March 30th.</span>
                </li>
                <li style={{ display: "flex", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: "#E4572E" }}>2.</span>
                  <span>Sadahalli, Bangalore: The property has been formally converted from the Olive brand to Spark.</span>
                </li>
              </ul>
            </div>
          </div>
      </div>
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
  display: "flex",
  flexDirection: "column",
};

const cardLabelContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
};

const cardHeaderStyle: React.CSSProperties = {
  margin: "0",
  fontSize: "20px",
  fontWeight: 700,
  color: "#1A1A1A",
  display: "inline-block",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

function PageHeader({ title }: { title: React.ReactNode }) {
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
      borderBottom: "2px solid #FFFFFF",
    }}>
      {children}
    </th>
  );
}

function Td({
  children, bold, align = "center", style = {},
}: {
  children: React.ReactNode;
  bold?: boolean;
  align?: "left" | "center" | "right";
  style?: React.CSSProperties;
}) {
  return (
    <td style={{
      padding: "10px 12px",
      textAlign: align,
      color: bold ? "#1A1A1A" : "#6B6B6B",
      fontWeight: bold ? 700 : 500,
      borderBottom: "2px solid #FFFFFF",
      ...style,
    }}>
      {children}
    </td>
  );
}

function Loading() {
  return (
    <div style={{
      ...pageStyle,
      color: "#6B6B6B",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "50vh",
    }}>
      <div style={{ fontSize: "16px", fontWeight: 500 }}>Loading Executive View...</div>
    </div>
  );
}
