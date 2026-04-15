import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import logo from '../assets/Hi-five.png';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <div style={S.wrapper}>
      <nav style={S.nav}>
        {/* Brand */}
        <div style={S.brand}>
          <img src={logo} alt="Hi-Five" style={S.logo} />
          <span style={S.brandTitle}>Hi - Five</span>
        </div>

        {/* Buttons */}
        <div style={S.actions}>
          <button style={S.logInBtn} onClick={() => navigate("/login")}>LOG IN</button>
          <button style={S.signUpBtn} onClick={() => navigate("/signup")}>SIGN UP</button>
        </div>
      </nav>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  wrapper: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    padding: 0,
    display: "flex",
    justifyContent: "center",
    zIndex: 100,
    pointerEvents: "none",
  },
  nav: {
    pointerEvents: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    width: "100%",
    height: 98,
    background: "rgba(32, 32, 32, 0.35)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  logo: {
  width: 70,
  height: 70,
  objectFit: "contain",
  marginRight: 10,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    paddingLeft: 200,
  },
  brandTitle: {
    fontFamily: "sans-serif",
    fontSize: "2.9rem",
    fontWeight: 800,
    color: "#e8723a",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logInBtn: {
    padding: "15px 54px",
    background: "#ffffff",
    color: "#000000",
    border: "none",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 17,
    cursor: "pointer",
    letterSpacing: 1,
  },
  signUpBtn: {
    padding: "15px 55px",
    background: "#2a2a2e",
    color: "#e8e6e1",
    border: "none",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 17,
    cursor: "pointer",
    letterSpacing: 1,
  },
};