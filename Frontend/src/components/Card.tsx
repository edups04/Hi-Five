/* <img src="/Hi-five.png" alt="Hi-Five hand" style={S.icon} /> */
import type { CSSProperties } from "react";
import logo from '../assets/Hi-five.png';

export default function HeroCard() {
  return (
    <div style={S.card}>
      {/* Hand icon - replace src with your actual image */}
      
      <img src={logo} alt="Hi-Five" style={S.icon} />

      <h1 style={S.title}>Hi - Five</h1>

      <p style={S.description}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
        commodo consequat.
      </p>

      <button style={S.btn}>TRY IT OUT</button>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  card: {
    borderRadius: 24,
    padding: "60px 28px 32px",
    maxWidth: 700,
    minHeight: 700,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
    background: "rgba(32, 32, 32, 0.35)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  icon: {
    width: 200,
    height: 200,
    objectFit: "contain",
  },
  title: {
    fontFamily: "sans-serif",
    fontSize: "2rem",
    fontWeight: 800,
    color: "#e8723a",
    margin: 0,
  },
  description: {
    fontFamily: "sans-serif",
    fontSize: 20,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 1.7,
    margin: 0,
  },
  btn: {
    marginTop: 15,
    width: 250,
    height: 70,
    padding: "16px 0",
    background: "#ffffff",
    color: "#000000",
    border: "none",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: 2,
    cursor: "pointer",
  },
};