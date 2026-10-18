import { useState, useEffect, useCallback } from "react";
import { sharedStyles as s } from "../../styles/pages/Admin/shared.styles";
import { systemLogsStyles as sl } from "../../styles/pages/Admin/SystemLogs.styles";
import { API_URL, formatDate, StatCard, SeverityBadge, TypeLabel } from "./shared";

export default function SystemLogs({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ totalEvents24h: 0, criticalAlerts: 0 });
  const [type, setType] = useState("All");
  const [severity, setSeverity] = useState("All Levels");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (type !== "All") params.set("type", type);
      if (severity !== "All Levels") params.set("severity", severity);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`${API_URL}/admin/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setLogs(json.logs);
        setTotal(json.total);
        setTotalPages(json.totalPages);
        setStats(json.stats);
      }
    } finally {
      setLoading(false);
    }
  }, [token, page, type, severity, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  async function exportCsv() {
    const res = await fetch(`${API_URL}/admin/logs/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const typeOptions = ["All", "Security", "API", "User Action", "System"];

  return (
    <div className="admin-content" style={s.content}>
      <h1 className="admin-page-title" style={s.pageTitle}>System Logs</h1>
      <p style={s.pageSubtitle}>Monitor real-time infrastructure events, security challenges, and user interactions.</p>

      <div className="admin-stat-grid" style={s.statGrid}>
        <StatCard label="Total Events (24h)" value={stats.totalEvents24h} />
        <StatCard label="Critical Alerts" value={stats.criticalAlerts} sub={stats.criticalAlerts > 0 ? "Requires Immediate Action" : "All Clear"} accentColor={stats.criticalAlerts > 0 ? "#DC2626" : undefined} />
        <StatCard label="API Throughput" value="—" sub="req/s" />
        <StatCard label="Health Score" value="99.8%" sub="● System Optimal" />
      </div>

      <div style={sl.logsFiltersCard}>
        <div className="admin-logs-filters" style={sl.logsFilters}>
          <div style={sl.filterGroup}>
            <div style={sl.filterGroupLabel}>Date Range</div>
            <div style={sl.dateRangeRow}>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={sl.dateInput} />
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={sl.dateInput} />
            </div>
          </div>
          <div style={{ minWidth: 160 }}>
            <div style={sl.filterGroupLabel}>Severity</div>
            <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }} style={sl.severitySelect}>
              {["All Levels", "CRITICAL", "WARNING", "INFO"].map(sv => <option key={sv}>{sv}</option>)}
            </select>
          </div>
          <div>
            <div style={sl.filterGroupLabel}>Event Type</div>
            <div style={sl.typeFilterRow}>
              {typeOptions.map(t => (
                <button key={t} className="admin-filter-btn" onClick={() => { setType(t); setPage(1); }}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #F0D9C8", background: type === t ? "#92400E" : "#fff", color: type === t ? "#fff" : "#7A4520", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Manrope', sans-serif", transition: "all 0.15s ease" }}
                >{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0D9C8", overflow: "hidden" }}>
        <div className="admin-table-wrap">
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {["TYPE", "SEVERITY", "EVENT DESCRIPTION"].map(h => (
                  <th key={h} style={{ ...s.th, padding: "12px 16px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ padding: 32, textAlign: "center", color: "#9B7355", fontFamily: "'Manrope', sans-serif" }}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: 32, textAlign: "center", color: "#9B7355", fontFamily: "'Manrope', sans-serif" }}>No logs found</td></tr>
              ) : logs.map((l: any) => (
                <tr key={l._id} className="admin-table-row" style={s.tableRow}>
                  <td style={{ ...s.td, padding: "14px 16px", whiteSpace: "nowrap" }}><TypeLabel type={l.type} /></td>
                  <td style={{ ...s.td, padding: "14px 16px", whiteSpace: "nowrap" }}><SeverityBadge severity={l.severity} /></td>
                  <td style={{ ...s.td, padding: "14px 16px" }}>
                    <div style={{ fontSize: 13, color: "#3B1A00", fontFamily: "'Manrope', sans-serif" }}>{l.description}</div>
                    <div style={{ fontSize: 11, color: "#9B7355", marginTop: 3 }}>{formatDate(l.createdAt)}{l.ip ? ` · IP: ${l.ip}` : ""}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={sl.logsPaginationWrap}>
          <div style={sl.logsPaginationCount}>Showing {logs.length} of {total.toLocaleString()} entries</div>
          <div style={sl.logsPaginationBtns}>
            <button className="admin-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={sl.logPageBtn}>‹</button>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => (
              <button key={i} className="admin-page-btn" onClick={() => setPage(i + 1)}
                style={{ ...sl.logPageBtn, ...(page === i + 1 ? s.pageBtnActive : s.pageBtnInactive), fontSize: 12 }}
              >{i + 1}</button>
            ))}
            <button className="admin-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={sl.logPageBtn}>›</button>
            <button className="admin-export-btn" onClick={exportCsv} style={sl.exportBtn}>⬇ Export CSV</button>
          </div>
        </div>
      </div>
    </div>
  );
}
