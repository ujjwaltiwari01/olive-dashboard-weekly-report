/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, LabelList,
  useXAxisScale, useYAxisScale,
} from "recharts";
import { fetchKPI } from "../../lib/api";

const REFRESH = 60000;

function toL(val: number) {
  return `₹${(val / 100_000).toFixed(0)}L`;
}

/** Lakh formatter that keeps one decimal for small values (<10L) so e.g. ₹32,945 reads as ₹0.3L
 * instead of being rounded to ₹0L by `toL`. Used for the franchised Open side label. */
function toLPrecise(val: number) {
  const l = (val || 0) / 100_000;
  if (Math.abs(l) >= 10) return `₹${l.toFixed(0)}L`;
  if (Math.abs(l) >= 1) return `₹${l.toFixed(1)}L`;
  return `₹${l.toFixed(2)}L`;
}

/** Turn bars field into an array (handles array, null, or { "0": row, "1": row } from some serializers). */
function coerceBarsArray(barsRaw: unknown): any[] {
  if (Array.isArray(barsRaw)) return barsRaw;
  if (barsRaw == null || typeof barsRaw !== "object") return [];
  const o = barsRaw as Record<string, unknown>;
  const keys = Object.keys(o);
  if (!keys.length) return [];
  const numericKeys = keys.filter((k) => /^\d+$/.test(k));
  if (numericKeys.length === keys.length) {
    return numericKeys
      .map((k) => Number(k))
      .sort((a, b) => a - b)
      .map((k) => o[String(k)]);
  }
  return [];
}

/** Map legacy API shapes (online/offline, old section3) to what the charts expect. */
function normalizeRevenueCompositionPayload(raw: any) {
  if (!raw || raw.error) return raw;
  const rawS3 = raw.section3 ?? raw.Section3;
  // Only `section3.bars` (from Revenue sheet / v2 workbook API) — do not merge other keys.
  const s3BarsSource = rawS3?.bars;
  const section3WithBars = rawS3
    ? { ...rawS3, bars: coerceBarsArray(s3BarsSource) }
    : raw.section3;

  const out = {
    ...raw,
    section2: raw.section2 ? { ...raw.section2, bars: [...(raw.section2.bars || [])] } : raw.section2,
    section3: section3WithBars,
  };
  const s2 = out.section2;
  const b0 = s2?.bars?.[0];
  if (b0 && b0.short_stay == null && b0.online != null) {
    s2.bars = s2.bars.map((b: any) => ({
      name: b.name,
      short_stay: Number(b.online) || 0,
      long_stay: Number(b.offline) || 0,
      total: Number(b.total) || 0,
      short_stay_pct: Number(b.online_pct) || 0,
      long_stay_pct: Number(b.offline_pct) || 0,
    }));
    if (s2.yoy_short_stay_pct == null && s2.yoy_online_pct != null) {
      s2.yoy_short_stay_pct = s2.yoy_online_pct;
      s2.yoy_long_stay_pct = s2.yoy_offline_pct;
    }
  }
  const s3 = out.section3;
  if (s3 && Array.isArray(s3.bars) && s3.bars.length > 0) {
    const toN = (a: unknown, b?: unknown) => {
      const x = a ?? b;
      const n = Number(x);
      return Number.isFinite(n) ? n : 0;
    };
    s3.bars = s3.bars
      .filter((b: any) => b != null && typeof b === "object")
      .map((b: any) => {
        const fr_open = Math.round(toN(b.fr_open, b.open));
        const fr_others = Math.round(toN(b.fr_others, b.others));
        let total = Math.round(toN(b.total));
        if (total <= 0) total = fr_open + fr_others;
        const t = total > 0 ? total : 1;
        const fr_open_pct =
          b.fr_open_pct != null || b.open_pct != null
            ? Math.round(toN(b.fr_open_pct, b.open_pct))
            : Math.round((fr_open / t) * 100);
        const fr_others_pct =
          b.fr_others_pct != null || b.others_pct != null
            ? Math.round(toN(b.fr_others_pct, b.others_pct))
            : Math.round((fr_others / t) * 100);
        return {
          name: String(b.name ?? ""),
          fr_open,
          fr_others,
          total,
          fr_open_pct,
          fr_others_pct,
        };
      });
    if (s3.mom_open_pct == null && s3.momOpenPct != null) s3.mom_open_pct = s3.momOpenPct;
    if (s3.mom_others_pct == null && s3.momOthersPct != null) s3.mom_others_pct = s3.momOthersPct;
    if (s3.mom_total_pct == null && s3.momTotalPct != null) s3.mom_total_pct = s3.momTotalPct;

    // Revenue sheet franchised MoM is always Feb → March → April (part); never YoY "March 25/26" labels.
    if (s3.bars.length === 3) {
      const canon = ["Feb", "March", "April (part)"];
      s3.bars = s3.bars.map((b: any, i: number) => ({ ...b, name: canon[i] ?? b.name }));
    }
  }
  return out;
}

