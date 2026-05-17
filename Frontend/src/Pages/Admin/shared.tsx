import { sharedStyles as s } from "../../styles/pages/Admin/shared.styles";
import { overviewStyles as o } from "../../styles/pages/Admin/Overview.styles";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const MONTH_NAMES = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export function formatDuration(ms: number) {
  if (!ms) return "0:00";
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

function getInitials(name: string, email: string) {
  return (name || email || "?").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ["#F97316","#C2410C","#92400E","#B45309","#D97706"];

export function UserAvatar({ name, email, size = 38 }: { name: string; email: string; size?: number }) {
  const idx = ((name || email || "").charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: AVATAR_COLORS[idx], color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 800, flexShrink: 0,
      fontFamily: "'Manrope', sans-serif", letterSpacing: "-0.01em",
    }}>
      {getInitials(name, email)}
    </div>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: active ? "#16a34a" : "#9B7355" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? "#16a34a" : "#D1C5BA", display: "inline-block", flexShrink: 0 }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    CRITICAL: { bg: "#FEE2E2", color: "#DC2626" },
    WARNING:  { bg: "#FEF3C7", color: "#D97706" },
    INFO:     { bg: "#FDF0E8", color: "#92400E" },
  };
  const st = map[severity] || map.INFO;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", background: st.bg, color: st.color }}>
      {severity}
    </span>
  );
}

export function TypeLabel({ type }: { type: string }) {
  const icons: Record<string, string> = { "Security": "🔒", "API": "⚙️", "User Action": "👤", "System": "🖥️" };
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#7A4520", fontWeight: 600 }}>
      <span style={{ fontSize: 14 }}>{icons[type] || "📋"}</span>{type}
    </span>
  );
}

export function StatCard({ label, value, sub, accentColor }: { label: string; value: string | number; sub?: string; accentColor?: string }) {
  return (
    <div style={s.statCard}>
      <div style={s.statLabel}>{label}</div>
      <div style={{ ...s.statValue, color: accentColor || "#3B1A00" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && <div style={{ ...s.statSub, color: accentColor || "#9B7355" }}>{sub}</div>}
    </div>
  );
}

export function BarChart({ data, year, onYearChange, loading = false }: { data: { month: number; count: number }[]; year: number; onYearChange: (y: number) => void; loading?: boolean }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return (
    <div style={o.chartWrap}>
      <div style={o.chartHeader}>
        <div>
          <div style={o.chartTitle}>Recent Created Users</div>
          <div style={o.chartSub}>New platform sign-ups trend overview</div>
        </div>
        <select value={year} onChange={e => onYearChange(parseInt(e.target.value))} style={o.chartYearSelect}>
          {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>Year {y}</option>)}
        </select>
      </div>
      <div style={{ overflowX: "auto", overflowY: "visible" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 200, minWidth: 480 }}>
          {data.map((d, i) => {
            const h = max > 0 ? Math.max((d.count / max) * 160, d.count > 0 ? 8 : 3) : 3;
            const isCurrentMonth = year === currentYear && i === currentMonth;
            return (
              <div key={i} style={{ flex: 1, minWidth: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                {d.count > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: isCurrentMonth ? "#F97316" : "#9B7355" }}>{d.count}</div>}
                <div style={{ width: "100%", height: h, borderRadius: "6px 6px 0 0", background: isCurrentMonth ? "#F97316" : "#E8D5C4", transition: "height 0.4s ease", opacity: loading ? 0.4 : 1 }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9B7355" }}>{MONTH_NAMES[i]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
