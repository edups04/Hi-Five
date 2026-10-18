import type { CSSProperties } from "react";

export const userDetailStyles: Record<string, CSSProperties> = {
  backBtn: {
    background: "none", border: "none", color: "#F97316",
    fontWeight: 700, cursor: "pointer", fontSize: "14px", marginBottom: "16px",
    fontFamily: "'Manrope', sans-serif", padding: "0",
    display: "flex", alignItems: "center", gap: "4px",
  },
  detailBreadcrumb: { fontSize: "12px", fontWeight: 700, color: "#C2410C", marginBottom: "4px", letterSpacing: "0.06em", textTransform: "uppercase" },
  detailTitle: { fontSize: "28px", fontWeight: 800, color: "#3B1A00", margin: "0 0 4px", fontFamily: "'Manrope', sans-serif", letterSpacing: "-0.01em" },
  detailSub: { fontSize: "13px", color: "#9B7355", marginBottom: "32px" },
  detailSectionTitle: { fontSize: "20px", fontWeight: 800, color: "#3B1A00", margin: "0 0 16px", fontFamily: "'Manrope', sans-serif" },
  detailSearchWrap: { position: "relative", marginBottom: "20px", maxWidth: "440px" },
  detailSearchIcon: { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9B7355" },
  detailSearchInput: {
    width: "100%", padding: "10px 14px 10px 36px", borderRadius: "10px",
    border: "1.5px solid #F0D9C8", background: "#fff",
    fontSize: "14px", color: "#3B1A00",
    fontFamily: "'Manrope', sans-serif",
  },
  recordingList: { display: "flex", flexDirection: "column", gap: "12px" },
  recordingCard: {
    background: "#fff", borderRadius: "14px",
    border: "1px solid #F0D9C8", padding: "16px 20px",
    display: "flex", alignItems: "center", gap: "16px",
    transition: "background 0.1s ease",
  },
  recordingThumb: {
    width: "80px", height: "56px", background: "#FDF0E8", borderRadius: "10px",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, position: "relative",
  },
  recordingDuration: {
    position: "absolute", bottom: "4px", right: "4px",
    background: "rgba(0,0,0,0.65)", color: "#fff",
    fontSize: "10px", fontWeight: 700, borderRadius: "4px", padding: "1px 5px",
    fontFamily: "ui-monospace, monospace",
  },
  recordingName: { fontWeight: 700, fontSize: "15px", color: "#3B1A00", marginBottom: "5px", fontFamily: "'Manrope', sans-serif" },
  recordingMeta: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "12px" },
  recordingDate: { color: "#9B7355" },
  recordingStatus: { background: "#DCFCE7", color: "#16a34a", padding: "2px 10px", borderRadius: "50px", fontWeight: 600 },
  recordingId: { color: "#9B7355", fontFamily: "ui-monospace, monospace" },
  recordingSentence: { fontSize: "12px", color: "#9B7355", marginTop: "4px", fontStyle: "italic" },
};
