"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchKPI(endpoint: string) {
  try {
    const res = await fetch(`${API_BASE}/api/kpi/${endpoint}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`Failed to fetch KPI [${endpoint}]:`, e);
    return null;
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
