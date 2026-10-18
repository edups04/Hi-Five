import type { CSSProperties } from "react";

export const loginSignupStyles: Record<string, CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#FAF0E8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Manrope', sans-serif",
    padding: "20px",
  },
  card: {
    display: "flex",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(180, 80, 0, 0.18)",
    width: "100%",
    maxWidth: "820px",
    minHeight: "520px",
  },
  left: {
    width: "42%",
    background: "linear-gradient(160deg, #FAD89A 0%, #FFC59A 50%, #E8B19E 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 32px",
  },
  leftContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  leftTitle: {
    fontSize: "32px",
    fontWeight: 800,
    color: "#3B1A00",
    margin: "8px 0 0",
    fontFamily: "'Manrope', sans-serif",
    letterSpacing: "-0.02em",
  },
  leftSub: {
    fontSize: "14px",
    color: "rgba(59,26,0,0.7)",
    margin: "0 0 20px",
  },
  quoteBox: {
    background: "rgba(255,255,255,0.2)",
    borderRadius: "12px",
    padding: "14px 18px",
    maxWidth: "250px",
  },
  quoteText: {
    fontSize: "13px",
    color: "#3B1A00",
    margin: 0,
    lineHeight: 1.6,
    textAlign: "center",
    fontStyle: "italic",
  },
  right: {
    flex: 1,
    background: "#fff",
    padding: "36px 40px",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    maxHeight: "90vh",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "28px",
    alignSelf: "flex-end",
  },
  tab: {
    padding: "8px 22px",
    borderRadius: "50px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    border: "1.5px solid",
    fontFamily: "'Manrope', sans-serif",
    transition: "all 0.2s ease",
  },
  tabActive: {
    background: "#FAF0E8",
    borderColor: "#F97316",
    color: "#3B1A00",
  },
  tabInactive: {
    background: "transparent",
    borderColor: "#E5D0C0",
    color: "#9B7355",
  },
  formWrap: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  formTitle: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#3B1A00",
    margin: "0 0 4px",
    fontFamily: "'Manrope', sans-serif",
  },
  formSub: {
    fontSize: "14px",
    color: "#9B7355",
    margin: "0 0 24px",
  },
  fieldGroup: {
    marginBottom: "16px",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  label: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#9B7355",
    letterSpacing: "0.08em",
    display: "block",
    marginBottom: "6px",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    background: "#FAF0E8",
    borderRadius: "10px",
    border: "1.5px solid #F0D9C8",
    overflow: "hidden",
    padding: "0 12px",
    gap: "10px",
    position: "relative",
  },
  inputIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: "none",
    background: "transparent",
    padding: "12px 0",
    fontSize: "14px",
    color: "#3B1A00",
    outline: "none",
    fontFamily: "'Manrope', sans-serif",
  },
  passwordToggleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    flexShrink: 0,
  },
  forgotBtn: {
    background: "none",
    border: "none",
    color: "#C2410C",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'Manrope', sans-serif",
    padding: 0,
    marginBottom: "6px",
  },
  submitBtn: {
    background: "#92400E",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "14px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    marginTop: "8px",
    marginBottom: "20px",
    fontFamily: "'Manrope', sans-serif",
    transition: "background 0.2s ease, transform 0.15s ease",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#E5D0C0",
  },
  dividerText: {
    fontSize: "11px",
    color: "#9B7355",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  },
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    border: "1.5px solid #E5D0C0",
    background: "#fff",
    borderRadius: "10px",
    padding: "12px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#3B1A00",
    fontWeight: 600,
    transition: "all 0.15s ease",
  },
  backText: {
    textAlign: "center",
    marginTop: "16px",
    marginBottom: 0,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#C2410C",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "'Manrope', sans-serif",
    padding: 0,
  },

  phonePrefix: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#9B7355",
    flexShrink: 0,
    paddingRight: "6px",
    borderRight: "1px solid #F0D9C8",
    marginRight: "6px",
    fontFamily: "'Manrope', sans-serif",
  },

  checkboxRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    cursor: "pointer",
  },
  checkboxLabel: {
    fontSize: "12px",
    color: "#7A4520",
    fontFamily: "'Manrope', sans-serif",
    lineHeight: 1.5,
  },
  legalLink: {
    background: "none",
    border: "none",
    padding: 0,
    color: "#F97316",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'Manrope', sans-serif",
    textDecoration: "underline",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modalCard: {
    background: "#fff",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "480px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
    fontFamily: "'Manrope', sans-serif",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px 16px",
    borderBottom: "1px solid #F0D9C8",
  },
  modalTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 800,
    color: "#3B1A00",
    letterSpacing: "-0.01em",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9B7355",
    padding: "4px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #F0D9C8",
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
  },
  primaryBtn: {
    padding: "11px 28px",
    borderRadius: "50px",
    border: "none",
    background: "#F97316",
    color: "#fff",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "'Manrope', sans-serif",
    transition: "background 0.15s ease",
  },
  secondaryBtn: {
    padding: "11px 20px",
    borderRadius: "50px",
    border: "1px solid #E7C9B6",
    background: "#fff0e7",
    color: "#9B7355",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "'Manrope', sans-serif",
  },

  qrBox: {
    padding: "16px",
    background: "#fff",
    border: "2px solid #F0D9C8",
    borderRadius: "16px",
  },
  qrDescription: {
    margin: 0,
    fontSize: "12px",
    color: "#9B7355",
    fontFamily: "'Manrope', sans-serif",
    lineHeight: 1.6,
    maxWidth: "360px",
    textAlign: "center",
  },
  manualCodeWrap: {
    background: "#FAF0E8",
    borderRadius: "10px",
    padding: "10px 16px",
    width: "100%",
    textAlign: "center",
  },
  manualCodeLabel: {
    margin: "0 0 4px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#9B7355",
    letterSpacing: "0.06em",
    fontFamily: "'Manrope', sans-serif",
  },
  manualCode: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 800,
    color: "#C2410C",
    fontFamily: "ui-monospace, monospace",
    letterSpacing: "0.12em",
  },

  otpWrap: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    margin: "8px 0",
  },
  otpInput: {
    width: "48px",
    height: "56px",
    textAlign: "center",
    fontSize: "22px",
    fontWeight: 800,
    border: "2px solid #F0D9C8",
    borderRadius: "12px",
    outline: "none",
    background: "#FAF0E8",
    color: "#3B1A00",
    fontFamily: "ui-monospace, monospace",
    transition: "border-color 0.15s ease, background 0.15s ease",
  },
  otpInputFilled: {
    border: "2px solid #F97316",
    background: "#FFF7F0",
  },

  successWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "40px 32px",
    gap: "16px",
  },
  successIcon: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: "#DCFCE7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 800,
    color: "#3B1A00",
    fontFamily: "'Manrope', sans-serif",
    letterSpacing: "-0.01em",
  },
  successSub: {
    margin: 0,
    fontSize: "14px",
    color: "#9B7355",
    fontFamily: "'Manrope', sans-serif",
    lineHeight: 1.6,
    maxWidth: "320px",
  },

  legalBody: {
    padding: "20px 24px",
    overflowY: "auto",
    flex: 1,
    fontSize: "13px",
    color: "#7A4520",
    lineHeight: 1.7,
    fontFamily: "'Manrope', sans-serif",
  },

  errorText: {
    margin: "0 0 10px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#DC2626",
    fontFamily: "'Manrope', sans-serif",
  },
};

