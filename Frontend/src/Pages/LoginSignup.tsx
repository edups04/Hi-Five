import { useState } from "react";
import logo from "../assets/Hi-five.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { loginSignupCss as css, loginSignupStyles as styles } from "../styles/pages/LoginSignup.styles";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.54 12.24c0-.78-.07-1.53-.2-2.24H12v4.24h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.74h3.56c2.08-1.92 3.27-4.75 3.27-8.05Z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.74c-.99.66-2.24 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.52H2.16v2.84A10.98 10.98 0 0 0 12 23Z" fill="#34A853" />
    <path d="M5.84 14.13c-.22-.66-.35-1.36-.35-2.13s.13-1.47.35-2.13V7.03H2.16A11 11 0 0 0 1 12c0 1.8.43 3.5 1.16 4.97l3.68-2.84Z" fill="#FBBC05" />
    <path d="M12 5.49c1.62 0 3.09.56 4.24 1.65l3.17-3.17A10.97 10.97 0 0 0 12 1C7.68 1 3.9 3.48 2.16 7.03l3.68 2.84C6.71 7.42 9.14 5.49 12 5.49Z" fill="#EA4335" />
  </svg>
);


export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  
const handleSubmit = (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();

  if (tab === "signup") {
    axios.post('http://localhost:3000/signup', { username, email, password })
    .then(result => {
      console.log(result);
      setTab("login");
    })
    .catch(error => console.log(error));

  } else {
    axios.post('http://localhost:3000/login', { email, password })
    .then(result => {
      console.log(result);
      if (result.data === "Success") {
        localStorage.setItem("user", JSON.stringify(result.data));
        navigate("/home");
      }
    })
    .catch(error => console.log(error));
  }
};

  return (
    <div style={styles.root} className="auth-root">
      <style>{css}</style>
      <div style={styles.card} className="auth-card">
        {/* Left panel */}
        <div style={styles.left} className="auth-left">
          <div style={styles.leftContent}>
            <img src={logo} alt="Hi-Five logo" style={{ width: "100px", height: "160px" }} />
            <h2 style={styles.leftTitle}>Hi–Five</h2>
            <p style={styles.leftSub}>Signing made visible</p>
            <div style={styles.quoteBox}>
              <p style={styles.quoteText}>
                "Bridging the gap between ASL signers and the hearing world."
              </p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={styles.right} className="auth-right">
          {/* Tabs */}
          <div style={styles.tabs} className="auth-tabs">
            <button
              style={{ ...styles.tab, ...(tab === "login" ? styles.tabActive : styles.tabInactive) }}
              className="tab-btn"
              onClick={() => setTab("login")}
            >
              Log In
            </button>
            <button
              style={{ ...styles.tab, ...(tab === "signup" ? styles.tabActive : styles.tabInactive) }}
              className="tab-btn"
              onClick={() => setTab("signup")}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <div style={styles.formWrap} className="auth-form-wrap">
            <h3 style={styles.formTitle}>Welcome</h3>
            <p style={styles.formSub}>
              {tab === "login" ? "Log in to continue your journey" : "Create your account to get started"}
            </p>

            {tab === "signup" && (
              <div style={styles.fieldGroup}>
              <form onSubmit={handleSubmit}></form>
                <label style={styles.label}>USERNAME</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}><UserRound size={16} color="#C2410C" strokeWidth={1.8} /></span>
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input"
                  />
                </div>
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>EMAIL ADDRESS</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><Mail size={16} color="#C2410C" strokeWidth={1.8} /></span>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <div style={styles.labelRow}>
                <label style={styles.label}>PASSWORD</label>
                {tab === "login" && (
                  <button style={styles.forgotBtn} className="forgot-btn">Forgot password?</button>
                )}
              </div>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><Lock size={16} color="#C2410C" strokeWidth={1.8} /></span>
                <input
                  style={styles.input}
                  type={showPassword ? "text" : "password"}
                  placeholder="········"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                />
                <button
                  type="button"
                  style={styles.passwordToggleBtn}
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={16} color="#9B7355" strokeWidth={1.9} /> : <Eye size={16} color="#9B7355" strokeWidth={1.9} />}
                </button>
              </div>
            </div>

            <button style={styles.submitBtn} className="submit-btn" onClick={handleSubmit}>
              {tab === "login" ? "Login" : "Create Account"}
            </button>

            <div style={styles.dividerRow}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>OR CONTINUE WITH</span>
              <div style={styles.dividerLine} />
            </div>

            <button style={styles.googleBtn} className="google-btn">
              <GoogleIcon />
              <span>Google</span>
            </button>

            <p style={styles.backText}>
              <button style={styles.backBtn} className="forgot-btn" onClick={() => navigate("/")}>
                Back to Home
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

