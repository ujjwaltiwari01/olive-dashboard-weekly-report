/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, LabelList,
} from "recharts";
import { fetchKPI } from "../../lib/api";

const REFRESH = 60000;

function toL(val: number) {
  return `₹${(val / 100_000).toFixed(0)}L`;
}

// ─── % only — rendered INSIDE segment ──────────────────────────────────────────
function PctLabel(props: any) {
  const { x, y, width, height, value, pct } = props;
  if (!value || height < 28) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ fontSize: "14px", fontWeight: 700, fill: "#fff" }}
    >
      {pct}%
    </text>
  );
}

// ─── ₹ amount — rendered to the RIGHT of the segment ───────────────────────────
function AmountLabel(props: any) {
  const { x, y, width, height, value, amount } = props;
  if (!value || height < 20) return null;
  return (
    <text
      x={x + width + 12}
      y={y + height / 2}
      textAnchor="start"
      dominantBaseline="middle"
      style={{ fontSize: "12px", fontWeight: 700, fill: "#374151" }}
    >
      {amount}
    </text>
  );
}

// ─── STACKED SECTION ────────────────────────────────────────────────────────────
function StackedSection({
  title, overallPct, badgeColor, onlinePct, offlinePct, bars, delay = 0,
}: {
  title: string;
  overallPct: number;
  badgeColor: string;
  onlinePct: number;
  offlinePct: number;
  bars: {
    name: string;
    online: number;
    offline: number;
    total: number;
    online_pct: number;
    offline_pct: number;
  }[];
  delay?: number;
}) {
  const chartData = bars.map((b) => ({
    name: b.name,
    Online:      b.online,
    Offline:     b.offline,
    total:       b.total,
    online_pct:  b.online_pct,
    offline_pct: b.offline_pct,
  }));

  return (
    <div
      className="rc-card"
      style={{ ...cardStyle, animationDelay: `${delay}ms` }}
    >
      {/* Card header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={cardHeaderStyle}>{title}</h3>

        {/* Badges: Online % | Offline % | Overall */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Online % pill */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "4px 14px", minWidth: "72px" }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Online</span>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "#374151" }}>{onlinePct}%</span>
          </div>
          {/* Offline % pill */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#FFF4F1", border: "1px solid #FECAB4", borderRadius: "8px", padding: "4px 14px", minWidth: "72px" }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#E4572E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Offline</span>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "#E4572E" }}>{offlinePct}%</span>
          </div>
          {/* Overall pill */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "4px 14px", minWidth: "72px" }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Overall</span>
            <span style={{ fontSize: "16px", fontWeight: 800, color: badgeColor }}>{overallPct}%</span>
          </div>
        </div>
      </div>

      {/* Chart — right margin expanded to accommodate amount labels */}
      <div style={{ height: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 80, left: 0, bottom: 0 }}
            barSize={88}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 13, fontWeight: 700, fill: "#374151" }}
              axisLine={false} tickLine={false}
            />
            <YAxis hide />

            {/* ── Offline (orange) — bottom ── */}
            <Bar
              dataKey="Offline"
              stackId="a"
              fill="#E4572E"
              radius={[0, 0, 4, 4]}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            >
              {/* % inside */}
              <LabelList dataKey="Offline" content={(props: any) => (
                <PctLabel {...props} pct={chartData[props.index]?.offline_pct} />
              )} />
              {/* ₹ amount right */}
              <LabelList dataKey="Offline" content={(props: any) => (
                <AmountLabel {...props} amount={toL(chartData[props.index]?.Offline ?? 0)} />
              )} />
            </Bar>

            {/* ── Online (grey) — top ── */}
            <Bar
              dataKey="Online"
              stackId="a"
              fill="#9CA3AF"
              radius={[4, 4, 0, 0]}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            >
              {/* % inside */}
              <LabelList dataKey="Online" content={(props: any) => (
                <PctLabel {...props} pct={chartData[props.index]?.online_pct} />
              )} />
              {/* ₹ amount right */}
              <LabelList dataKey="Online" content={(props: any) => (
                <AmountLabel {...props} amount={toL(chartData[props.index]?.Online ?? 0)} />
              )} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer totals + legend */}
      <div style={{
        display: "flex", gap: "32px", marginTop: "16px",
        paddingTop: "16px", borderTop: "1px solid #E5E7EB", alignItems: "flex-end",
      }}>
        {bars.map((b) => (
          <div key={b.name}>
            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {b.name}
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>
              {toL(b.total)}
            </div>
          </div>
        ))}
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ display: "flex", gap: "14px", justifyContent: "flex-end" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#4B5563" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#9CA3AF", display: "inline-block" }} />
              Online
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#4B5563" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#E4572E", display: "inline-block" }} />
              Offline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────
export default function RevenueCompositionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await fetchKPI("revenue_composition");
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH);
    return () => clearInterval(t);
  }, [load]);

  if (loading)
    return <div style={pageStyle}><p style={{ color: "#6B7280" }}>Loading Revenue MIS...</p></div>;
  if (!data || data.error)
    return <div style={pageStyle}><p>⚠️ Cannot load KPI data.</p></div>;

  return (
    <div style={pageStyle}>
      {/* Keyframe animations injected inline */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rc-header {
          animation: fadeInUp 0.45s ease both;
        }
        .rc-card {
          opacity: 0;
          animation: fadeInUp 0.55s ease both;
        }
        .rc-card:hover {
          box-shadow: 0 6px 24px rgba(0,0,0,0.08) !important;
          transform: translateY(-2px);
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }
      `}</style>

      {/* Page header */}
      <div
        className="rc-header"
        style={{ marginBottom: "32px", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px" }}
      >
        <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>
          Revenue Composition — 1 April&apos;26 to 12 April&apos;26
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "#9CA3AF", fontWeight: 500 }}>Same period comparison</p>
      </div>

      {/* Block 1 */}
      <StackedSection
        title="Target vs Actual"
        overallPct={data.section1.achievement_pct}
        badgeColor={data.section1.achievement_pct >= 90 ? "#16a34a" : data.section1.achievement_pct >= 75 ? "#d97706" : "#dc2626"}
        onlinePct={data.section1.achievement_online_pct}
        offlinePct={data.section1.achievement_offline_pct}
        bars={data.section1.bars}
        delay={120}
      />
      <div style={{ height: "24px" }} />

      {/* Block 2 */}
      <StackedSection
        title="YoY Growth"
        overallPct={data.section2.yoy_pct}
        badgeColor="#16a34a"
        onlinePct={data.section2.yoy_online_pct}
        offlinePct={data.section2.yoy_offline_pct}
        bars={data.section2.bars}
        delay={260}
      />
    </div>
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
  borderRadius: "12px",
  padding: "28px",
  border: "1px solid #E5E7EB",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  transition: "box-shadow 0.25s ease, transform 0.25s ease",
};

const cardHeaderStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 600,
  color: "#111827",
  borderBottom: "2px solid #E4572E",
  paddingBottom: "4px",
  display: "inline-block",
};
