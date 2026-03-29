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
      <div style={{ fontWeight: 800, color: "#1A1A1A", fontSize: "16px", marginBottom: "4px" }}>
        {label}
      </div>
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

  // Gradient percentage breakpoint based on physical X coordinates, not generic index
  const startX = allData[0]?.xValue || 0;
  const endX = allData[allData.length - 1]?.xValue || 1;
  const recentStartX = allData[recentStart]?.xValue || 0;
  const gradPct = totalCount > recentCount ? ((recentStartX - startX) / (endX - startX)) * 100 : 0;

  return (
    <div style={pageStyle}>

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <PageHeader title="Signings Trend" />

      <div style={{ display: "flex", gap: "20px", alignItems: "stretch", maxWidth: "1050px", margin: "0 auto" }}>
        {/* ── TREND CHART ──────────────────────────────────────────────────── */}
        <div style={{ ...cardStyle, flex: "1 1 50%", minWidth: 0, display: "flex", flexDirection: "column", padding: "20px 24px" }}>

          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "12px" }}>
            <h3 style={{ ...cardHeaderStyle, fontSize: "15px" }}>Brand-wise</h3>
          </div>

          <div style={{ flex: 1, minHeight: "240px", width: "95%", margin: "0 auto" }}>
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
                tick={{ fontSize: 12, fill: "#6B6B6B", fontWeight: 600 }}
                axisLine={{ stroke: "#E5E7EB" }}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B6B6B", fontWeight: 500 }}
                axisLine={{ stroke: "#E5E7EB" }}
                tickLine={false}
                dx={-10}
              />

              {/* SHARED=TRUE: We get all data for the month, but purely filter on activeBrand */}
              <RechartsTooltip 
                content={<CustomTooltip activeBrand={activeBrand} />} 
                shared={true} 
              />

              <Legend
                wrapperStyle={{ fontSize: "13px", paddingTop: "32px", color: "#1A1A1A" }}
                iconType="circle"
              />

              {/* INVISIBLE CAPTURE LINES: Extra wide stroke for easy targeting */}
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

              <Line
                type="monotone"
                dataKey="Spark"
                name="Spark"
                stroke={COLORS.Spark}
                strokeWidth={3.5}
                dot={makeDot("Spark")}
                activeDot={{ r: 9, strokeWidth: 3, stroke: "#fff", fill: COLORS.Spark }}
                onMouseEnter={() => setActiveBrand("Spark")}
                onMouseMove={() => setActiveBrand("Spark")}
                connectNulls
                style={{ pointerEvents: "none" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── WEEKLY BREAKDOWN ─────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, flex: "1 1 50%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 style={cardHeaderStyle}>Weekly Breakdown</h3>
          <span style={{
            background: "#FFF4F1", color: "#E4572E",
            padding: "6px 16px", borderRadius: "20px",
            fontSize: "13px", fontWeight: 700,
            letterSpacing: "0.5px"
          }}>
            {data.current_month || "March - 2026"}
          </span>
        </div>

        <table style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: "#F9FAFB" }}>
              <Th align="left">Brand</Th>
              <Th>W1</Th><Th>W2</Th><Th>W3</Th><Th>W4</Th>
              <Th>Total</Th>
            </tr>
          </thead>
          <tbody>
            {data.brands?.map((b: any) => (
              <tr key={b.name} style={{ borderBottom: "1px solid #F3F4F6", backgroundColor: "white" }}>
                <Td bold align="left">{b.name}</Td>
                <Td>{b.w1}</Td><Td>{b.w2}</Td><Td>{b.w3}</Td><Td>{b.w4}</Td>
                <Td bold>{b.total}</Td>
              </tr>
            ))}
            {data.brands_totals && (
              <tr style={{ backgroundColor: "#FAFAFA", borderTop: "2px solid #E4572E" }}>
                <Td bold align="left">TOTAL</Td>
                <Td bold>{data.brands_totals.w1}</Td>
                <Td bold>{data.brands_totals.w2}</Td>
                <Td bold>{data.brands_totals.w3}</Td>
                <Td bold>{data.brands_totals.w4}</Td>
                <Td bold style={{ color: "#E4572E" }}>{data.brands_totals.total}</Td>
              </tr>
            )}
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
  borderRadius: "20px",
  padding: "32px",
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

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

function PageHeader({ title }: { title: string }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#1A1A1A", margin: 0 }}>{title}</h1>
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
