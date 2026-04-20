import { useEffect, useRef, useState } from "react";
import logo from "../assets/Hi-five.png";
import { useNavigate } from "react-router-dom";
import { Accessibility, Bolt, Sparkles } from "lucide-react";
import { landingCss as css, landingStyles as styles } from "../styles/pages/Landing.styles";

const features = [
  {
    icon: Bolt,
    title: "Instant",
    description: "Low-latency signing to text conversion.",
  },
  {
    icon: Accessibility,
    title: "Accessible",
    description: "Designed for and with the ASL community.",
  },
  {
    icon: Sparkles,
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
    <div style={styles.root} className="landing-root">
      <style>{css}</style>

      {/* Main card */}
      <main style={styles.card} ref={heroRef} className="landing-card">
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
          className="fade-in features-grid"
        >
          {features.map((f) => (
            <div key={f.title} style={styles.featureCard} className="feature-card">
              <div style={styles.featureIcon}>
                <f.icon size={28} color="#C2410C" strokeWidth={1.8} />
              </div>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.description}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}


