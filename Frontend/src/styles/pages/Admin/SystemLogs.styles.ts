import type { CSSProperties } from "react";

export const systemLogsStyles: Record<string, CSSProperties> = {
  logsFiltersCard: { background: "#fff", borderRadius: "16px", border: "1px solid #F0D9C8", padding: "20px 24px", marginBottom: "16px" },
  logsFilters: { display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" },
  filterGroup: { flex: 1, minWidth: "200px" },
  filterGroupLabel: { fontSize: "11px", fontWeight: 700, color: "#9B7355", marginBottom: "6px", letterSpacing: "0.06em", textTransform: "uppercase" },
  dateRangeRow: { display: "flex", gap: "8px" },
  dateInput: { padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #F0D9C8", fontSize: "13px", flex: 1, fontFamily: "'Manrope', sans-serif" },
  severitySelect: { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #F0D9C8", fontSize: "13px", background: "#fff", fontFamily: "'Manrope', sans-serif" },
  typeFilterRow: { display: "flex", gap: "4px", flexWrap: "wrap" },
  logsPaginationWrap: { padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F0D9C8", flexWrap: "wrap", gap: "8px" },
  logsPaginationCount: { fontSize: "12px", color: "#9B7355", fontFamily: "'Manrope', sans-serif" },
  logsPaginationBtns: { display: "flex", gap: "6px", alignItems: "center" },
  logPageBtn: { width: "30px", height: "30px", borderRadius: "8px", border: "1px solid #F0D9C8", background: "#fff", cursor: "pointer" },
  exportBtn: {
    marginLeft: "8px", padding: "6px 16px", borderRadius: "8px", border: "none",
    background: "#FDF0E8", color: "#92400E",
    fontSize: "12px", fontWeight: 700, cursor: "pointer",
    fontFamily: "'Manrope', sans-serif", transition: "background 0.15s ease",
  },
};
