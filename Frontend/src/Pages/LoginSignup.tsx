import { useState } from "react";
import logo from "../assets/Hi-five.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="3" stroke="#C2410C" strokeWidth="1.8" />
    <path d="M2 8l10 6 10-6" stroke="#C2410C" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="#C2410C" strokeWidth="1.8" />
    <path d="M8 11V7a4 4 0 018 0v4" stroke="#C2410C" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke="#C2410C" strokeWidth="1.8" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#C2410C" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);


export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  
const handleSubmit = (e) => {
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
    <div style={styles.root}>
      <style>{css}</style>
      <div style={styles.card}>
        {/* Left panel */}
        <div style={styles.left}>
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
        <div style={styles.right}>
          {/* Tabs */}
          <div style={styles.tabs}>
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
          <div style={styles.formWrap}>
            <h3 style={styles.formTitle}>Welcome</h3>
            <p style={styles.formSub}>
              {tab === "login" ? "Log in to continue your journey" : "Create your account to get started"}
            </p>

            {tab === "signup" && (
              <div style={styles.fieldGroup}>
              <form onSubmit={handleSubmit}></form>
                <label style={styles.label}>USERNAME</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}><UserIcon /></span>
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
                <span style={styles.inputIcon}><EmailIcon /></span>
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
                <span style={styles.inputIcon}><LockIcon /></span>
                <input
                  style={styles.input}
                  type="password"
                  placeholder="········"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                />
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
                ← Back to Home
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#FAF0E8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Georgia', serif",
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
    fontFamily: "'Georgia', serif",
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
    fontFamily: "'Georgia', serif",
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
    fontFamily: "'Georgia', serif",
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
    fontFamily: "'Georgia', serif",
  },
  forgotBtn: {
    background: "none",
    border: "none",
    color: "#C2410C",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
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
    fontFamily: "'Georgia', serif",
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
    fontFamily: "'Georgia', serif",
    padding: 0,
  },
};

const css = `
  .auth-input:focus { outline: none; }
  .auth-input::placeholder { color: #C8A882; }
  .submit-btn:hover { background: #7C3410 !important; transform: translateY(-1px); }
  .submit-btn:active { transform: translateY(0); }
  .google-btn:hover { border-color: #F97316 !important; transform: translateY(-1px); }
  .tab-btn:hover { opacity: 0.8; }
  .forgot-btn:hover { text-decoration: underline; }
  .tab:hover { background: #F0D9C8; }
`;