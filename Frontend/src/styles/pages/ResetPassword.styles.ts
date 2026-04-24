import type { CSSProperties } from "react";

const BROWN = "#8B3A1A";
const BROWN_DARK = "#6B2A10";
const BROWN_LIGHT = "#FDF0E8";
const BROWN_BORDER = "#E8C9B0";

export const resetPasswordStyles: Record<string, CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#FAF0E8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    fontFamily: "'Manrope', sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 28,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    boxShadow: "0 40px 80px rgba(139,58,26,0.18), 0 8px 24px rgba(0,0,0,0.08)",
  },
  accentBar: {
    height: 4,
    background: `linear-gradient(90deg, ${BROWN_DARK}, ${BROWN}, #c4622a)`,
  },

  // ── Reset step ──────────────────────────────────────────────────────────────
  resetPanel: {
    padding: "36px 36px 32px",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    background: BROWN_LIGHT,
    border: `1.5px solid ${BROWN_BORDER}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: 800,
    color: "#1a1a10",
    margin: "0 0 8px",
    letterSpacing: "-0.4px",
  },
  subText: {
    fontSize: 14,
    color: "#7a6050",
    margin: "0 0 28px",
    lineHeight: 1.6,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldGroupNoError: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "#5a3a2a",
    letterSpacing: "0.6px",
    textTransform: "uppercase" as const,
    display: "block",
    marginBottom: 8,
  },
  inputWrap: {
    position: "relative" as const,
  },
  input: {
    width: "100%",
    padding: "12px 44px",
    boxSizing: "border-box" as const,
    border: `1.5px solid ${BROWN_BORDER}`,
    borderRadius: 14,
    background: BROWN_LIGHT,
    fontSize: 14,
    color: "#2a1a10",
    outline: "none",
    fontFamily: "inherit",
    transition: "border 0.2s",
  },
  inputIconLeft: {
    position: "absolute" as const,
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none" as const,
  },
  toggleBtn: {
    position: "absolute" as const,
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    color: "#e53e3e",
    margin: "0 0 16px",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  submitBtn: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    background: BROWN,
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    letterSpacing: "0.2px",
    transition: "background 0.2s",
  },
  submitBtnLoading: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    background: "#c4855a",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    border: "none",
    cursor: "not-allowed",
    letterSpacing: "0.2px",
    transition: "background 0.2s",
  },

  // ── Success step ─────────────────────────────────────────────────────────────
  successPanel: {
    padding: "40px 36px 36px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
  },
  successIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 24,
    background: "#EAF3DE",
    border: "1.5px solid #C0DD97",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successHeading: {
    fontSize: 22,
    fontWeight: 800,
    color: "#1a1a10",
    margin: "0 0 10px",
    letterSpacing: "-0.4px",
  },
  successSubText: {
    fontSize: 14,
    color: "#7a6050",
    margin: "0 0 28px",
    lineHeight: 1.65,
    maxWidth: 280,
  },
  backBtn: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    background: BROWN,
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    letterSpacing: "0.2px",
    transition: "background 0.2s",
  },
};

export const resetPasswordCss = `
  .reset-input:focus { border-color: ${BROWN} !important; }
  .reset-input::placeholder { color: #C8A882; }
  .reset-submit-btn:hover { background: ${BROWN_DARK} !important; }
  .reset-back-btn:hover  { background: ${BROWN_DARK} !important; }
`;

export { BROWN, BROWN_DARK };