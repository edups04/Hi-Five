import type { CSSProperties } from "react";

export const landingStyles: Record<string, CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#FAF0E8",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Manrope', sans-serif",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "1060px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
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
    fontFamily: "'Manrope', sans-serif",
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
    fontFamily: "'Manrope', sans-serif",
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
    fontFamily: "'Manrope', sans-serif",
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

export const landingCss = `
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

  @media (max-width: 900px) {
    .landing-card {
      max-width: 760px !important;
    }
    .features-grid {
      gap: 20px !important;
      padding: 26px 20px !important;
    }
  }

  @media (max-width: 600px) {
    .landing-root {
      padding: 14px !important;
      justify-content: flex-start !important;
    }
    .landing-card {
      gap: 12px !important;
    }
    .landing-card h1 {
      font-size: 38px !important;
      text-align: center !important;
    }
    .landing-card p {
      text-align: center !important;
    }
    .landing-card button {
      width: 100% !important;
      justify-content: center !important;
      padding: 14px 24px !important;
      font-size: 16px !important;
      margin-bottom: 28px !important;
    }
    .features-grid {
      flex-direction: column !important;
      gap: 18px !important;
      border-radius: 16px !important;
      padding: 18px 14px !important;
    }
    .features-grid .feature-card {
      padding: 2px 8px !important;
    }
    .features-grid .feature-title,
    .features-grid h3 {
      font-size: 17px !important;
    }
    .features-grid .feature-desc,
    .features-grid p {
      max-width: 100% !important;
      font-size: 14px !important;
    }
  }
`;
