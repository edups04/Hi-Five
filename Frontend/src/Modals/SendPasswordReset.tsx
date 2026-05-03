import { useState, useEffect } from "react";
import axios from "axios";

type Step = "email" | "sent";

const BROWN = "#8B3A1A";
const BROWN_DARK = "#6B2A10";
const BROWN_LIGHT = "#FDF0E8";
const BROWN_BORDER = "#E8C9B0";

// ─── Icons ────────────────────────────────────────────────────────────────────

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MailIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BROWN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <polyline points="2,4 12,13 22,4" />
  </svg>
);

const MailSentIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {/* envelope */}
    <rect x="2" y="4" width="20" height="16" rx="3" stroke={BROWN} strokeWidth="1.6" />
    <polyline points="2,4 12,13 22,4" stroke={BROWN} strokeWidth="1.6" />
    {/* flying arrow */}
    <path d="M16 12 L22 12 M19 9 L22 12 L19 15" stroke={BROWN} strokeWidth="1.8" />
  </svg>
);

const InputMailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BROWN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3" /><polyline points="2,4 12,13 22,4" />
  </svg>
);

// ─── Modal ────────────────────────────────────────────────────────────────────

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordResetModal({ isOpen, onClose }: PasswordResetModalProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  // ESC to close
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    setTimeout(() => { setStep("email"); setEmail(""); setError(""); }, 300);
  };

