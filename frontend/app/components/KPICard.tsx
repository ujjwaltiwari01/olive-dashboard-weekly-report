"use client";

export interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;  // positive = good, negative = bad
  trendLabel?: string;
  color?: "green" | "red" | "blue" | "purple" | "amber" | "grey";
  icon?: string;
  size?: "sm" | "md" | "lg";
}

const colorMap = {
  green: { bg: "#f0fdf4", border: "#bbf7d0", icon: "#16a34a", trend: "#16a34a" },
  red: { bg: "#fef2f2", border: "#fecaca", icon: "#dc2626", trend: "#dc2626" },
  blue: { bg: "#eff6ff", border: "#bfdbfe", icon: "#2563eb", trend: "#2563eb" },
  purple: { bg: "#f5f3ff", border: "#ddd6fe", icon: "#7c3aed", trend: "#7c3aed" },
  amber: { bg: "#fffbeb", border: "#fde68a", icon: "#d97706", trend: "#d97706" },
  grey: { bg: "#f8fafc", border: "#e2e8f0", icon: "#64748b", trend: "#64748b" },
};

export default function KPICard({ title, value, subtitle, trend, trendLabel, color = "grey", icon, size = "md" }: KPICardProps) {
  const c = colorMap[color];
  const isPositive = trend !== undefined && trend >= 0;
  const trendColor = trend !== undefined ? (isPositive ? "#16a34a" : "#dc2626") : c.trend;

  return (
    <div style={{
      background: "white",
      border: `1.5px solid ${c.border}`,
      borderRadius: "16px",
      padding: size === "lg" ? "28px" : size === "sm" ? "16px" : "22px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      transition: "all 0.2s ease",
      cursor: "default",
      position: "relative",
      overflow: "hidden",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.10)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}>
      {/* Accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: c.border, borderRadius: "16px 16px 0 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            {title}
          </div>
          <div style={{ fontSize: size === "lg" ? "32px" : size === "sm" ? "20px" : "26px", fontWeight: 800, color: "#0f172a", lineHeight: 1, marginBottom: "6px" }}>
            {value}
          </div>
          {trend !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 600, color: trendColor }}>
              <span>{isPositive ? "▲" : "▼"}</span>
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: "12px" }}>{trendLabel}</span>}
            </div>
          )}
          {subtitle && (
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>{subtitle}</div>
          )}
        </div>
        {icon && (
          <div style={{
            width: "44px", height: "44px", borderRadius: "12px", background: c.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", flexShrink: 0
          }}>{icon}</div>
        )}
      </div>
    </div>
  );
}
