"use client";

interface Insight {
  message: string;
  level?: "info" | "warning" | "critical" | "success";
}

interface InsightStripProps {
  insights: string[];
  recommendations?: Array<{ action: string; priority: string }>;
}

const levelStyle = {
  info: { bg: "#eff6ff", border: "#bfdbfe", icon: "💡", text: "#1d4ed8" },
  warning: { bg: "#fffbeb", border: "#fde68a", icon: "⚠️", text: "#92400e" },
  critical: { bg: "#fef2f2", border: "#fecaca", icon: "🔴", text: "#991b1b" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", icon: "✅", text: "#15803d" },
};

function detectLevel(msg: string): "info" | "warning" | "critical" | "success" {
  const lower = msg.toLowerCase();
  if (lower.includes("critical") || lower.includes("deficit") || lower.includes("below 80") || lower.includes("overdue")) return "critical";
  if (lower.includes("warning") || lower.includes("below") || lower.includes("low") || lower.includes("lagging") || lower.includes("⚠")) return "warning";
  if (lower.includes("✅") || lower.includes("healthy") || lower.includes("strong") || lower.includes("top performer")) return "success";
  return "info";
}

export default function InsightStrip({ insights, recommendations }: InsightStripProps) {
  if (!insights.length && (!recommendations || !recommendations.length)) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {insights.map((msg, i) => {
        const level = detectLevel(msg);
        const s = levelStyle[level];
        return (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: "10px",
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: "10px", padding: "10px 14px",
          }}>
            <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>{s.icon}</span>
            <span style={{ fontSize: "13px", color: s.text, fontWeight: 500 }}>{msg}</span>
          </div>
        );
      })}
      {recommendations?.map((r, i) => {
        const priority = r.priority === "critical" ? "critical" : r.priority === "high" ? "warning" : "info";
        const s = levelStyle[priority];
        return (
          <div key={`rec-${i}`} style={{
            display: "flex", alignItems: "flex-start", gap: "10px",
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: "10px", padding: "10px 14px",
          }}>
            <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>→</span>
            <div>
              <span style={{ fontSize: "13px", color: s.text, fontWeight: 600 }}>{r.action}</span>
              <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "8px" }}>Priority: {r.priority}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
