import { useEffect, useRef, useState } from "react";
import logo from "../assets/Hi-five.png";
import { useNavigate } from "react-router-dom";


const BoltIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="#C2410C" stroke="#C2410C" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

const AccessibilityIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="5" r="2" fill="#C2410C" />
    <path d="M6 9h12M9 9v8M15 9v8M9 13h6" stroke="#C2410C" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 3 L15.5 11 L22 8 L17 14 L22 20 L15.5 17 L14 25 L12.5 17 L6 20 L11 14 L6 8 L12.5 11 Z" fill="#C2410C" />
    <circle cx="22" cy="6" r="2" fill="#C2410C" />
    <circle cx="6" cy="6" r="1.2" fill="#C2410C" />
  </svg>
);

const features = [
  {
    icon: <BoltIcon />,
    title: "Instant",
    description: "Low-latency signing to text conversion.",
  },
  {
    icon: <AccessibilityIcon />,
    title: "Accessible",
    description: "Designed for and with the ASL community.",
  },
  {
    icon: <SparkleIcon />,
    title: "Smart",
    description: "Automatically displays translated ASL into captions.",
  },
];

 
export default function HiFiveLanding() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* Main card */}
      <main style={styles.card} ref={heroRef}>
        {/* Hero */}
        <section
          style={{
            ...styles.hero,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
          }}
          className="fade-in"
        >
          <div style={styles.logoWrap}>
            <img src={logo} alt="Hi-Five logo" style={{ width: "100px", height: "160px" }} />
          </div>

          <h1 style={styles.heading}>Hi–Five</h1>
          <p style={styles.tagline}>Signing made visible</p>

          <p style={styles.body}>
            Hi-Five instantly translates ASL to captions,
            making video creations more inclusive and faster
            for everyone.
          </p>

          <button style={styles.cta} className="cta-btn" onClick={() => navigate("/auth")}>
            <span style={styles.ctaPlay}>▶</span> Try It Out
          </button>
        </section>

        {/* Features */}
        <section
          style={{
            ...styles.features,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(32px)",
            transitionDelay: "0.2s",
          }}
          className="fade-in"
        >
          {features.map((f) => (
            <div key={f.title} style={styles.featureCard} className="feature-card">
              <div style={styles.featureIcon}>{f.icon}</div>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.description}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#FAF0E8",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Georgia', serif",
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0",
    transition: "opacity 0.7s ease, transform 0.7s ease",
    width: "100%",
  },
  logoWrap: {
    marginBottom: "12px",
    filter: "drop-shadow(0 4px 16px rgba(249,115,22,0.25))",
  },
  heading: {
    fontSize: "52px",
    fontWeight: 800,
    color: "#3B1A00",
    margin: "0 0 4px",
    letterSpacing: "-0.02em",
    fontFamily: "'Georgia', serif",
  },
  tagline: {
    fontSize: "16px",
    color: "#8B5C2A",
    margin: "0 0 28px",
    fontWeight: 400,
    letterSpacing: "0.01em",
  },
  body: {
    fontSize: "20px",
    color: "#3B1A00",
    textAlign: "center",
    maxWidth: "480px",
    lineHeight: 1.55,
    margin: "0 0 36px",
    fontWeight: 400,
  },
  cta: {
    background: "#F97316",
    color: "#fff",
    border: "none",
    borderRadius: "50px",
    padding: "18px 52px",
    fontSize: "18px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    letterSpacing: "0.01em",
    marginBottom: "48px",
    boxShadow: "0 4px 24px rgba(249,115,22,0.35)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    fontFamily: "'Georgia', serif",
  },
  ctaPlay: {
    fontSize: "15px",
    opacity: 0.9,
  },
  features: {
    display: "flex",
    justifyContent: "space-around",
    gap: "70px",
    background: "#F5D9C8",
    borderRadius: "20px",
    padding: "40px 45px",
    width: "100%",
    maxWidth: "1000px",
    transition: "opacity 0.7s ease, transform 0.7s ease",
  },
  featureCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    transition: "transform 0.2s ease",
    cursor: "default",
  },
  featureIcon: {
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#3B1A00",
    margin: 0,
    letterSpacing: "0.01em",
    fontFamily: "'Georgia', serif",
  },
  featureDesc: {
    fontSize: "15px",
    color: "#7A4520",
    textAlign: "center",
    margin: 0,
    lineHeight: 1.5,
    maxWidth: "140px",
  },
};

const css = `
  .fade-in {
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .cta-btn:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 8px 32px rgba(249,115,22,0.45) !important;
  }
  .cta-btn:active {
    transform: translateY(0) scale(0.98);
  }
  .feature-card:hover {
    transform: translateY(-4px);
  }
  @media (max-width: 600px) {
    .features-grid {
      flex-direction: column !important;
    }
  }
`;
