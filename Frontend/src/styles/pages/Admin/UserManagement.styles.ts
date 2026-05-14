import type { CSSProperties } from "react";

export const userManagementStyles: Record<string, CSSProperties> = {
  userMgmtTop: { display: "flex", gap: "16px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" },
  totalCard: { background: "#fff", borderRadius: "14px", padding: "16px 24px", border: "1px solid #F0D9C8", minWidth: "150px" },
  totalLabel: { fontSize: "11px", color: "#9B7355", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" },
  totalValue: { fontSize: "28px", fontWeight: 800, color: "#3B1A00", fontFamily: "'Manrope', sans-serif" },
  filterRow: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" },
  filterLabel: { fontSize: "11px", fontWeight: 700, color: "#9B7355", letterSpacing: "0.06em", textTransform: "uppercase" },
  searchWrap: { position: "relative", marginBottom: "16px" },
  searchIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9B7355", fontSize: "15px" },
  searchInput: {
    width: "100%", padding: "11px 14px 11px 40px", borderRadius: "10px",
    border: "1.5px solid #F0D9C8", background: "#fff",
    fontSize: "14px", color: "#3B1A00",
    fontFamily: "'Manrope', sans-serif",
  },
  bulkBar: { padding: "12px 16px", borderBottom: "1px solid #F0D9C8", display: "flex", alignItems: "center", gap: "12px" },
  bulkCount: { fontSize: "13px", fontWeight: 600, color: "#3B1A00" },
  bulkShowing: { marginLeft: "auto", fontSize: "13px", color: "#9B7355" },
  deleteBtn: {
    padding: "5px 14px", borderRadius: "8px", border: "none",
    background: "#FEE2E2", color: "#DC2626",
    fontSize: "13px", fontWeight: 700, cursor: "pointer",
    transition: "background 0.15s ease",
  },
  deleteBtnSm: {
    padding: "5px 12px", borderRadius: "8px", border: "none",
    background: "#FEE2E2", color: "#DC2626",
    fontSize: "12px", fontWeight: 600, cursor: "pointer",
    transition: "background 0.15s ease",
  },
};
