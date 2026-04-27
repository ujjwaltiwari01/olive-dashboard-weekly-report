"use client";

import { normalizeApiOrigin } from "./normalizeApiOrigin";

function kpiUrl(endpoint: string): string {
  const custom = normalizeApiOrigin(process.env.NEXT_PUBLIC_API_URL || "");
  if (custom) return `${custom}/api/kpi/${endpoint}`;
  return `/api/kpi/${endpoint}`;
}

export async function fetchKPI(endpoint: string) {
  const url = kpiUrl(endpoint);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        error: `HTTP ${res.status}${text ? `: ${text.slice(0, 240)}` : ""}`,
      };
    }
    return await res.json();
  } catch (e) {
    console.error(`Failed to fetch KPI [${endpoint}] (${url}):`, e);
    return {
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value.toLocaleString("en-IN")}`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function pctColor(pct: number): string {
  if (pct >= 90) return "#16a34a";
  if (pct >= 70) return "#d97706";
  return "#dc2626";
}
