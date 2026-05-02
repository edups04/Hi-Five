import type { CSSProperties } from "react";

export const homeStyles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    height: "100vh",
    background: "#FAF0E8",
    fontFamily: "'Manrope', sans-serif",
    overflow: "hidden",
  },
  sidebar: {
    width: "210px",
    flexShrink: 0,
    background: "#FAF0E8",
    borderRight: "1px solid #F0D9C8",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "28px 16px 24px",
  },
  sidebarTop: { display: "flex", flexDirection: "column", gap: "32px" },
  mobileTopRow: {
    display: "block",
  },
  mobileActions: {
    display: "none",
  },
  mobileMenuBtn: {
    display: "none",
  },
  brand: { display: "flex", alignItems: "center", gap: "10px", paddingLeft: "4px" },
  brandName: { fontSize: "18px", fontWeight: 800, color: "#3B1A00", letterSpacing: "-0.01em" },
  brandSub: { fontSize: "9px", color: "#C2410C", fontWeight: 700, letterSpacing: "0.1em", marginTop: "1px" },
  nav: { display: "flex", flexDirection: "column", gap: "4px" },
  navItem: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "11px 14px", borderRadius: "10px",
    border: "none", background: "transparent",
    fontSize: "15px", fontWeight: 600, color: "#7A4520",
    cursor: "pointer", textAlign: "left", width: "100%",
    fontFamily: "'Manrope', sans-serif",
    transition: "all 0.15s ease",
  },
  navItemActive: {
    background: "#F97316",
    color: "#fff",
  },
  sidebarBottom: { display: "flex", flexDirection: "column", gap: "8px" },
  newRecBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    background: "#92400E", color: "#fff",
    border: "none", borderRadius: "50px",
    padding: "13px 16px", fontSize: "14px", fontWeight: 700,
    cursor: "pointer", width: "100%",
    fontFamily: "'Manrope', sans-serif",
    transition: "background 0.15s ease, transform 0.1s ease",
  },
  mobileNewRecBtnHidden: {
    display: "none",
  },
  logoutBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    background: "transparent", color: "#9B7355",
    border: "none", padding: "10px",
    fontSize: "14px", fontWeight: 600, cursor: "pointer",
    fontFamily: "'Manrope', sans-serif",
    transition: "color 0.15s ease",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "28px 32px",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  pageTitle: { fontSize: "26px", fontWeight: 800, color: "#C2410C", margin: "0 0 4px", letterSpacing: "-0.01em" },
  pageSubtitle: { fontSize: "13px", color: "#9B7355", margin: 0 },
  avatar: { width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", border: "2px solid #F0D9C8" },
  settingsWrap: {
    paddingTop: "6px",
  },
  cameraWrap: {
    flex: 1,
    position: "relative",
    background: "#111",
    borderRadius: "16px",
    overflow: "hidden",
    minHeight: 0,
  },
  recBadge: {
    position: "absolute", top: "16px", left: "50%",
    transform: "translateX(-50%)",
    background: "#DC2626", color: "#fff",
    borderRadius: "50px", padding: "6px 16px",
    fontSize: "13px", fontWeight: 700,
    display: "flex", alignItems: "center", gap: "8px",
    zIndex: 10, letterSpacing: "0.04em",
    fontFamily: "'Manrope', sans-serif",
  },
  recDot: {
    width: "8px", height: "8px",
    borderRadius: "50%", background: "#fff",
    display: "inline-block",
    animation: "blink 1s infinite",
  },
  tryBadge: {
    position: "absolute", top: "16px", right: "62px",
    background: "rgba(0,0,0,0.7)", color: "#fff",
    borderRadius: "50px", padding: "6px 14px",
    fontSize: "13px", fontWeight: 600,
    display: "flex", alignItems: "center", gap: "6px",
    zIndex: 10, border: "1px solid rgba(255,255,255,0.15)",
    fontFamily: "'Manrope', sans-serif",
  },
  video: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  overlay: {
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at center, #1a1a1a 0%, #000 100%)",
  },
  stopBtn: {
    position: "absolute", bottom: "28px", left: "50%",
    transform: "translateX(-50%)",
    width: "60px", height: "60px", borderRadius: "50%",
    background: "#DC2626", border: "3px solid #fff",
    cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center",
    zIndex: 10, boxShadow: "0 4px 20px rgba(220,38,38,0.5)",
    transition: "transform 0.15s ease",
  },
  startPrompt: {
    position: "absolute", inset: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 5,
  },
  startText: {
    color: "rgba(255,255,255,0.3)", fontSize: "16px",
    fontFamily: "'Manrope', sans-serif",
  },
  avatarFallback: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "#FAF0E8",
    border: "2px solid #F0D9C8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#C2410C",
    fontSize: "21px",
    fontWeight: 800,
    lineHeight: 1,
    textTransform: "uppercase",
  },

  // ===== ASL / ML overlay styles =============================================
  // Added for the live ASL recognition feature. Kept in the same `homeStyles`
  // object so they're imported the same way as everything else.

  // Wrapper that centers the accumulating sentence at the bottom of the video.
  // `bottom: 110px` clears the 60px stop button + its 28px bottom margin.
  subtitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "110px",
    display: "flex",
    justifyContent: "center",
    padding: "0 32px",
    pointerEvents: "none",       // don't block clicks meant for the video
    zIndex: 10,
  },
  // The sentence text itself. Soft drop shadow so it reads on bright backgrounds too.
  subtitleText: {
    color: "#fff",
    fontSize: "clamp(24px, 4vw, 44px)",   // responsive: 24px (mobile) → 44px (desktop)
    fontWeight: 700,
    textAlign: "center",
    margin: 0,
    maxWidth: "100%",
    wordBreak: "break-word",
    letterSpacing: "-0.01em",
    lineHeight: 1.15,
    fontFamily: "'Manrope', sans-serif",
    textShadow:
      "0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6), 0 0 16px rgba(0,0,0,0.4)",
  },

  // Bottom-right Clear button. Same rounded-pill shape as the recording badges.
  clearBtn: {
    position: "absolute",
    right: "20px",
    bottom: "20px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 16px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#fff",
    background: "rgba(0, 0, 0, 0.65)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "50px",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 20,
    fontFamily: "'Manrope', sans-serif",
    letterSpacing: "0.02em",
    transition: "background 0.15s ease, transform 0.1s ease",
  },

  debugOverlay: {
    position: "absolute",
    top: "16px",
    left: "16px",
    padding: "8px 12px",
    fontSize: "12px",
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    color: "#fff",
    background: "rgba(0, 0, 0, 0.65)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 15,
    lineHeight: 1.45,
    minWidth: "110px",
  },
  debugLabelGood: { color: "#4ade80", fontWeight: 700 },   // hand detected — green
  debugLabelNone: { color: "#f87171", fontWeight: 700 },   // no hand — red
  debugFps: { color: "#9ca3af", marginTop: "2px" },        // gray

  fsBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",       // leaves room for the "Try It Out" badge
    width: "36px",
    height: "36px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "50%",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 11,
    padding: 0,
    transition: "background 0.15s ease, transform 0.1s ease",
    fontFamily: "'Manrope', sans-serif",
  },
};

