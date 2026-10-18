import { useState, useEffect } from "react";
import { userDetailStyles as ud } from "../../styles/pages/Admin/UserDetail.styles";
import { API_URL, formatDate, formatDuration } from "./shared";

export default function UserDetail({ token, user, onBack }: {
  token: string;
  user: any;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/admin/users/${user._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(j => { if (j.success) setDetail(j); });
  }, [token, user._id]);

  const filtered = (detail?.recordings || []).filter((r: any) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-content" style={{ padding: "28px 32px", overflowY: "auto", flex: 1 }}>
      <button onClick={onBack} style={ud.backBtn}>← User Management</button>

      <div style={ud.detailBreadcrumb}>User Management</div>
      <h1 style={ud.detailTitle}>{user.username || user.email?.split("@")[0]}</h1>
      <div style={ud.detailSub}>Joined {formatDate(user.joinDate)}</div>

      <h2 style={ud.detailSectionTitle}>Video Logs</h2>

      <div style={ud.detailSearchWrap}>
        <span style={ud.detailSearchIcon}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search logs by ID or title..."
          style={ud.detailSearchInput}
        />
      </div>

      {!detail ? (
        <div style={{ color: "#9B7355", fontFamily: "'Manrope', sans-serif" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "#9B7355", padding: 32, textAlign: "center", fontFamily: "'Manrope', sans-serif" }}>No recordings found</div>
      ) : (
        <div style={ud.recordingList}>
          {filtered.map((r: any) => (
            <div key={r._id} className="admin-table-row" style={ud.recordingCard}>
              <div style={ud.recordingThumb}>
                <span style={{ fontSize: 22, color: "#C2410C" }}>🎬</span>
                <div style={ud.recordingDuration}>{formatDuration(r.durationMs)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={ud.recordingName}>{r.name}</div>
                <div style={ud.recordingMeta}>
                  <span style={ud.recordingDate}>📅 {formatDate(r.createdAt)}</span>
                  <span style={ud.recordingStatus}>✓ Processed</span>
                  <span style={ud.recordingId}>{String(r._id).slice(-8)}</span>
                </div>
                {r.sentence && (
                  <div style={ud.recordingSentence}>
                    "{r.sentence.slice(0, 80)}{r.sentence.length > 80 ? "..." : ""}"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