export const loginSignupCss = `
  .auth-input:focus { outline: none; }
  .auth-input::placeholder { color: #C8A882; }
  .submit-btn:hover { background: #7C3410 !important; transform: translateY(-1px); }
  .submit-btn:active { transform: translateY(0); }
  .google-btn:hover { border-color: #F97316 !important; transform: translateY(-1px); }
  .tab-btn:hover { opacity: 0.8; }
  .forgot-btn:hover { text-decoration: underline; }
  .tab:hover { background: #F0D9C8; }
  .auth-primary-btn:hover { background: #C2410C !important; }
  .auth-secondary-btn:hover { background: #ffe7d8 !important; }
  .auth-modal-close:hover { background: #FDF0E8 !important; color: #C2410C !important; }
  .otp-input:focus { border-color: #F97316 !important; background: #FFF7F0 !important; outline: none !important; }

  @media (max-width: 900px) {
    .auth-root { padding: 14px !important; align-items: stretch !important; }
    .auth-card { min-height: auto !important; max-width: 700px !important; margin: 0 auto !important; }
    .auth-left { width: 38% !important; padding: 24px 16px !important; }
    .auth-right { padding: 28px 22px !important; }
  }

  @media (max-width: 640px) {
    .auth-card { flex-direction: column !important; border-radius: 18px !important; }
    .auth-left { width: 100% !important; min-height: 160px !important; padding: 18px 14px !important; }
    .auth-left img { width: 62px !important; height: 98px !important; }
    .auth-left h2 { font-size: 24px !important; }
    .auth-left p { margin-bottom: 10px !important; }
    .auth-right { padding: 20px 14px !important; }
    .auth-tabs { align-self: stretch !important; justify-content: space-between !important; margin-bottom: 20px !important; gap: 6px !important; }
    .auth-tabs .tab-btn { flex: 1 !important; padding: 8px 12px !important; font-size: 13px !important; }
    .auth-form-wrap h3 { font-size: 24px !important; }
    .auth-form-wrap .forgot-btn { font-size: 11px !important; }
    .otp-input { width: 40px !important; height: 48px !important; font-size: 18px !important; }
  }
`;