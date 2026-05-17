import { useState, useEffect, useCallback } from "react";
import { sharedStyles as s } from "../../styles/pages/Admin/shared.styles";
import { userManagementStyles as um } from "../../styles/pages/Admin/UserManagement.styles";
import { API_URL, formatDate, UserAvatar, StatusBadge } from "./shared";

export default function UserManagement({ token, onSelectUser }: {
  token: string;
  onSelectUser: (u: any) => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [deactivationRequests, setDeactivationRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      if (filter) params.set("filter", filter);
      const res = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setUsers(json.users);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [token, page, search, filter]);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_URL}/admin/deactivation-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setDeactivationRequests(json.requests);
    } finally {
      setLoadingRequests(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function handleDeactivate(id: string) {
    setProcessingId(id);
    try {
      await fetch(`${API_URL}/admin/deactivate/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadRequests();
      load();
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRejectDeactivation(id: string) {
    setProcessingId(id);
    try {
      await fetch(`${API_URL}/admin/reject-deactivation/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadRequests();
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReactivate(id: string) {
    setProcessingId(id);
    try {
      await fetch(`${API_URL}/admin/reactivate/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      load();
    } finally {
      setProcessingId(null);
    }
  }

  async function handleUnlock(id: string) {
    setProcessingId(id);
    try {
      await fetch(`${API_URL}/admin/unlock/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      load();
    } finally {
      setProcessingId(null);
    }
  }

  function isLocked(u: any): boolean {
    return u.lockedUntil && new Date(u.lockedUntil) > new Date();
  }

  const pageNumbers: (number | string)[] = [];
  for (let i = 1; i <= Math.min(totalPages, 5); i++) pageNumbers.push(i);
  if (totalPages > 5) { pageNumbers.push("..."); pageNumbers.push(totalPages); }

  return (
    <div className="admin-content" style={s.content}>
      <h1 className="admin-page-title" style={s.pageTitle}>User Management</h1>

      {(loadingRequests || deactivationRequests.length > 0) && (
        <div style={um.requestsCard}>
          <div style={um.requestsHeader}>
            <span style={um.requestsTitle}>Deactivation Requests</span>
            <span style={um.requestsBadge}>{deactivationRequests.length}</span>
          </div>
          {loadingRequests ? (
            <div style={um.requestsEmpty}>Loading requests...</div>
          ) : deactivationRequests.length === 0 ? (
            <div style={um.requestsEmpty}>No pending requests</div>
          ) : (
            <div style={um.requestsList}>
              {deactivationRequests.map((u: any) => (
                <div key={u._id} style={um.requestRow}>
                  <div style={um.requestUser}>
                    <UserAvatar name={u.username} email={u.email} size={36} />
                    <div>
                      <div style={um.requestName}>{u.username || u.email?.split('@')[0]}</div>
                      <div style={um.requestEmail}>{u.email}</div>
                      {u.deactivationRequestedAt && (
                        <div style={um.requestDate}>Requested {formatDate(u.deactivationRequestedAt)}</div>
                      )}
                    </div>
                  </div>
                  <div style={um.requestActions}>
                    <button style={um.approveBtn} disabled={processingId === u._id} onClick={() => handleDeactivate(u._id)}>
                      {processingId === u._id ? 'Processing…' : 'Deactivate'}
                    </button>
                    <button style={um.rejectBtn} disabled={processingId === u._id} onClick={() => handleRejectDeactivation(u._id)}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="admin-user-mgmt-top" style={um.userMgmtTop}>
        <div style={um.totalCard}>
          <div style={um.totalLabel}>Total Users</div>
          <div style={um.totalValue}>{total.toLocaleString()}</div>
        </div>
        <div style={um.filterRow}>
          <span style={um.filterLabel}>Quick Filter:</span>
          {[{ id: "active", label: "Active Only" }, { id: "last30", label: "Last 30 Days" }].map(f => (
            <button
              key={f.id}
              onClick={() => { setFilter(filter === f.id ? "" : f.id); setPage(1); }}
              style={{
                padding: "10px 20px", borderRadius: 50, border: "none",
                background: filter === f.id ? "#92400E" : "#FDF0E8",
                color: filter === f.id ? "#fff" : "#92400E",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Manrope', sans-serif", transition: "all 0.15s ease",
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <div style={um.searchWrap}>
        <span style={um.searchIcon}>🔍</span>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..."
          style={um.searchInput}
        />
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0D9C8", overflow: "hidden" }}>
        <div style={um.bulkBar}>
          <span style={um.bulkShowing}>Showing {users.length} of {total.toLocaleString()} users</span>
        </div>

        <div className="admin-table-wrap">
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {["NAME & IDENTITY", "ROLE", "JOIN DATE", "STATUS", ""].map((h, i) => (
                  <th key={i} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#9B7355", fontFamily: "'Manrope', sans-serif" }}>Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#9B7355", fontFamily: "'Manrope', sans-serif" }}>No users found</td></tr>
              ) : users.map((u: any) => (
                <tr key={u._id} className="admin-table-row" style={{ ...s.tableRow, opacity: u.deactivated ? 0.6 : 1 }}>
                  <td style={s.tdSmall}>
                    <div style={{ ...s.userIdentity, cursor: "pointer" }} onClick={() => onSelectUser(u)}>
                      <UserAvatar name={u.username} email={u.email} size={38} />
                      <div>
                        <div style={s.userName}>
                          {u.username || u.email.split("@")[0]}
                          {u.deactivated && <span style={um.deactivatedTag}>Deactivated</span>}
                          {u.deactivationRequested && !u.deactivated && <span style={um.pendingTag}>Pending</span>}
                          {isLocked(u) && <span style={um.lockedTag}>Locked</span>}
                        </div>
                        <div style={s.userEmail}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.tdSmall}><span style={s.roleBadge}>User</span></td>
                  <td style={{ ...s.tdSmall, fontSize: 13, color: "#3B1A00" }}>{formatDate(u.joinDate)}</td>
                  <td style={s.tdSmall}><StatusBadge active={u.isActive} /></td>
                  <td style={s.tdSmall}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {isLocked(u) && (
                        <button
                          onClick={() => handleUnlock(u._id)}
                          disabled={processingId === u._id}
                          style={um.unlockBtn}
                        >
                          {processingId === u._id ? '…' : 'Unlock'}
                        </button>
                      )}
                      {u.deactivated && (
                        <button
                          onClick={() => handleReactivate(u._id)}
                          disabled={processingId === u._id}
                          style={um.reactivateBtn}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={s.paginationWrap}>
          <button className="admin-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={s.pageBtn}>‹</button>
          {pageNumbers.map((p, i) => (
            <button
              key={i}
              className={typeof p === "number" ? "admin-page-btn" : ""}
              onClick={() => typeof p === "number" && setPage(p)}
              style={{ ...s.pageBtn, ...(p === page ? s.pageBtnActive : s.pageBtnInactive), cursor: typeof p === "number" ? "pointer" : "default", fontSize: 13 }}
            >{p}</button>
          ))}
          <button className="admin-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={s.pageBtn}>›</button>
        </div>
      </div>
    </div>
  );
}