export const homeCss = `
  .nav-item:hover { background: rgba(249,115,22,0.12) !important; color: #C2410C !important; }
  .new-rec-btn:hover { background: #7C3410 !important; transform: translateY(-1px); }
  .logout-btn:hover { color: #C2410C !important; }
  .stop-btn:hover { transform: translateX(-50%) scale(1.08) !important; }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

  /* ASL overlay hover state */
  .asl-clear-btn:hover {
    background: rgba(0, 0, 0, 0.85) !important;
    transform: translateY(-1px);
  }

  /* Fullscreen toggle button hover */
  .asl-fs-btn:hover {
    background: rgba(0, 0, 0, 0.9) !important;
    transform: translateY(-1px);
  }
  .asl-fs-btn:focus { outline: none; }
  .asl-fs-btn:focus-visible {
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.45) !important;
  }
  /* Hide the cursor on the video when fullscreen so it doesn't distract */
  .home-camera-wrap:fullscreen { cursor: default; }
  .home-camera-wrap:fullscreen video { cursor: default; }

  @media (max-width: 900px) {
    .home-root {
      flex-direction: column !important;
      height: auto !important;
      min-height: 100vh !important;
      overflow: auto !important;
    }
    .home-sidebar {
      width: 100% !important;
      border-right: none !important;
      border-bottom: 1px solid #F0D9C8 !important;
      padding: 16px !important;
      gap: 14px !important;
    }
    .home-sidebar-top {
      gap: 14px !important;
    }
    .home-mobile-top-row {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
    }
    .home-mobile-left-group {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      min-width: 0 !important;
    }
    .home-mobile-left-group .home-brand {
      min-width: 0 !important;
    }
    .home-brand img {
      width: 58px !important;
      height: 62px !important;
    }
    .home-mobile-actions {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }
    .home-mobile-avatar,
    .home-mobile-avatar-fallback {
      width: 46px !important;
      height: 46px !important;
    }
    .home-mobile-menu-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 42px !important;
      height: 42px !important;
      border-radius: 10px !important;
      border: 1px solid #E9CDB7 !important;
      background: #fff4ec !important;
      color: #C2410C !important;
      cursor: pointer !important;
      flex-shrink: 0 !important;
    }
    .home-nav {
      display: none !important;
      flex-direction: column !important;
      gap: 8px !important;
      padding-top: 4px !important;
    }
    .home-nav .nav-item {
      width: 100% !important;
      padding: 9px 12px !important;
      font-size: 13px !important;
    }
    .home-sidebar-bottom {
      display: none !important;
      flex-direction: row !important;
      gap: 10px !important;
    }
    .home-sidebar-bottom .new-rec-btn,
    .home-sidebar-bottom .logout-btn {
      flex: 1 !important;
      min-height: 42px !important;
    }
    .home-main {
      padding: 18px 14px !important;
      overflow: visible !important;
      gap: 12px !important;
    }
    .home-mobile-new-rec-btn {
      display: flex !important;
      margin: 2px 0 14px !important;
      width: 100% !important;
    }
    .home-camera-wrap {
      min-height: 48vh !important;
      border-radius: 14px !important;
    }

    .home-mobile-overlay {
      position: fixed !important;
      inset: 0 !important;
      background: rgba(0, 0, 0, 0.28) !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.2s ease !important;
      z-index: 30 !important;
    }
    .home-mobile-overlay-open {
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    .home-mobile-drawer {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      bottom: 0 !important;
      width: min(78vw, 290px) !important;
      background: #FAF0E8 !important;
      border-right: 1px solid #EFD8C7 !important;
      box-shadow: 8px 0 30px rgba(30, 18, 10, 0.12) !important;
      transform: translateX(-104%) !important;
      transition: transform 0.24s ease !important;
      z-index: 40 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-start !important;
      padding: 16px !important;
      gap: 14px !important;
    }
    .home-mobile-drawer-open {
      transform: translateX(0) !important;
    }
    .home-mobile-drawer-top {
      display: flex !important;
      justify-content: flex-end !important;
    }
    .home-mobile-drawer-nav {
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
    }
    .home-mobile-drawer-bottom {
      margin-top: auto !important;
      padding-top: 12px !important;
      border-top: 1px solid #efd9c8 !important;
    }
    .home-mobile-drawer-bottom .logout-btn {
      width: 100% !important;
      justify-content: flex-start !important;
      color: #7A4520 !important;
      border-radius: 10px !important;
      background: transparent !important;
    }
    .home-mobile-drawer-nav .nav-item,
    .home-mobile-drawer-nav .logout-btn {
      width: 100% !important;
    }
    .home-mobile-drawer-nav .logout-btn {
      justify-content: flex-start !important;
      padding: 11px 14px !important;
      color: #7A4520 !important;
      border-radius: 10px !important;
      background: transparent !important;
    }
  }

  @media (min-width: 901px) {
    .home-mobile-overlay,
    .home-mobile-drawer {
      display: none !important;
    }
  }

  @media (max-width: 640px) {
    .home-header {
      margin-bottom: 14px !important;
      align-items: center !important;
    }
    .home-header .home-header-avatar,
    .home-header .home-header-avatar-fallback {
      display: none !important;
    }
    .home-title-wrap h1 {
      font-size: 20px !important;
      margin-bottom: 2px !important;
    }
    .home-title-wrap p {
      font-size: 12px !important;
    }
    .home-rec-badge,
    .home-try-badge {
      top: 10px !important;
      font-size: 11px !important;
      padding: 5px 10px !important;
    }
    .home-try-badge {
      right: 10px !important;
    }
    .home-start-text {
      font-size: 14px !important;
      text-align: center !important;
      padding: 0 16px !important;
    }
    .stop-btn {
      width: 54px !important;
      height: 54px !important;
      bottom: 20px !important;
    }

    /* ASL overlays — shrink to fit smaller stop button */
    .asl-subtitle-wrap {
      bottom: 92px !important;
      padding: 0 16px !important;
    }
    .asl-subtitle-text {
      font-size: clamp(20px, 5vw, 32px) !important;
    }
    .asl-clear-btn {
      right: 12px !important;
      bottom: 12px !important;
      padding: 7px 12px !important;
      font-size: 12px !important;
    }
    .asl-debug-overlay {
      top: 48px !important;
      left: 10px !important;
      font-size: 11px !important;
      padding: 6px 10px !important;
    }
    .asl-fs-btn {
      width: 32px !important;
      height: 32px !important;
      top: 10px !important;
      right: 110px !important;
    }
  }
`;