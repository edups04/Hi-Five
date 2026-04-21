import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";

type Step = "reset" | "success";

const BROWN = "#8B3A1A";
const BROWN_DARK = "#6B2A10";
const BROWN_LIGHT = "#FDF0E8";
const BROWN_BORDER = "#E8C9B0";

export default function ResetPassword() {
  const { id } = useParams();
  const token = window.location.pathname.split('/').pop();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("reset");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`http://localhost:3000/reset-password/${id}/${token}`, { password });
      if (res.data.Status === "Success") {
        setStep("success");
      } else {
        setError(res.data.Status || "Something went wrong. Please try again.");
      }
    } catch (err: any) {
      setError(err.response?.data?.Status || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 44px",
    boxSizing: "border-box",
    border: `1.5px solid ${BROWN_BORDER}`,
    borderRadius: 14,
    background: BROWN_LIGHT,
    fontSize: 14,
    color: "#2a1a10",
    outline: "none",
    fontFamily: "inherit",
    transition: "border 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAF0E8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      fontFamily: "'Manrope', sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 28,
        width: "100%",
        maxWidth: 400,
        overflow: "hidden",
        boxShadow: "0 40px 80px rgba(139,58,26,0.18), 0 8px 24px rgba(0,0,0,0.08)",
      }}>
        {/* Top accent bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${BROWN_DARK}, ${BROWN}, #c4622a)` }} />

        {step === "reset" ? (
          <div style={{ padding: "36px 36px 32px" }}>
            {/* Icon */}
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: BROWN_LIGHT, border: `1.5px solid ${BROWN_BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24,
            }}>
              <Lock size={28} color={BROWN} strokeWidth={1.8} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a10", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
              Create new password
            </h2>
            <p style={{ fontSize: 14, color: "#7a6050", margin: "0 0 28px", lineHeight: 1.6 }}>
              Set a new, strong password for your account to keep it secure.
            </p>

            <form onSubmit={handleSubmit}>
              {/* New Password */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a3a2a", letterSpacing: "0.6px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  New password
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <Lock size={16} color={BROWN} strokeWidth={1.8} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="········"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = BROWN)}
                    onBlur={e => (e.target.style.borderColor = BROWN_BORDER)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={16} color="#9B7355" strokeWidth={1.9} /> : <Eye size={16} color="#9B7355" strokeWidth={1.9} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: error ? 8 : 24 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#5a3a2a", letterSpacing: "0.6px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  Confirm password
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <Lock size={16} color={BROWN} strokeWidth={1.8} />
                  </span>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="········"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = BROWN)}
                    onBlur={e => (e.target.style.borderColor = BROWN_BORDER)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(p => !p)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {showConfirm ? <EyeOff size={16} color="#9B7355" strokeWidth={1.9} /> : <Eye size={16} color="#9B7355" strokeWidth={1.9} />}
                  </button>
                </div>
              </div>

              {error && (
                <p style={{ fontSize: 12, color: "#e53e3e", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#e53e3e"><circle cx="12" cy="12" r="12" /><text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text></svg>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: 14, borderRadius: 14,
                  background: loading ? "#c4855a" : BROWN,
                  color: "#fff", fontSize: 15, fontWeight: 700,
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.2px", transition: "background 0.2s",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget).style.background = BROWN_DARK; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget).style.background = BROWN; }}
              >
                {loading ? "Saving..." : "Save password"}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ padding: "40px 36px 36px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{
              width: 90, height: 90, borderRadius: 24,
              background: "#EAF3DE", border: "1.5px solid #C0DD97",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24,
            }}>
              <CheckCircle size={40} color="#3B6D11" strokeWidth={1.8} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a10", margin: "0 0 10px", letterSpacing: "-0.4px" }}>
              Password changed
            </h2>
            <p style={{ fontSize: 14, color: "#7a6050", margin: "0 0 28px", lineHeight: 1.65, maxWidth: 280 }}>
              Your password has been successfully updated. You can now use your new password to log in.
            </p>

            <button
              onClick={() => navigate("/auth")}
              style={{
                width: "100%", padding: 14, borderRadius: 14,
                background: BROWN, color: "#fff",
                fontSize: 15, fontWeight: 700,
                border: "none", cursor: "pointer",
                letterSpacing: "0.2px", transition: "background 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = BROWN_DARK)}
              onMouseLeave={e => (e.currentTarget.style.background = BROWN)}
            >
              Back to log in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}