const handleSend = async () => {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address."); return; }
    setError("");
    setLoading(true);
    try {
      await axios.post('${API_URL}/forgot-password', { email });
      setStep("sent");
    } catch (err: any) {
      if(err.response) {
        setError(err.response.data.Status || "Something went wrong.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
};

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15, 6, 2, 0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "fdIn 0.2s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 28,
          width: "100%", maxWidth: 400,
          overflow: "hidden",
          boxShadow: "0 40px 80px rgba(139,58,26,0.22), 0 8px 24px rgba(0,0,0,0.1)",
          position: "relative",
          animation: "suIn 0.3s cubic-bezier(0.34,1.4,0.64,1)",
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${BROWN_DARK}, ${BROWN}, #c4622a)` }} />

        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 18, right: 18,
            width: 32, height: 32, borderRadius: "50%",
            background: BROWN_LIGHT, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#9a7060", transition: "background 0.15s, color 0.15s",
            zIndex: 1,
          }}
          onMouseEnter={e => { (e.currentTarget).style.background = BROWN_BORDER; (e.currentTarget).style.color = BROWN; }}
          onMouseLeave={e => { (e.currentTarget).style.background = BROWN_LIGHT; (e.currentTarget).style.color = "#9a7060"; }}
        >
          <CloseIcon />
        </button>

        {/* ── Step 1: Enter Email ── */}
        {step === "email" && (
          <div style={{ padding: "36px 36px 32px" }}>
            {/* Icon */}
            <div style={{
              width: 72, height: 72, borderRadius: 20, background: BROWN_LIGHT,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24, border: `1.5px solid ${BROWN_BORDER}`,
            }}>
              <MailIcon />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
              Forgot your password?
            </h2>
            <p style={{ fontSize: 14, color: "#7a6050", margin: "0 0 28px", lineHeight: 1.6 }}>
              Enter the email address linked to your account and we'll send you a reset link.
            </p>

            {/* Email field */}
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a3a2a", letterSpacing: "0.6px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Email Address
            </label>
            <div style={{ position: "relative", marginBottom: error ? 8 : 24 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <InputMailIcon />
              </span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                autoFocus
                onChange={e => { setEmail(e.target.value); if (error) setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                onFocus={e => (e.target.style.borderColor = error ? "#e53e3e" : BROWN)}
                onBlur={e => (e.target.style.borderColor = error ? "#e53e3e" : BROWN_BORDER)}
                style={{
                  width: "100%", padding: "13px 16px 13px 44px",
                  borderRadius: 14, border: `1.5px solid ${error ? "#e53e3e" : BROWN_BORDER}`,
                  background: BROWN_LIGHT, fontSize: 14, color: "#2a1a10",
                  outline: "none", boxSizing: "border-box",
                  fontFamily: "'Manrope', sans-serif", transition: "border 0.2s",
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 12, color: "#e53e3e", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#e53e3e"><circle cx="12" cy="12" r="12" /><text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text></svg>
                {error}
              </p>
            )}

            <button
              onClick={handleSend}
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: 14,
                background: loading ? "#c4855a" : BROWN, color: "#fff",
                fontSize: 15, fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.2px", transition: "background 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget).style.background = BROWN_DARK; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget).style.background = BROWN; }}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                    <path d="M12 2a10 10 0 1 0 10 10" />
                  </svg>
                  Sending...
                </>
              ) : "Send Reset Link"}
            </button>
          </div>
        )}

        {/* ── Step 2: Email Sent ── */}
        {step === "sent" && (
          <div style={{ padding: "40px 36px 36px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>

            {/* Animated envelope */}
            <div style={{
              width: 90, height: 90, borderRadius: 24, background: BROWN_LIGHT,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24, border: `1.5px solid ${BROWN_BORDER}`,
              animation: "popIn 0.4s cubic-bezier(0.34,1.6,0.64,1)",
            }}>
              <MailSentIcon />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", margin: "0 0 10px", letterSpacing: "-0.4px" }}>
              Check your inbox
            </h2>
            <p style={{ fontSize: 14, color: "#7a6050", margin: "0 0 6px", lineHeight: 1.65, maxWidth: 290 }}>
              We've sent a password reset link to
            </p>
            <p style={{
              fontSize: 14, fontWeight: 700, color: BROWN,
              background: BROWN_LIGHT, border: `1px solid ${BROWN_BORDER}`,
              borderRadius: 10, padding: "6px 14px", margin: "0 0 28px",
              wordBreak: "break-all",
            }}>
              {email}
            </p>

            <p style={{ fontSize: 13, color: "#9a8070", margin: "0 0 24px", lineHeight: 1.6, maxWidth: 280 }}>
              Didn't get it? Check your spam folder, or{" "}
              <span
                onClick={() => { setStep("email"); setError(""); }}
                style={{ color: BROWN, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
              >
                try a different email
              </span>.
            </p>

            <button
              onClick={handleClose}
              style={{
                width: "100%", padding: "14px", borderRadius: 14,
                background: BROWN, color: "#fff",
                fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer",
                letterSpacing: "0.2px", transition: "background 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = BROWN_DARK)}
              onMouseLeave={e => (e.currentTarget.style.background = BROWN)}
            >
              Back to Login
            </button>
          </div>
        )}

        <style>{`
          @keyframes fdIn  { from { opacity:0 } to { opacity:1 } }
          @keyframes suIn  { from { opacity:0; transform:translateY(24px) scale(0.97) }
                             to   { opacity:1; transform:translateY(0)     scale(1)    } }
          @keyframes popIn { from { transform:scale(0.6); opacity:0 }
                             to   { transform:scale(1);   opacity:1 } }
          @keyframes spin  { to   { transform:rotate(360deg) } }
        `}</style>
      </div>
    </div>
  );
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #fdf0e8 0%, #f0c8a0 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 12,
      fontFamily: "'Manrope', sans-serif",
    }}>
      <h1 style={{ fontSize: 26, color: BROWN, margin: "0 0 4px", letterSpacing: "-0.5px" }}>Password Reset</h1>
      <p style={{ fontSize: 14, color: "#7a6050", margin: "0 0 24px" }}>Click below to open the modal</p>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "13px 32px", borderRadius: 14, background: BROWN, color: "#fff",
          fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer",
          boxShadow: "0 8px 24px rgba(139,58,26,0.3)",
          transition: "background 0.2s, transform 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget).style.background = BROWN_DARK; (e.currentTarget).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget).style.background = BROWN; (e.currentTarget).style.transform = "translateY(0)"; }}
      >
        Forgot Password?
      </button>
      <PasswordResetModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}