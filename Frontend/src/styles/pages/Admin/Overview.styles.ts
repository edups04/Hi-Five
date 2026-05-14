import type { CSSProperties } from "react";

export const overviewStyles: Record<string, CSSProperties> = {
  chartWrap: { background: "#fff", borderRadius: "16px", padding: "28px 28px 20px", border: "1px solid #F0D9C8" },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  chartTitle: { fontSize: "18px", fontWeight: 800, color: "#3B1A00", fontFamily: "'Manrope', sans-serif", letterSpacing: "-0.01em" },
  chartSub: { fontSize: "13px", color: "#9B7355", marginTop: "2px" },
  chartYearSelect: {
    padding: "6px 14px", borderRadius: "50px",
    border: "1px solid #F0D9C8", background: "#FDF0E8",
    color: "#92400E", fontWeight: 700, fontSize: "13px",
    cursor: "pointer", fontFamily: "'Manrope', sans-serif",
  },
  tableCard: { background: "#fff", borderRadius: "16px", padding: "28px", border: "1px solid #F0D9C8", marginTop: "24px" },
  tableCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  tableCardTitle: { fontSize: "18px", fontWeight: 800, color: "#3B1A00", fontFamily: "'Manrope', sans-serif" },
  tableCardSub: { fontSize: "13px", color: "#9B7355" },
};