function pctPill(v: unknown) {
  if (v == null || v === "" || Number.isNaN(Number(v))) return "—";
  return `${Number(v)}`;
}

function momPillText(v: unknown) {
  if (v == null || v === "" || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function PctLabel(props: any) {
  const { x, y, width, height, value, pct } = props;
  const v = Number(value);
  const h = Number(height);
  if (value == null || Number.isNaN(v) || v === 0 || Number.isNaN(h) || h < 10) return null;
  const p = pct != null && !Number.isNaN(Number(pct)) ? pct : "—";
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ fontSize: "14px", fontWeight: 700, fill: "#fff" }}
    >
      {p}%
    </text>
  );
}

function AmountLabel(props: any) {
  const { x, y, width, height, value, amount } = props;
  const v = Number(value);
  const h = Number(height);
  if (value == null || Number.isNaN(v) || v === 0 || Number.isNaN(h) || h < 8) return null;
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

/** Side-label for the (very small) franchised "Open" slice.
 * The Open slice is only 1–4% of each bar, so the regular inside-bar PctLabel/AmountLabel
 * height guards strip it. This label sits to the right of the bar, anchored at the slice top,
 * and always renders so the user can read both the Open amount and percentage. */
function FrOpenSideLabel(props: any) {
  const { x, y, width, height, value, amount, pct } = props;
  const v = Number(value);
  if (value == null || Number.isNaN(v) || v <= 0) return null;
  const h = Number.isFinite(Number(height)) ? Number(height) : 0;
  const ty = y + Math.max(6, h / 2);
  const cx = x + width + 10;
  return (
    <g pointerEvents="none">
      <text
        x={cx}
        y={ty}
        textAnchor="start"
        dominantBaseline="middle"
        style={{ fontSize: "11px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
      >
        <tspan style={{ fill: "#64748B", fontWeight: 700, letterSpacing: "0.04em" }}>Open</tspan>
        <tspan dx={6} style={{ fill: "#1F2937", fontWeight: 800 }}>{amount}</tspan>
        <tspan dx={4} style={{ fill: "#9CA3AF", fontWeight: 600 }}>· {pct}%</tspan>
      </text>
    </g>
  );
}

/** Section 1 — Online / Offline (managed) */
function StackedSectionOnlineOffline({
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
    Online: b.online,
    Offline: b.offline,
    total: b.total,
    online_pct: b.online_pct,
    offline_pct: b.offline_pct,
  }));

  return (
    <div className="rc-card" style={{ ...cardStyle, animationDelay: `${delay}ms` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <h3 style={cardHeaderStyle}>{title}</h3>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", letterSpacing: "0.04em" }}>Growth rates</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "4px 14px", minWidth: "72px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Online</span>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#374151" }}>{onlinePct}%</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#FFF4F1", border: "1px solid #FECAB4", borderRadius: "8px", padding: "4px 14px", minWidth: "72px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#E4572E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Offline</span>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#E4572E" }}>{offlinePct}%</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "4px 14px", minWidth: "72px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Overall</span>
              <span style={{ fontSize: "16px", fontWeight: 800, color: badgeColor }}>{overallPct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: "100%", minWidth: 0, height: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 80, left: 0, bottom: 0 }} barSize={88}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 700, fill: "#374151" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Bar dataKey="Offline" stackId="a" fill="#E4572E" radius={[0, 0, 4, 4]} minPointSize={2} isAnimationActive animationDuration={800} animationEasing="ease-out">
              <LabelList dataKey="Offline" content={(props: any) => (
                <PctLabel {...props} pct={chartData[props.index]?.offline_pct} />
              )} />
              <LabelList dataKey="Offline" content={(props: any) => (
                <AmountLabel {...props} amount={toL(chartData[props.index]?.Offline ?? 0)} />
              )} />
            </Bar>
            <Bar dataKey="Online" stackId="a" fill="#9CA3AF" radius={[4, 4, 0, 0]} minPointSize={2} isAnimationActive animationDuration={800} animationEasing="ease-out">
              <LabelList dataKey="Online" content={(props: any) => (
                <PctLabel {...props} pct={chartData[props.index]?.online_pct} />
              )} />
              <LabelList dataKey="Online" content={(props: any) => (
                <AmountLabel {...props} amount={toL(chartData[props.index]?.Online ?? 0)} />
              )} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: "32px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E5E7EB", alignItems: "flex-end" }}>
        {bars.map((b) => (
          <div key={b.name}>
            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{b.name}</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>{toL(b.total)}</div>
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

/** Section 2 — Short stay / Long stay (managed YoY) */
function StackedSectionShortLong({
  title, overallPct, badgeColor, shortStayPct, longStayPct, bars, delay = 0,
}: {
  title: string;
  overallPct: number;
  badgeColor: string;
  shortStayPct: number;
  longStayPct: number;
  bars: {
    name: string;
    short_stay: number;
    long_stay: number;
    total: number;
    short_stay_pct: number;
    long_stay_pct: number;
  }[];
  delay?: number;
}) {
  const chartData = bars.map((b) => ({
    name: b.name,
    short_stay: b.short_stay,
    long_stay: b.long_stay,
    total: b.total,
    short_pct: b.short_stay_pct,
    long_pct: b.long_stay_pct,
  }));

  const longColor = "#E4572E";
  const shortColor = "#9CA3AF";

  return (
    <div className="rc-card" style={{ ...cardStyle, animationDelay: `${delay}ms` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <h3 style={cardHeaderStyle}>{title}</h3>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", letterSpacing: "0.04em" }}>Growth rates</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "4px 12px", minWidth: "78px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.4px", textAlign: "center" }}>Short stay</span>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#374151" }}>{pctPill(shortStayPct)}%</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#FFF4F1", border: "1px solid #FECAB4", borderRadius: "8px", padding: "4px 12px", minWidth: "78px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#E4572E", textTransform: "uppercase", letterSpacing: "0.4px", textAlign: "center" }}>Long stay</span>
              <span style={{ fontSize: "16px", fontWeight: 800, color: longColor }}>{pctPill(longStayPct)}%</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "4px 14px", minWidth: "72px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Overall</span>
              <span style={{ fontSize: "16px", fontWeight: 800, color: badgeColor }}>{overallPct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: "100%", minWidth: 0, height: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 80, left: 0, bottom: 0 }} barSize={88}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 700, fill: "#374151" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Bar dataKey="long_stay" stackId="a" fill={longColor} radius={[0, 0, 4, 4]} minPointSize={3} isAnimationActive animationDuration={800} animationEasing="ease-out">
              <LabelList dataKey="long_stay" content={(props: any) => (
                <PctLabel {...props} pct={chartData[props.index]?.long_pct} />
              )} />
              <LabelList dataKey="long_stay" content={(props: any) => (
                <AmountLabel {...props} amount={toL(chartData[props.index]?.long_stay ?? 0)} />
              )} />
            </Bar>
            <Bar dataKey="short_stay" stackId="a" fill={shortColor} radius={[4, 4, 0, 0]} minPointSize={3} isAnimationActive animationDuration={800} animationEasing="ease-out">
              <LabelList dataKey="short_stay" content={(props: any) => (
                <PctLabel {...props} pct={chartData[props.index]?.short_pct} />
              )} />
              <LabelList dataKey="short_stay" content={(props: any) => (
                <AmountLabel {...props} amount={toL(chartData[props.index]?.short_stay ?? 0)} />
              )} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: "32px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E5E7EB", alignItems: "flex-end" }}>
        {bars.map((b) => (
          <div key={b.name}>
            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{b.name}</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>{toL(b.total)}</div>
          </div>
        ))}
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ display: "flex", gap: "14px", justifyContent: "flex-end" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#4B5563" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: shortColor, display: "inline-block" }} />
              Short stay
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#4B5563" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: longColor, display: "inline-block" }} />
              Long stay
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Curved dashed growth arrows between consecutive bar tops, with a pill showing % delta.
 * Uses Recharts 3 hooks (`useXAxisScale`, `useYAxisScale`) to compute exact pixel positions
 * — `<Customized>` no longer forwards chart context in v3, so we read it from the store. */
const GROWTH_ARROW_ID = "rc-growth-arrow-head";

function FranchisedGrowthArcs({
  data,
  accent = "#E4572E",
}: {
  data: { name: string; total: number }[];
  accent?: string;
}) {
  const xScale = useXAxisScale() as ((v: any, opts?: { position?: "start" | "middle" | "end" }) => number | undefined) | undefined;
  const yScale = useYAxisScale() as ((v: any) => number | undefined) | undefined;

  if (!xScale || !yScale || !Array.isArray(data) || data.length < 2) return null;

  const seq = data
    .map((d) => {
      const cx = xScale(d.name, { position: "middle" });
      const cy = yScale(d.total);
      if (typeof cx !== "number" || typeof cy !== "number") return null;
      return { cx, cy, total: Number(d.total) || 0 };
    })
    .filter(Boolean) as { cx: number; cy: number; total: number }[];

  if (seq.length < 2) return null;

  const arcs: React.ReactNode[] = [];
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1];
    const b = seq[i];
    const prevTot = a.total || 0;
    const pct = prevTot ? ((b.total - prevTot) / prevTot) * 100 : 0;
    const sign = pct >= 0 ? "+" : "";
    const label = `${sign}${pct.toFixed(1)}%`;

    const startX = a.cx;
    const startY = a.cy - 6;
    const endX = b.cx;
    const endY = b.cy - 6;
    const peakY = Math.min(startY, endY) - 70;
    const ctrlX = (startX + endX) / 2;

    const path = `M ${startX} ${startY} Q ${ctrlX} ${peakY} ${endX} ${endY - 4}`;

    const pillW = Math.max(58, label.length * 8 + 20);
    const pillH = 24;
    const pillX = ctrlX - pillW / 2;
    const pillY = peakY - 4;

    arcs.push(
      <g key={`growth-arc-${i}`} pointerEvents="none">
        <path
          d={path}
          stroke={accent}
          strokeWidth={1.8}
          strokeDasharray="6 4"
          fill="none"
          strokeLinecap="round"
          markerEnd={`url(#${GROWTH_ARROW_ID})`}
        />
        <g transform={`translate(${pillX} ${pillY})`}>
          <rect
            x={0}
            y={0}
            rx={pillH / 2}
            ry={pillH / 2}
            width={pillW}
            height={pillH}
            fill="#FFFFFF"
            stroke={accent}
            strokeWidth={1.2}
          />
          <text
            x={pillW / 2}
            y={pillH / 2 + 4}
            textAnchor="middle"
            fontSize={12}
            fontWeight={800}
            fill={accent}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {label}
          </text>
        </g>
      </g>
    );
  }

  return (
    <g pointerEvents="none">
      <defs>
        <marker
          id={GROWTH_ARROW_ID}
          viewBox="0 0 10 10"
          refX={8}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={accent} />
        </marker>
      </defs>
      {arcs}
    </g>
  );
}

/** Section 3 — Franchised MoM (Open vs others), three months */
function FranchisedMoMSection({
  title, openPct, othersPct, totalPct, bars, delay = 0,
}: {
  title: string;
  openPct: number;
  othersPct: number;
  totalPct: number;
  bars: {
    name: string;
    fr_open: number;
    fr_others: number;
    total: number;
    fr_open_pct: number;
    fr_others_pct: number;
  }[];
  delay?: number;
}) {
  // The franchised MoM block always shows three months: Feb / March / April (part).
  // If the API returns YoY-style names (e.g. "March 25" / "March 26") we override them
  // so the chart never shows wrong x-axis labels even if the backend points to a
  // workbook variant where the month header row is corrupted.
  const FRANCHISED_MONTHS = ["Feb", "March", "April (part)"] as const;
  const safeBars = bars.slice(0, 3);
  const chartData = safeBars.map((b, i) => ({
    name: FRANCHISED_MONTHS[i] ?? b.name,
    fr_open: b.fr_open,
    fr_others: b.fr_others,
    total: b.total,
    fr_open_pct: b.fr_open_pct,
    fr_others_pct: b.fr_others_pct,
  }));

  const pill = (label: string, value: unknown, accent: string, bg: string, border: string) => {
    const text = momPillText(value);
    const n = Number(value);
    const color =
      text === "—" ? "#6B7280" : !Number.isNaN(n) && n >= 0 ? "#16A34A" : "#DC2626";
    const arrow = text === "—" ? "" : !Number.isNaN(n) && n >= 0 ? "↗ " : "↘ ";
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: bg, border, borderRadius: "8px", padding: "4px 12px", minWidth: "76px" }}>
        <span style={{ fontSize: "10px", fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.4px", textAlign: "center" }}>{label}</span>
        <span style={{ fontSize: "16px", fontWeight: 800, color }}>
          {arrow}
          {text}
        </span>
      </div>
    );
  };

  return (
    <div className="rc-card" style={{ ...cardStyle, animationDelay: `${delay}ms` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <h3 style={cardHeaderStyle}>{title}</h3>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", letterSpacing: "0.04em" }}>Growth rates</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {pill("Open", openPct, "#374151", "#F3F4F6", "1px solid #E5E7EB")}
            {pill("Others", othersPct, "#E4572E", "#FFF4F1", "1px solid #FECAB4")}
            {pill("Overall", totalPct, "#16A34A", "#F0FDF4", "1px solid #BBF7D0")}
          </div>
        </div>
      </div>

      <div style={{ width: "100%", minWidth: 0, height: 340, minHeight: 340, position: "relative" }}>
        <ResponsiveContainer width="100%" height={340} minHeight={340} minWidth={0}>
          <BarChart
            key={chartData.map((d) => `${d.name}:${d.fr_open}:${d.fr_others}`).join("|")}
            data={chartData}
            margin={{ top: 96, right: 80, left: 0, bottom: 0 }}
            barSize={44}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: "#374151" }} axisLine={false} tickLine={false} interval={0} />
            <YAxis hide />
            <Bar dataKey="fr_others" stackId="f" fill="#E4572E" radius={[0, 0, 4, 4]} minPointSize={2} isAnimationActive animationDuration={800} animationEasing="ease-out">
              <LabelList dataKey="fr_others" content={(props: any) => (
                <PctLabel {...props} pct={chartData[props.index]?.fr_others_pct} />
              )} />
              <LabelList dataKey="fr_others" content={(props: any) => (
                <AmountLabel {...props} amount={toL(chartData[props.index]?.fr_others ?? 0)} />
              )} />
            </Bar>
            <Bar dataKey="fr_open" stackId="f" fill="#64748B" radius={[4, 4, 0, 0]} minPointSize={2} isAnimationActive animationDuration={800} animationEasing="ease-out">
              <LabelList dataKey="fr_open" content={(props: any) => (
                <FrOpenSideLabel
                  {...props}
                  amount={toLPrecise(chartData[props.index]?.fr_open ?? 0)}
                  pct={chartData[props.index]?.fr_open_pct}
                />
              )} />
            </Bar>
            <FranchisedGrowthArcs data={chartData} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: "24px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E5E7EB", alignItems: "flex-end", flexWrap: "wrap" }}>
        {chartData.map((b) => (
          <div key={b.name}>
            <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{b.name}</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>{toL(b.total)}</div>
          </div>
        ))}
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ display: "flex", gap: "14px", justifyContent: "flex-end" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#4B5563" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#64748B", display: "inline-block" }} />
              Open
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#4B5563" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#E4572E", display: "inline-block" }} />
              Others
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RevenueCompositionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await fetchKPI("revenue_composition");
    setData(normalizeRevenueCompositionPayload(d));
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
    return (
      <div style={pageStyle}>
        <p>⚠️ Cannot load KPI data.{data?.error ? ` ${data.error}` : ""}</p>
        <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>
          Ensure the FastAPI server is running. With the default setup, run{" "}
          <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" }}>uvicorn</code> on port 8000, or set{" "}
          <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" }}>NEXT_PUBLIC_API_URL</code> to your API origin.
        </p>
      </div>
    );

  const s2 = data.section2;
  const s3 = data.section3;
  const yoyBadge = s2.yoy_pct >= 0 ? "#16a34a" : "#dc2626";

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes fadeInUp {
          from { transform: translateY(16px); opacity: 0.85; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .rc-header { animation: fadeInUp 0.4s ease-out both; }
        .rc-card {
          opacity: 1;
          animation: fadeInUp 0.45s ease-out both;
        }
        .rc-card:hover {
          box-shadow: 0 6px 24px rgba(0,0,0,0.08) !important;
          transform: translateY(-2px);
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }
      `}</style>

      <div
        className="rc-header"
        style={{ marginBottom: "32px", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px" }}
      >
        <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>
          Revenue Composition — 1 April&apos;26 to 24 April&apos;26
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "#9CA3AF", fontWeight: 500 }}>1 April&apos;26 to 24 April&apos;26 · Same period comparison</p>
      </div>

      <StackedSectionOnlineOffline
        title="Target vs Actual - Managed properties"
        overallPct={data.section1.achievement_pct}
        badgeColor={data.section1.achievement_pct >= 90 ? "#16a34a" : data.section1.achievement_pct >= 75 ? "#d97706" : "#dc2626"}
        onlinePct={data.section1.achievement_online_pct}
        offlinePct={data.section1.achievement_offline_pct}
        bars={data.section1.bars}
        delay={120}
      />
      <div style={{ height: "24px" }} />

      <StackedSectionShortLong
        title="YoY Growth - Managed properties"
        overallPct={s2.yoy_pct}
        badgeColor={yoyBadge}
        shortStayPct={s2.yoy_short_stay_pct}
        longStayPct={s2.yoy_long_stay_pct}
        bars={s2.bars}
        delay={260}
      />
      <div style={{ height: "24px" }} />

      {s3?.bars?.length ? (
        <FranchisedMoMSection
          title="MoM Growth - Franchised properties"
          openPct={s3.mom_open_pct ?? 0}
          othersPct={s3.mom_others_pct ?? 0}
          totalPct={s3.mom_total_pct ?? 0}
          bars={s3.bars}
          delay={400}
        />
      ) : null}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: "24px 0",
  backgroundColor: "transparent",
  minHeight: "100vh",
  width: "100%",
  minWidth: 0,
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
