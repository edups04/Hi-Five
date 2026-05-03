import { useState } from "react";
import logo from "../assets/Hi-five.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { loginSignupCss as css, loginSignupStyles as styles } from "../styles/pages/LoginSignup.styles";
import Google from "../assets/google-logo.png";
import { PasswordResetModal } from "../Modals/SendPasswordReset";


export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); 

  
const handleSubmit = (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();

  if (tab === "signup") {
    axios.post('${API_URL}/signup', { username, email, password })
    .then(result => {
      console.log(result.data);
      if(result.data.success) {        
        alert("Account created! Please log in.");
        setTab("login");
      } else {
        alert(result.data.message);    
      }
    })
    .catch(error => console.log(error));

  } else {
    axios.post('${API_URL}/login', { email, password })
    .then(result => {
      console.log(result.data);
      if (result.data.success) {
        localStorage.setItem("accessToken", result.data.token);
        navigate(`/auth-success?token=${result.data.token}`);
      } else {
        alert(result.data.message);
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
              {tab === "login" ? "Log in to continue your journey" : "Create your account to start your journey"}
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
                                    <button
                    type="button"
                    style={styles.forgotBtn}
                    className="forgot-btn"
                    onClick={() => setOpen(true)} // 👈 3. Open modal on click
                  >
                    Forgot password?
                  </button>
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
            </div>

            <button
              onClick={()=>window.open('${API_URL}/auth/google', "_self")}
              style={styles.googleBtn}
              className="google-btn"
            >
              <img src={Google} alt="Google Logo" style={{ width: "30px", height: "32px" }} />
              Continue with Google
            </button>

            <p style={styles.backText}>
              <button style={styles.backBtn} className="forgot-btn" onClick={() => navigate("/")}>
                Back to Home
              </button>
            </p>
          </div>
        </div>
      </div>
      <PasswordResetModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

