import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import {
  resetPasswordStyles as styles, resetPasswordCss as css, BROWN, BROWN_DARK,
  } from "../styles/pages/ResetPassword.styles";

type Step = "reset" | "success";

export default function ResetPassword() {
  const { id } = useParams();
  const token = window.location.pathname.split("/").pop();
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

  return (
    <div style={styles.root}>
      <style>{css}</style>
      <div style={styles.card}>
        {/* Top accent bar */}
        <div style={styles.accentBar} />

        {step === "reset" ? (
          <div style={styles.resetPanel}>
            {/* Icon */}
            <div style={styles.iconWrap}>
              <Lock size={28} color={BROWN} strokeWidth={1.8} />
            </div>

            <h2 style={styles.heading}>Create new password</h2>
            <p style={styles.subText}>
              Set a new, strong password for your account to keep it secure.
            </p>

            <form onSubmit={handleSubmit}>
              {/* New Password */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>New password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIconLeft}>
                    <Lock size={16} color={BROWN} strokeWidth={1.8} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="········"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    className="reset-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    style={styles.toggleBtn}
                  >
                    {showPassword
                      ? <EyeOff size={16} color="#9B7355" strokeWidth={1.9} />
                      : <Eye size={16} color="#9B7355" strokeWidth={1.9} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={error ? styles.fieldGroup : styles.fieldGroupNoError}>
                <label style={styles.label}>Confirm password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIconLeft}>
                    <Lock size={16} color={BROWN} strokeWidth={1.8} />
                  </span>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="········"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={styles.input}
                    className="reset-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    style={styles.toggleBtn}
                  >
                    {showConfirm
                      ? <EyeOff size={16} color="#9B7355" strokeWidth={1.9} />
                      : <Eye size={16} color="#9B7355" strokeWidth={1.9} />}
                  </button>
                </div>
              </div>

              {error && (
                <p style={styles.errorText}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#e53e3e">
                    <circle cx="12" cy="12" r="12" />
                    <text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
                  </svg>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={loading ? styles.submitBtnLoading : styles.submitBtn}
                className={loading ? undefined : "reset-submit-btn"}
              >
                {loading ? "Saving..." : "Save password"}
              </button>
            </form>
          </div>
        ) : (
          <div style={styles.successPanel}>
            <div style={styles.successIconWrap}>
              <CheckCircle size={40} color="#3B6D11" strokeWidth={1.8} />
            </div>

            <h2 style={styles.successHeading}>Password changed</h2>
            <p style={styles.successSubText}>
              Your password has been successfully updated. You can now use your new password to log in.
            </p>

            <button
              onClick={() => navigate("/auth")}
              style={styles.backBtn}
              className="reset-back-btn"
            >
              Back to log in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}