/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ComposedChart,
  ResponsiveContainer, LabelList, Legend,
  Tooltip as RechartsTooltip,
  useXAxisScale,
  useYAxisScale,
  usePlotArea,
} from "recharts";
import { fetchKPI } from "../../lib/api";

const REFRESH = 60000;

function toL(val: number) {
  return `₹${(val / 100_000).toFixed(0)}L`;
}

const MAX_COERCED_BARS = 64;

/** Turn bars field into an array (handles array, null, or { "0": row, "1": row } from some serializers). */
function coerceBarsArray(barsRaw: unknown): any[] {
  if (Array.isArray(barsRaw)) return barsRaw.slice(0, MAX_COERCED_BARS);
  if (barsRaw == null || typeof barsRaw !== "object") return [];
  const o = barsRaw as Record<string, unknown>;
  const keys = Object.keys(o);
  if (!keys.length) return [];
  const numericKeys = keys.filter((k) => /^\d+$/.test(k));
  if (numericKeys.length === keys.length) {
    const sorted = numericKeys
      .map((k) => Number(k))
      .sort((a, b) => a - b)
      .map((k) => o[String(k)]);
    return sorted.slice(0, MAX_COERCED_BARS);
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
  if (s3 && Array.isArray(s3.bars) && s3.bars.length > MAX_COERCED_BARS) {
    s3.bars = s3.bars.slice(0, MAX_COERCED_BARS);
  }
  if (s3 && Array.isArray(s3.bars) && s3.bars.length > 0) {
    const toN = (a: unknown, b?: unknown) => {
      const x = a ?? b;
      const n = Number(x);
      return Number.isFinite(n) ? n : 0;
    };
    s3.bars = s3.bars
      .filter((b: any) => b != null && typeof b === "object")
      .map((b: any) => {
        const rnd2 = (n: number) => Math.round(n * 100) / 100;
        const fr_open = rnd2(toN(b.fr_open, b.open));
        const fr_others = rnd2(toN(b.fr_others, b.others));
        let total = rnd2(toN(b.total));
        if (total <= 0) total = rnd2(fr_open + fr_others);
        const t = total > 0 ? total : 1;
        const fr_open_pct =
          b.fr_open_pct != null || b.open_pct != null
            ? Math.round(toN(b.fr_open_pct, b.open_pct))
            : Math.round((fr_open / t) * 100);
        const fr_others_pct =
          b.fr_others_pct != null || b.others_pct != null
            ? Math.round(toN(b.fr_others_pct, b.others_pct))
            : Math.round((fr_others / t) * 100);
        const cp = b.contribution_pct;
        const contribution_pct =
          cp != null && cp !== "" && Number.isFinite(Number(cp)) ? Number(cp) : null;
        return {
          name: String(b.name ?? ""),
          fr_open,
          fr_others,
          total,
          fr_open_pct,
          fr_others_pct,
          ...(contribution_pct != null ? { contribution_pct: contribution_pct } : {}),
        };
      });
    if (s3.mom_open_pct == null && s3.momOpenPct != null) s3.mom_open_pct = s3.momOpenPct;
    if (s3.mom_others_pct == null && s3.momOthersPct != null) s3.mom_others_pct = s3.momOthersPct;
    if (s3.mom_total_pct == null && s3.momTotalPct != null) s3.mom_total_pct = s3.momTotalPct;

    // Revenue sheet franchised MoM is always Feb → March → April; never YoY "March 25/26" labels.
    if (s3.bars.length === 3) {
      const canon = ["Feb '26", "March '26", "April '26"];
      s3.bars = s3.bars.map((b: any, i: number) => ({ ...b, name: canon[i] ?? b.name }));
    }
  }
  return out;
}

/** Actual ÷ Budget as integer %; falls back to API `achievement_pct` when budget is zero. */
function channelAchievementPct(row: { Budget: number; Actual: number; achievement_pct: number }) {
  const b = Number(row.Budget) || 0;
  const a = Number(row.Actual) || 0;
  if (b > 0) return Math.round((a / b) * 100);
  const p = Number(row.achievement_pct);
  return Number.isFinite(p) ? Math.round(p) : 0;
}

function achievementPctColor(pct: number) {
  if (pct >= 100) return "#16A34A";
  if (pct >= 90) return "#111827";
  if (pct >= 75) return "#CA8A04";
  return "#DC2626";
}

/** Currency label above each Budget / Actual bar (lakhs). */
function BvaAmountAboveBar(props: any) {
  const { x, y, width, value } = props;
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return null;
  const cx = x + width / 2;
  const ty = (typeof y === "number" ? y : 0) - 6;
  return (
    <text
      x={cx}
      y={ty}
      textAnchor="middle"
      dominantBaseline="auto"
      style={{
        fontSize: 12,
        fontWeight: 700,
        fill: "#1F2937",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em",
      }}
    >
      {toL(v)}
    </text>
  );
}

function BvaChannelAxisTick(props: any) {
  const { x, y, payload, rows } = props;
  const label =
    typeof payload === "string"
      ? payload
      : payload?.value ?? (typeof payload?.payload === "string" ? payload.payload : payload?.payload?.channel);
  const row = rows?.find((r: { channel: string }) => r.channel === label);
  if (!row) return <g />;
  const pct = channelAchievementPct(row);
  const pctColor = achievementPctColor(pct);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        style={{
          fontSize: 12,
          fontWeight: 700,
          fill: "#374151",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {row.channel}
      </text>
      <text
        x={0}
        y={0}
        dy={34}
        textAnchor="middle"
        style={{ fontSize: 13, fontWeight: 800, fill: pctColor, fontVariantNumeric: "tabular-nums" }}
      >
        {`${pct}% of budget`}
      </text>
    </g>
  );
}

function StackedSectionOnlineOffline({
  title,
  periodLabel,
  bars,
  achievementOnlinePct,
  achievementOfflinePct,
  achievementOverallPct,
  delay = 0,
}: {
  title: string;
  periodLabel?: string;
  bars: {
    name: string;
    online: number;
    offline: number;
    total: number;
    online_pct: number;
    offline_pct: number;
  }[];
  achievementOnlinePct: number;
  achievementOfflinePct: number;
  achievementOverallPct: number;
  delay?: number;
}) {
  const targetRow = bars.find((b) => String(b.name).toLowerCase().includes("target")) ?? bars[0];
  const actualRow = bars.find((b) => String(b.name).toLowerCase().includes("actual")) ?? bars[1];
  const chartData = [
    {
      channel: "Online",
      Budget: Number(targetRow?.online) || 0,
      Actual: Number(actualRow?.online) || 0,
      achievement_pct: achievementOnlinePct,
    },
    {
      channel: "Offline",
      Budget: Number(targetRow?.offline) || 0,
      Actual: Number(actualRow?.offline) || 0,
      achievement_pct: achievementOfflinePct,
    },
    {
      channel: "Overall",
      Budget: Number(targetRow?.total) || 0,
      Actual: Number(actualRow?.total) || 0,
      achievement_pct: achievementOverallPct,
    },
  ];

  const periodLine =
    periodLabel?.match(/\(([^)]+)\)/)?.[1]?.replace(/'/g, " — ") ?? periodLabel ?? null;

  const tooltipFmt = (v: number | undefined, name: string) => [
    `${toL(Number(v) || 0)}${name === "Budget" ? " (target)" : ""}`,
    name,
  ];

  const legendSwatch: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#4B5563",
    letterSpacing: "0.01em",
  };

  return (
    <div className="rc-card" style={{ ...cardStyle, animationDelay: `${delay}ms` }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3 style={{ ...cardHeaderStyle, marginBottom: periodLine ? 8 : 0 }}>{title}</h3>
          {periodLine ? (
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 600,
                color: "#6B7280",
                letterSpacing: "0.02em",
              }}
            >
              {periodLine}
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "22px", flexShrink: 0, paddingTop: "2px" }}>
          <span style={legendSwatch}>
            <span
              style={{
                width: 20,
                height: 13,
                borderRadius: 3,
                background: "#9CA3AF",
                border: "2px dashed #57534E",
                boxSizing: "border-box",
              }}
            />
            Budget (target)
          </span>
          <span style={legendSwatch}>
            <span
              style={{
                width: 20,
                height: 13,
                borderRadius: 3,
                background: "#F05A28",
                boxSizing: "border-box",
              }}
            />
            Actual
          </span>
        </div>
      </div>

      <div style={{ width: "100%", minWidth: 0, height: "360px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 36, right: 16, left: 8, bottom: 56 }}
            barCategoryGap="22%"
            barGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="channel"
              tick={(props: any) => <BvaChannelAxisTick {...props} rows={chartData} />}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
              interval={0}
              height={52}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => toL(Number(v))}
              width={58}
            />
            <RechartsTooltip
              cursor={{ fill: "#F9FAFB" }}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #E5E7EB",
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
              formatter={tooltipFmt as any}
            />
            <Bar
              dataKey="Budget"
              name="Budget"
              fill="#9CA3AF"
              stroke="#57534E"
              strokeWidth={2}
              strokeDasharray="5 4"
              radius={[4, 4, 0, 0]}
              maxBarSize={52}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            >
              <LabelList dataKey="Budget" position="top" content={BvaAmountAboveBar} />
            </Bar>
            <Bar
              dataKey="Actual"
              name="Actual"
              fill="#F05A28"
              radius={[4, 4, 0, 0]}
              maxBarSize={52}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            >
              <LabelList dataKey="Actual" position="top" content={BvaAmountAboveBar} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function yoyGrowthFromValues(prev: number, next: number) {
  const p = Number(prev) || 0;
  if (p <= 0) return 0;
  return Math.round(((Number(next) - p) / p) * 100);
}

function YoySegmentAxisTick(props: any) {
  const { x, y, payload } = props;
  const label =
    typeof payload === "string"
      ? payload
      : payload?.value ?? (typeof payload?.payload === "string" ? payload.payload : payload?.payload?.segment);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        style={{
          fontSize: 12,
          fontWeight: 700,
          fill: "#374151",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {String(label ?? "")}
      </text>
    </g>
  );
}

/** Section 2 — YoY managed: grouped Apr '25 vs Apr '26 per segment (Short / Long / Overall), styled like Budget vs Actual. */
function StackedSectionShortLong({
  title,
  periodLabel,
  bars,
  delay = 0,
}: {
  title: string;
  periodLabel?: string;
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
  const r25 =
    bars.find((b) => String(b.name).includes("2025")) ??
    bars.find((b) => /2025/i.test(String(b.name))) ??
    bars[0];
  const r26 =
    bars.find((b) => String(b.name).includes("2026")) ??
    bars.find((b) => /2026/i.test(String(b.name))) ??
    bars[1];

  if (!r25 || !r26) {
    return (
      <div className="rc-card" style={{ ...cardStyle, animationDelay: `${delay}ms` }}>
        <h3 style={cardHeaderStyle}>{title}</h3>
        <p style={{ color: "#6B7280", fontSize: 13 }}>Not enough periods to show YoY.</p>
      </div>
    );
  }

  const s25 = Number(r25.short_stay) || 0;
  const s26 = Number(r26.short_stay) || 0;
  const l25 = Number(r25.long_stay) || 0;
  const l26 = Number(r26.long_stay) || 0;
  const t25 = Number(r25.total) || 0;
  const t26 = Number(r26.total) || 0;

  // Arc pills use revenue deltas (Apr'25 vs Apr'26). Sheet J-column "%" cells are often
  // YoY *rates* or blanks — using them here produced 0% for Short/Long while bars showed real growth.
  const gShort = yoyGrowthFromValues(s25, s26);
  const gLong = yoyGrowthFromValues(l25, l26);
  const gOverall = yoyGrowthFromValues(t25, t26);

  const chartData = [
    { segment: "Short-stay", april25: s25, april26: s26, growth_pct: gShort },
    { segment: "Long-stay", april25: l25, april26: l26, growth_pct: gLong },
    { segment: "Overall", april25: t25, april26: t26, growth_pct: gOverall },
  ];

  const labelPriorYear = String(r25?.name ?? "Prior year");
  const labelCurrentYear = String(r26?.name ?? "Current year");

  const periodLine =
    (periodLabel && periodLabel.replace(/^YoY\s+Growth\s*/i, "").trim()) ||
    periodLabel?.match(/\(([^)]+)\)/)?.[1] ||
    periodLabel ||
    null;

  const tooltipFmt = (v: number | undefined, name: string) => [`${toL(Number(v) || 0)}`, name];

  const barGreyApr25 = "#64748B";
  /** April ’26 bar — matches brand orange (screenshot ref ~#F15A24). */
  const orangeApr26 = "#F15A24";

  const legendSwatch: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#4B5563",
    letterSpacing: "0.01em",
  };

  return (
    <div className="rc-card" style={{ ...cardStyle, animationDelay: `${delay}ms` }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3 style={{ ...cardHeaderStyle, marginBottom: periodLine ? 8 : 0 }}>{title}</h3>
          {periodLine ? (
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 600,
                color: "#6B7280",
                letterSpacing: "0.02em",
              }}
            >
              {periodLine}
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "22px", flexShrink: 0, paddingTop: "2px" }}>
          <span style={legendSwatch}>
            <span
              style={{
                width: 20,
                height: 13,
                borderRadius: 3,
                background: barGreyApr25,
                boxSizing: "border-box",
              }}
            />
            {labelPriorYear}
          </span>
          <span style={legendSwatch}>
            <span
              style={{
                width: 20,
                height: 13,
                borderRadius: 3,
                background: orangeApr26,
                boxSizing: "border-box",
              }}
            />
            {labelCurrentYear}
          </span>
        </div>
      </div>

      <div style={{ width: "100%", minWidth: 0, height: "380px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 76, right: 16, left: 8, bottom: 40 }}
            barCategoryGap="22%"
            barGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="segment"
              tick={(props: any) => <YoySegmentAxisTick {...props} />}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
              interval={0}
              height={36}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B7280", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => toL(Number(v))}
              width={58}
            />
            <RechartsTooltip
              cursor={{ fill: "#F9FAFB" }}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #E5E7EB",
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
              formatter={tooltipFmt as any}
            />
            <Bar
              dataKey="april25"
              name={labelPriorYear}
              fill={barGreyApr25}
              radius={[6, 6, 0, 0]}
              maxBarSize={52}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            >
              <LabelList dataKey="april25" position="top" content={BvaAmountAboveBar} />
            </Bar>
            <Bar
              dataKey="april26"
              name={labelCurrentYear}
              fill={orangeApr26}
              radius={[6, 6, 0, 0]}
              maxBarSize={52}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            >
              <LabelList dataKey="april26" position="top" content={BvaAmountAboveBar} />
            </Bar>
            <ManagedYoyGrowthArcs
              data={chartData}
              strokeColor={orangeApr26}
              pillBorder="#FDBA74"
              pillText="#9A3412"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Curved dashed growth arrows between consecutive bar tops, with a pill showing % delta.
 * Uses Recharts 3 hooks (`useXAxisScale`, `useYAxisScale`) to compute exact pixel positions
 * — `<Customized>` no longer forwards chart context in v3, so we read it from the store. */
const MANAGED_YOY_ARROW_ID = "rc-managed-yoy-arrow";

/** Curved dashed YoY arrows between April '25 and April '26 bar tops (grouped bar layout). */
function ManagedYoyGrowthArcs({
  data,
  strokeColor = "#94A3B8",
  pillBorder = "#CBD5E1",
  pillText = "#334155",
}: {
  data: { segment: string; april25: number; april26: number; growth_pct: number }[];
  strokeColor?: string;
  pillBorder?: string;
  pillText?: string;
}) {
  const plot = usePlotArea();
  const xScale = useXAxisScale() as ((v: any, opts?: { position?: "start" | "middle" | "end" }) => number | undefined) | undefined;
  const yScale = useYAxisScale() as ((v: any) => number | undefined) | undefined;

  if (!xScale || !yScale || !Array.isArray(data) || !data.length) return null;

  const plotW = plot?.width ?? 380;
  const band = plotW / Math.max(1, data.length);
  const categoryInner = band * 0.72;
  const estBarW = Math.min(52, Math.max(18, (categoryInner - 8) / 2));
  const halfSpan = estBarW / 2 + 4;

  const arcs: React.ReactNode[] = [];

  data.forEach((row, i) => {
    const xm = xScale(row.segment, { position: "middle" });
    if (typeof xm !== "number") return;

    const span = Math.max(24, Math.min(36, halfSpan));
    const x1 = xm - span;
    const x2 = xm + span;

    const y1 = yScale(row.april25);
    const y2 = yScale(row.april26);
    if (typeof y1 !== "number" || typeof y2 !== "number") return;

    const pct = Number(row.growth_pct) || 0;
    const label = `${Math.round(pct)}%`;

    const startX = x1;
    const startY = y1 - 5;
    const endX = x2;
    const endY = y2 - 5;
    const arcLift = 22;
    const peakY = Math.min(startY, endY) - arcLift;
    const ctrlX = (startX + endX) / 2;

    const path = `M ${startX} ${startY} Q ${ctrlX} ${peakY} ${endX} ${endY - 2}`;

    const pillW = Math.max(48, label.length * 8 + 16);
    const pillH = 20;
    const pillX = ctrlX - pillW / 2;
    const pillY = peakY - pillH / 2;

    arcs.push(
      <g key={`managed-yoy-arc-${row.segment}-${i}`} pointerEvents="none">
        <path
          d={path}
          stroke={strokeColor}
          strokeWidth={1.15}
          strokeDasharray="4 3.5"
          fill="none"
          strokeLinecap="round"
          markerEnd={`url(#${MANAGED_YOY_ARROW_ID})`}
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
            stroke={pillBorder}
            strokeWidth={1}
          />
          <text
            x={pillW / 2}
            y={pillH / 2 + 4}
            textAnchor="middle"
            fontSize={11}
            fontWeight={800}
            fill={pillText}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {label}
          </text>
        </g>
      </g>
    );
  });

  return (
    <g pointerEvents="none">
      <defs>
        <marker
          id={MANAGED_YOY_ARROW_ID}
          viewBox="0 0 10 10"
          refX={7}
          refY={5}
          markerWidth={5}
          markerHeight={5}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={strokeColor} />
        </marker>
      </defs>
      {arcs}
    </g>
  );
}

const FRANCHISED_ORANGE = "#F97316";
const FRANCHISED_ORANGE_DEEP = "#EA580C";

/** Currency label above franchised revenue bars (tuned for orange bars + dashboard density). */
function franchisedBarAmountLabel(v: number) {
  const lakhs = v / 100_000;
  return lakhs > 0 && lakhs < 80 ? `₹${lakhs.toFixed(2)}L` : toL(v);
}

function FranchisedBarValueLabel(props: any) {
  const { x, y, width, value } = props;
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return null;
  const cx = x + width / 2;
  const ty = (typeof y === "number" ? y : 0) - 22;
  return (
    <text
      x={cx}
      y={ty}
      textAnchor="middle"
      dominantBaseline="auto"
      style={{
        fontSize: 13,
        fontWeight: 800,
        fill: "#0F172A",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.03em",
      }}
    >
      {franchisedBarAmountLabel(v)}
    </text>
  );
}

/** Small filled arrowhead drawn in user space (SVG markers were sub-pixel and disappeared). */
function franchisedArcArrowHead(
  tipX: number,
  tipY: number,
  dirX: number,
  dirY: number,
  fill: string,
  key: string,
) {
  const len = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / len;
  const uy = dirY / len;
  const al = 5.2;
  const aw = 2.6;
  const bx = tipX - ux * al;
  const by = tipY - uy * al;
  const px = -uy;
  const py = ux;
  const p1x = bx + px * aw;
  const p1y = by + py * aw;
  const p2x = bx - px * aw;
  const p2y = by - py * aw;
  return <polygon key={key} points={`${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`} fill={fill} fillOpacity={0.95} stroke="none" />;
}

/** Curved MoM arrows between consecutive month bar tops (total revenue). */
function FranchisedGrowthArcs({
  data,
  strokeColor = FRANCHISED_ORANGE,
  pillBorder = "#FBBF24",
  pillText = "#92400E",
  pillFill = "#FFFBEB",
  yAxisId = "left",
}: {
  data: { name: string; total: number }[];
  strokeColor?: string;
  pillBorder?: string;
  pillText?: string;
  pillFill?: string;
  yAxisId?: string | number;
}) {
  const xScale = useXAxisScale() as ((v: any, opts?: { position?: "start" | "middle" | "end" }) => number | undefined) | undefined;
  const yScale = useYAxisScale(yAxisId) as ((v: any) => number | undefined) | undefined;

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

    const inset = 4;
    const startX = a.cx;
    const startY = a.cy + inset;
    const endX = b.cx;
    const endY = b.cy + inset;
    const dx = endX - startX;
    const lift = 18;
    const c1x = startX + dx * 0.22;
    const c1y = startY - lift * 0.42;
    const c2x = startX + dx * 0.78;
    const c2y = endY - lift * 0.42;

    const path = `M ${startX} ${startY} C ${c1x} ${c1y} ${c2x} ${c2y} ${endX} ${endY}`;
    const tdx = 3 * (endX - c2x);
    const tdy = 3 * (endY - c2y);
    const tl = Math.hypot(tdx, tdy) || 1;
    const uxf = tdx / tl;
    const uyf = tdy / tl;
    const tipX = endX + uxf * 1.4;
    const tipY = endY + uyf * 1.4;

    const pillW = Math.max(48, label.length * 6.5 + 16);
    const pillH = 18;
    const midBt =
      0.125 * startX +
      0.375 * c1x +
      0.375 * c2x +
      0.125 * endX;
    const midBy =
      0.125 * startY +
      0.375 * c1y +
      0.375 * c2y +
      0.125 * endY;
    const pillX = midBt - pillW / 2;
    const pillY = midBy - pillH / 2 - 5;

    arcs.push(
      <g key={`growth-arc-${i}`} pointerEvents="none">
        <path
          d={path}
          stroke={strokeColor}
          strokeOpacity={0.78}
          strokeWidth={0.95}
          strokeDasharray="3.5 3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {franchisedArcArrowHead(tipX, tipY, uxf, uyf, strokeColor, `ah-${i}`)}
        <g transform={`translate(${pillX} ${pillY})`}>
          <rect
            x={0}
            y={0}
            rx={pillH / 2}
            ry={pillH / 2}
            width={pillW}
            height={pillH}
            fill={pillFill}
            stroke={pillBorder}
            strokeWidth={0.85}
          />
          <text
            x={pillW / 2}
            y={pillH / 2 + 2.5}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill={pillText}
            style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
          >
            {label}
          </text>
        </g>
      </g>
    );
  }

  return <g pointerEvents="none">{arcs}</g>;
}

/** Two-line X tick: month label + % of contribution from the Revenue sheet. */
function FranchisedXAxisTick(
  props: {
    x?: number;
    y?: number;
    payload?: unknown;
    index?: number;
    chartData: { name: string; contribution_pct?: number | null }[];
  } & Record<string, unknown>,
) {
  const { x = 0, y = 0, payload, index, chartData } = props;
  const p = payload as { value?: unknown; payload?: { name?: string } } | string | number | undefined;
  let fromPayload = "";
  if (typeof p === "string" || typeof p === "number") fromPayload = String(p);
  else if (p && typeof p === "object") {
    if (p.value != null) fromPayload = String(p.value);
    else if (p.payload != null && typeof p.payload === "object" && "name" in p.payload)
      fromPayload = String((p.payload as { name?: string }).name ?? "");
  }
  const label =
    fromPayload ||
    (typeof index === "number" && chartData[index] ? String(chartData[index].name) : "");
  const row =
    typeof index === "number" && chartData[index]
      ? chartData[index]
      : chartData.find((d) => d.name === label);
  const c = row?.contribution_pct;
  const show = typeof c === "number" && Number.isFinite(c);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#334155" fontSize={12} fontWeight={600}>
        {label}
      </text>
      {show ? (
        <text x={0} y={0} dy={30} textAnchor="middle" fill="#64748B" fontSize={11} fontWeight={600}>
          {c}% of contribution
        </text>
      ) : null}
    </g>
  );
}

/** Section 3 — Franchised MoM: total revenue bars + MoM arcs (matches YoY managed card chrome). */
function FranchisedMoMSection({
  title,
  subtitle,
  bars,
  delay = 0,
}: {
  title: string;
  /** Shown under the title, same role as YoY period line (e.g. reporting window). */
  subtitle?: string;
  bars: {
    name: string;
    fr_open: number;
    fr_others: number;
    total: number;
    fr_open_pct: number;
    fr_others_pct: number;
    contribution_pct?: number | null;
  }[];
  delay?: number;
}) {
  const FRANCHISED_MONTHS = ["Feb '26", "March '26", "April '26"] as const;
  const safeBars = bars.slice(0, 3);

  const finiteMoney = (n: unknown) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.min(Math.max(x, 0), 1e15);
  };
  const finitePct = (n: unknown) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.min(Math.max(x, 0), 100);
  };

  const chartData = safeBars.map((b, i) => {
    const cp = b.contribution_pct;
    const contribution_pct =
      typeof cp === "number" && Number.isFinite(cp) ? cp : cp != null ? Number(cp) : null;
    return {
      name: FRANCHISED_MONTHS[i] ?? String(b.name ?? ""),
      total: finiteMoney(b.total),
      fr_open_pct: finitePct(b.fr_open_pct),
      contribution_pct:
        contribution_pct != null && Number.isFinite(contribution_pct) ? contribution_pct : null,
    };
  });

  const sub = subtitle?.trim() ?? "";
  const periodLine =
    sub && sub.toLowerCase() !== title.trim().toLowerCase()
      ? sub
      : "Franchised revenue · Feb – April '26";

  const L_15 = 15 * 100_000;
  const maxTotal = Math.max(...chartData.map((d) => d.total), 1);
  const leftAxisMax = Math.max(L_15, Math.ceil(maxTotal / L_15) * L_15);

  const franchisedTitleStyle: React.CSSProperties = {
    ...cardHeaderStyle,
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#0F172A",
    paddingBottom: "6px",
    marginBottom: periodLine ? 6 : 0,
  };

  const legendChip: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#475569",
    letterSpacing: "0.01em",
    padding: "7px 14px",
    borderRadius: "999px",
    background: "#F8FAFC",
    border: "1px solid #EEF2F6",
  };

  const tooltipFmt = (v: number | undefined, name: string) => {
    if (name === "total" || name === "Total franchised") {
      const n = Number(v) || 0;
      return [franchisedBarAmountLabel(n), "Total franchised"];
    }
    return [`${v}`, name];
  };

  const franchisedCardSurface: React.CSSProperties = {
    ...cardStyle,
    borderRadius: "14px",
    padding: "28px 32px 32px",
    border: "1px solid #E8ECF0",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -8px rgba(15, 23, 42, 0.08)",
    animationDelay: `${delay}ms`,
  };

  return (
    <div className="rc-card rc-card-franchised" style={franchisedCardSurface}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "24px",
          marginBottom: "0",
          flexWrap: "wrap",
          paddingBottom: "20px",
          borderBottom: "1px solid #EEF2F6",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 220px" }}>
          <h3 style={franchisedTitleStyle}>{title}</h3>
          {periodLine ? (
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                fontWeight: 500,
                color: "#64748B",
                letterSpacing: "0.01em",
                lineHeight: 1.45,
                maxWidth: "520px",
              }}
            >
              {periodLine}
            </p>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
            flexWrap: "wrap",
            paddingTop: "4px",
          }}
        >
          <span style={legendChip}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: `linear-gradient(180deg, ${FRANCHISED_ORANGE} 0%, ${FRANCHISED_ORANGE_DEEP} 100%)`,
                boxShadow: "0 1px 2px rgba(234, 88, 12, 0.35)",
                flexShrink: 0,
              }}
            />
            Total franchised
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: "20px",
          width: "100%",
          minWidth: 0,
          height: "400px",
          padding: "12px 4px 4px",
          borderRadius: "12px",
          background: "linear-gradient(180deg, #FAFBFC 0%, #FFFFFF 48%)",
          border: "1px solid #F1F5F9",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 84, right: 8, left: 0, bottom: 64 }}
            barCategoryGap="26%"
          >
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="name"
              tick={(props: any) => <FranchisedXAxisTick {...props} chartData={chartData} />}
              tickMargin={6}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={72}
            />
            <YAxis
              yAxisId="left"
              domain={[0, leftAxisMax]}
              tick={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => toL(Number(v))}
              width={54}
            />
            <RechartsTooltip
              cursor={false}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                fontSize: 12,
                boxShadow: "0 10px 40px -12px rgba(15, 23, 42, 0.15)",
                padding: "10px 14px",
              }}
              labelStyle={{ fontWeight: 700, color: "#0F172A", marginBottom: 6 }}
              formatter={tooltipFmt as any}
            />
            <Bar
              yAxisId="left"
              dataKey="total"
              name="Total franchised"
              fill={FRANCHISED_ORANGE}
              radius={[10, 10, 0, 0]}
              maxBarSize={62}
              isAnimationActive={false}
            >
              <LabelList dataKey="total" position="top" content={FranchisedBarValueLabel} />
            </Bar>
            <FranchisedGrowthArcs
              data={chartData}
              strokeColor={FRANCHISED_ORANGE}
              pillBorder="#F59E0B"
              pillText="#92400E"
              pillFill="#FFFBEB"
              yAxisId="left"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SketchTotalLabel(v: any) {
  if (!v || Number(v) <= 0) return "";
  return `₹${Math.round(Number(v))}L`;
}

