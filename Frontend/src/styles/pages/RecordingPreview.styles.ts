import type { CSSProperties } from "react";

export const recordingModalStyles: Record<string, CSSProperties> = {
  // Full-screen dimmed backdrop. Click to dismiss is intentionally NOT wired
  // (per the user choice — Esc/click-outside closing is dangerous because
  // they could lose a recording by misclicking).
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 8, 4, 0.55)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 100,
    fontFamily: "'Manrope', sans-serif",
    animation: "asl-modal-fade-in 0.18s ease-out",
  },

  // The card itself.
  card: {
    background: "#FAF0E8",
    borderRadius: "20px",
    padding: "24px",
    width: "100%",
    maxWidth: "1080px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    boxShadow:
      "0 25px 60px -12px rgba(60, 25, 0, 0.45), 0 8px 16px rgba(60,25,0,0.18)",
    border: "1px solid #F0D9C8",
    overflow: "auto",
  },

  // Header.
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  title: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#C2410C",
    margin: 0,
    letterSpacing: "-0.01em",
  },
  subtitle: {
    fontSize: "13px",
    color: "#9B7355",
    margin: 0,
  },

  // Video preview container — keeps a 16:9-ish ratio without letterboxing
  // (the actual recording aspect depends on camera; object-fit: contain).
  videoWrap: {
    width: "100%",
    background: "#111",
    borderRadius: "12px",
    overflow: "hidden",
    aspectRatio: "16 / 9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    background: "#000",
  },

  // Name input.
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#7A4520",
    letterSpacing: "0.08em",
  },
  input: {
    padding: "11px 14px",
    fontSize: "15px",
    fontWeight: 500,
    color: "#3B1A00",
    background: "#fff4ec",
    border: "1px solid #E9CDB7",
    borderRadius: "10px",
    outline: "none",
    fontFamily: "'Manrope', sans-serif",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    width: "100%",
    boxSizing: "border-box",
  },

  // Action row at the bottom.
  actions: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    marginTop: "4px",
  },
  discardBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 18px",
    background: "transparent",
    color: "#7A4520",
    border: "1px solid #E9CDB7",
    borderRadius: "50px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Manrope', sans-serif",
    transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  },
  keepBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 22px",
    background: "#92400E",
    color: "#fff",
    border: "none",
    borderRadius: "50px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Manrope', sans-serif",
    transition: "background 0.15s ease, transform 0.1s ease",
  },
  keepBtnDisabled: {
    background: "#D6B19B",
    cursor: "not-allowed",
  },
};

export const recordingModalCss = `
  @keyframes asl-modal-fade-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .asl-modal-input:focus {
    border-color: #F97316 !important;
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15) !important;
  }

  .asl-modal-discard-btn:hover {
    background: #fff4ec !important;
    border-color: #C2410C !important;
    color: #C2410C !important;
  }

  .asl-modal-keep-btn:not(:disabled):hover {
    background: #7C3410 !important;
    transform: translateY(-1px);
  }

  .asl-modal-spin {
    animation: asl-modal-spin 0.9s linear infinite;
  }
  @keyframes asl-modal-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 480px) {
    .asl-modal-card {
      padding: 18px !important;
      border-radius: 16px !important;
      gap: 14px !important;
    }
    .asl-modal-title {
      font-size: 18px !important;
    }
    .asl-modal-actions {
      flex-direction: column-reverse !important;
    }
    .asl-modal-actions button {
      width: 100% !important;
      justify-content: center !important;
    }
  }
`;