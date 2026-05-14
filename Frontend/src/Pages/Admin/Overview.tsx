import { useState, useEffect, useCallback } from "react";
import { sharedStyles as s } from "../../styles/pages/Admin/shared.styles";
import { overviewStyles as o } from "../../styles/pages/Admin/Overview.styles";
import { API_URL, formatDate, UserAvatar, StatusBadge, StatCard, BarChart } from "./shared";

export default function Overview({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  const load = useCallback(async (y: number, isYearChange = false) => {
    if (isYearChange) {
      setChartLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch(`${API_URL}/admin/stats?year=${y}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, [token]);

  useEffect(() => { load(year); }, [load]);

  if (loading || !data) return (
    <div style={{ padding: 40, color: "#9B7355", fontFamily: "'Manrope', sans-serif" }}>Loading...</div>
  );

  return (
    <div className="admin-content" style={s.content}>
      <h1 className="admin-page-title" style={s.pageTitle}>Overview</h1>

      <div className="admin-stat-grid" style={s.statGrid}>
        <StatCard label="Total Users" value={data.stats.totalUsers} />
        <StatCard label="Total Recordings" value={data.stats.totalRecordings} />
        <StatCard label="Active This Month" value={data.stats.activeUsersThisMonth} />
        <StatCard label="New This Week" value={data.stats.newUsersThisWeek} />
      </div>

    <BarChart data={data.monthlyData} year={year} onYearChange={y => { setYear(y); load(y, true); }} loading={chartLoading} />

      <div style={o.tableCard}>
        <div style={o.tableCardHeader}>
          <div>
            <div style={o.tableCardTitle}>Recent Users</div>
            <div style={o.tableCardSub}>Manage and verify new registrations</div>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {["NAME & IDENTITY", "ROLE", "JOIN DATE", "STATUS"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.map((u: any) => (
                <tr key={u._id} className="admin-table-row" style={s.tableRow}>
                  <td style={s.td}>
                    <div style={s.userIdentity}>
                      <UserAvatar name={u.username} email={u.email} size={38} />
                      <div>
                        <div style={s.userName}>{u.username || u.email.split("@")[0]}</div>
                        <div style={s.userEmail}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}><span style={s.roleBadge}>User</span></td>
                  <td style={{ ...s.td, fontSize: 13, color: "#3B1A00" }}>{formatDate(u.joinDate)}</td>
                  <td style={s.td}><StatusBadge active={u.isActive} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