const sketchTooltipStyle = {
  borderRadius: "8px",
  border: "1px solid #E5E7EB",
  fontSize: "13px",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
};

const sketchSlate = "#64748B";
const sketchOrange = "#F15A24";
const sketchDark = "#111827";

function sketchRevenueTooltipFormatter(val: any, name: any) {
  return [`₹${val}L`, String(name)];
}

function sketchOnlineSplitTooltipFormatter(val: any, name: any, item: any) {
  const key = String(item?.dataKey || "");
  const pct = key === "obe_lakhs" ? item?.payload?.obe_pct : key === "otas_lakhs" ? item?.payload?.otas_pct : null;
  return [`₹${val}L${pct != null ? ` (${pct}%)` : ""}`, String(name)];
}

function achievementPct(actual: any, target: any) {
  const a = Number(actual || 0);
  const t = Number(target || 0);
  return t > 0 ? Math.round((a / t) * 100) : 0;
}

function AchievementPill({ label, value }: { label: string; value: number }) {
  return (
    <span style={{
      background: "#ECFDF5",
      color: "#047857",
      border: "1px solid #A7F3D0",
      borderRadius: "999px",
      padding: "5px 10px",
      fontSize: "12px",
      fontWeight: 800,
      whiteSpace: "nowrap",
    }}>
      {label}: {value}%
    </span>
  );
}

