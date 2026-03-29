"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/signings", label: "Signings", icon: "✍️" },
  { href: "/openings", label: "Operational", icon: "🔑" },
  { href: "/revenue-composition", label: "Revenue Composition", icon: "📊" },
  { href: "/cashflow", label: "Cashflow", icon: "🏦" },
  { href: "/collections", label: "Collections Breakdown", icon: "💰" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: "240px",
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 50,
      boxShadow: "4px 0 24px rgba(0,0,0,0.15)"
    }}>
      {/* Brand */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold", color: "white", fontSize: "16px"
          }}>O</div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "15px", lineHeight: 1 }}>Olive</div>
            <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px" }}>CFO Intelligence</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
            <NavItem icon={item.icon} label={item.label} isActive={pathname === item.href} />
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ color: "#475569", fontSize: "11px" }}>Updated: Mar 23, 2026</div>
        <div style={{ color: "#475569", fontSize: "11px", marginTop: "2px" }}>Auto-refresh: 60s</div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, isActive }: { icon: string; label: string; isActive: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "10px 20px", margin: "2px 8px",
      borderRadius: "8px", cursor: "pointer",
      color: isActive ? "#ffffff" : "#cbd5e1", 
      fontSize: "13px", fontWeight: 500,
      background: isActive ? "rgba(79,70,229,0.3)" : "transparent",
      transition: "all 0.15s ease",
    }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = "rgba(79,70,229,0.15)";
          (e.currentTarget as HTMLDivElement).style.color = "#e0e7ff";
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
          (e.currentTarget as HTMLDivElement).style.color = "#cbd5e1";
        }
      }}>
      <span style={{ fontSize: "14px" }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