function PropertyRevenueTrendSketch({ data }: { data: any }) {
  return (
    <div className="rc-card" style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px", marginBottom: "24px" }}>
        <h3 style={cardHeaderStyle}>{data?.title || "Property Revenue - Trend"}</h3>
      </div>
      <div style={{ height: "520px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.bars || []} margin={{ top: 44, right: 28, left: 0, bottom: 20 }} barSize={44}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: "#1A1A1A", fontWeight: 700 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={10} />
            <YAxis tick={{ fontSize: 12, fill: "#6B6B6B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dx={-10} tickFormatter={(val) => `${val}L`} />
            <RechartsTooltip contentStyle={sketchTooltipStyle} formatter={sketchRevenueTooltipFormatter as any} />
            <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "18px", color: "#1A1A1A" }} iconType="circle" />
            <Bar dataKey="short_stay_lakhs" name="Short stay" stackId="a" fill={sketchSlate} radius={[0, 0, 0, 0]} />
            <Bar dataKey="long_stay_lakhs" name="Long stay" stackId="a" fill={sketchOrange} radius={[10, 10, 0, 0]}>
              <LabelList dataKey="total_lakhs" position="top" fill="#111827" fontSize={18} fontWeight={900} formatter={SketchTotalLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RevenueComparisonMiniSketch({ data }: { data: any }) {
  const growth = Number(data?.growth_pct ?? 0);
  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: "12px", padding: "16px 14px 8px", background: "#FFFFFF", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1A1A1A" }}>{data?.label || "Comparison"}</h4>
        <span style={{ background: growth >= 0 ? "#F0FDF4" : "#FEF2F2", color: growth >= 0 ? "#16A34A" : "#DC2626", borderRadius: "999px", padding: "5px 12px", fontSize: "13px", fontWeight: 900 }}>
          Growth rate: {Math.round(100 + growth)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data?.bars || []} margin={{ top: 44, right: 8, left: -18, bottom: 16 }} barSize={40}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#1A1A1A", fontWeight: 700 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={8} />
          <YAxis tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} tickFormatter={(val) => `${val}L`} />
          <RechartsTooltip contentStyle={sketchTooltipStyle} formatter={sketchRevenueTooltipFormatter as any} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px", color: "#1A1A1A" }} iconType="circle" />
          <Bar dataKey="short_stay_lakhs" name="Short stay" stackId="a" fill={sketchSlate} />
          <Bar dataKey="long_stay_lakhs" name="Long stay" stackId="a" fill={sketchOrange} radius={[8, 8, 0, 0]}>
            <LabelList dataKey="total_lakhs" position="top" fill="#111827" fontSize={17} fontWeight={900} formatter={SketchTotalLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PropertyRevenueComparisonSketch({ data }: { data: any }) {
  return (
    <div className="rc-card" style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px", marginBottom: "24px" }}>
        <div>
          <h3 style={cardHeaderStyle}>Property Revenue - Same period</h3>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", height: "520px" }}>
        <RevenueComparisonMiniSketch data={data?.yoy} />
        <RevenueComparisonMiniSketch data={data?.mom} />
      </div>
    </div>
  );
}

function PropertyRevenueOnlineOfflineSketch({ data }: { data: any }) {
  return (
    <div className="rc-card" style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px", marginBottom: "24px" }}>
        <h3 style={cardHeaderStyle}>{data?.title || "Property Revenue - Online vs Offline and OTA vs OBE- 8th May '26"}</h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr", gap: "24px", height: "520px" }}>
        <RevenueChannelSketch data={data?.actual_vs_target} />
        <OnlineSplitSketch data={data?.online_split} />
      </div>
    </div>
  );
}

function RevenueChannelSketch({ data }: { data: any }) {
  const actual = data?.bars?.[0] || {};
  const target = data?.bars?.[1] || {};
  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: "12px", padding: "18px 16px 8px", background: "#FFFFFF", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "10px" }}>
        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1A1A1A" }}>{data?.label || "Actual vs Target"}</h4>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={{ color: "#64748B", fontSize: "12px", fontWeight: 800, alignSelf: "center", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Achievements
          </span>
          <AchievementPill label="Total" value={achievementPct(actual.total_lakhs, target.total_lakhs)} />
          <AchievementPill label="Online" value={achievementPct(actual.online_lakhs, target.online_lakhs)} />
          <AchievementPill label="Corporate" value={achievementPct(actual.corporate_lakhs, target.corporate_lakhs)} />
        </div>
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data?.bars || []} margin={{ top: 44, right: 24, left: -4, bottom: 22 }} barSize={46}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="month" tick={{ fontSize: 13, fill: "#1A1A1A", fontWeight: 700 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={10} />
          <YAxis tick={{ fontSize: 12, fill: "#6B6B6B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} tickFormatter={(val) => `${val}L`} />
          <RechartsTooltip contentStyle={sketchTooltipStyle} formatter={sketchRevenueTooltipFormatter as any} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "14px", color: "#1A1A1A" }} iconType="circle" />
          <Bar dataKey="online_lakhs" name="Online" stackId="a" fill={sketchSlate} />
          <Bar dataKey="corporate_lakhs" name="Corporate" stackId="a" fill={sketchOrange} />
          <Bar dataKey="walk_in_lakhs" name="Walk-in" stackId="a" fill={sketchDark} radius={[8, 8, 0, 0]}>
            <LabelList dataKey="total_lakhs" position="top" fill="#111827" fontSize={18} fontWeight={900} formatter={SketchTotalLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function OnlineSplitSketch({ data }: { data: any }) {
  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: "12px", padding: "18px 16px 8px", background: "#FFFFFF", minWidth: 0 }}>
      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1A1A1A" }}>{data?.label || "OBE vs OTAs"}</h4>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data?.bars || []} margin={{ top: 44, right: 16, left: -14, bottom: 22 }} barSize={44}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="month" tick={{ fontSize: 13, fill: "#1A1A1A", fontWeight: 700 }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} dy={10} />
          <YAxis tick={{ fontSize: 12, fill: "#6B6B6B" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} tickFormatter={(val) => `${val}L`} />
          <RechartsTooltip contentStyle={sketchTooltipStyle} formatter={sketchOnlineSplitTooltipFormatter as any} />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "14px", color: "#1A1A1A" }} iconType="circle" />
          <Bar dataKey="otas_lakhs" name="OTAs" stackId="a" fill={sketchSlate} />
          <Bar dataKey="obe_lakhs" name="OBE" stackId="a" fill={sketchOrange} radius={[8, 8, 0, 0]}>
            <LabelList dataKey="total_lakhs" position="top" fill="#111827" fontSize={18} fontWeight={900} formatter={SketchTotalLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
    queueMicrotask(() => {
      void load();
    });
    const t = setInterval(() => {
      void load();
    }, REFRESH);
    return () => clearInterval(t);
  }, [load]);

  if (loading)
    return <div style={pageStyle}><p style={{ color: "#6B7280" }}>Loading Revenue MIS...</p></div>;
  if (!data || data.error)
    return (
      <div style={pageStyle}>
        <p>⚠️ Cannot load KPI data.{data?.error ? ` ${data.error}` : ""}</p>
        <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>
          <strong>Local:</strong> run FastAPI with{" "}
          <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" }}>uvicorn</code> on port 8000 (the Next app proxies{" "}
          <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" }}>/api/*</code> there).{" "}
          <strong>Vercel + Render:</strong> set{" "}
          <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" }}>NEXT_PUBLIC_API_URL</code> or{" "}
          <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" }}>BACKEND_URL</code> to your public API base (e.g.{" "}
          <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" }}>https://your-api.onrender.com</code> — use <strong>https</strong>, no trailing slash — then redeploy. Either variable works; the app proxy also reads{" "}
          <code style={{ background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" }}>NEXT_PUBLIC_API_URL</code>.
        </p>
      </div>
    );

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
        .rc-card-franchised {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .rc-card-franchised:hover {
          box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04), 0 16px 40px -10px rgba(15, 23, 42, 0.1) !important;
        }
      `}</style>

      <div
        className="rc-header"
        style={{ marginBottom: "32px", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px" }}
      >
        <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>
          Revenue Composition — 1 May 2026 to 8 May&apos;26
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "32px", width: "100%" }}>
        <PropertyRevenueTrendSketch data={data.property_revenue_trend} />
        <PropertyRevenueComparisonSketch data={data.property_revenue_comparison} />
        <PropertyRevenueOnlineOfflineSketch data={data.property_revenue_online_offline} />
      </div>
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
