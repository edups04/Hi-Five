    import type { CSSProperties } from "react";

    export const libraryStyles: Record<string, CSSProperties> = {
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
    mobileTopRow: { display: "block" },
    mobileActions: { display: "none" },
    mobileMenuBtn: { display: "none" },
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
    avatar: { width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", border: "2px solid #F0D9C8" },
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
    libraryWrap: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "auto",
    },
    libraryHeader: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "18px",
        marginBottom: "16px",
    },
    libraryTitle: {
        margin: "0 0 4px",
        color: "#C2410C",
        fontSize: "26px",
        fontWeight: 800,
        letterSpacing: "-0.01em",
    },
    librarySubtitle: {
        margin: "6px 0 0",
        color: "#8D6344",
        fontSize: "14px",
        fontWeight: 600,
    },
    libraryTools: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    searchWrap: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minWidth: "220px",
        width: "220px",
        background: "#F3D9C5",
        border: "1px solid #EBC9AF",
        borderRadius: "999px",
        padding: "10px 14px",
    },
    searchInput: {
        border: "none",
        outline: "none",
        background: "transparent",
        fontSize: "14px",
        color: "#6D492F",
        width: "100%",
        fontFamily: "'Manrope', sans-serif",
    },
    libraryGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "16px",
    },
    recordCard: {
        background: "#fff",
        borderRadius: "30px",
        overflow: "hidden",
        border: "1px solid #F0DDD1",
        boxShadow: "0 8px 22px rgba(64, 34, 12, 0.07)",
    },
    recordPreview: {
        position: "relative",
        height: "240px",
        background: "radial-gradient(ellipse at center, #1d2735 0%, #05070b 100%)",
    },
    durationPill: {
        position: "absolute",
        left: "16px",
        bottom: "12px",
        background: "#A84B0E",
        color: "#fff",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.01em",
        padding: "3px 10px",
        borderRadius: "999px",
    },
    deleteBtn: {
        position: "absolute",
        right: "14px",
        bottom: "10px",
        border: "none",
        background: "transparent",
        color: "#E4B183",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
    },
    recordMetaRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "18px 20px 20px",
    },
    recordTitle: {
        margin: 0,
        color: "#4B2A14",
        fontSize: "37px",
        lineHeight: 1,
        letterSpacing: "-0.02em",
        fontWeight: 800,
    },
    recordMeta: {
        margin: "5px 0 0",
        color: "#9B7355",
        fontSize: "13px",
        fontWeight: 600,
    },
    recordActions: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    recordActionBtn: {
        border: "none",
        borderRadius: "14px",
        padding: "10px 16px",
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        fontSize: "16px",
        fontWeight: 800,
        cursor: "pointer",
        fontFamily: "'Manrope', sans-serif",
    },
    playActionBtn: {
        background: "#FF841E",
        color: "#3A200F",
    },
    editActionBtn: {
        background: "#F0D1BD",
        color: "#6F4120",
    },
    };

    export const libraryCss = `
    .nav-item:hover { background: rgba(249,115,22,0.12) !important; color: #C2410C !important; }
    .new-rec-btn:hover { background: #7C3410 !important; transform: translateY(-1px); }
    .logout-btn:hover { color: #C2410C !important; }
    .home-library-search input::placeholder { color: #B28763; }
    .home-record-preview-first {
        background:
        radial-gradient(circle at 32% 24%, rgba(255, 195, 150, 0.22) 0%, rgba(255, 195, 150, 0) 28%),
        linear-gradient(145deg, #1E2B3C 0%, #0A1118 55%, #05070B 100%);
    }
    .home-action-btn { transition: transform 0.15s ease, filter 0.15s ease; }
    .home-action-btn:hover { transform: translateY(-1px); filter: brightness(0.98); }
    .home-delete-btn:hover { color: #F4CDA9 !important; }

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
        .home-main {
        padding: 18px 14px !important;
        overflow: visible !important;
        gap: 12px !important;
        }
        .home-library-title {
        font-size: 32px !important;
        }
        .home-library-header {
        flex-direction: column !important;
        align-items: stretch !important;
        margin-bottom: 14px !important;
        gap: 12px !important;
        }
        .home-library-tools {
        justify-content: space-between !important;
        width: 100% !important;
        }
        .home-library-tools .home-header-avatar,
        .home-library-tools .home-header-avatar-fallback {
        display: none !important;
        }
        .home-library-search {
        flex: 1 !important;
        width: auto !important;
        min-width: 0 !important;
        }
        .home-library-grid {
        grid-template-columns: 1fr !important;
        gap: 14px !important;
        }
        .home-record-preview {
        height: 190px !important;
        }
        .home-record-card h3 {
        font-size: 30px !important;
        }
        .home-record-card p {
        font-size: 12px !important;
        }
        .home-record-card .home-action-btn {
        font-size: 14px !important;
        padding: 9px 14px !important;
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
    }

    @media (min-width: 901px) {
        .home-mobile-overlay,
        .home-mobile-drawer {
        display: none !important;
        }
    }

    @media (max-width: 640px) {
        .home-library-title {
        font-size: 27px !important;
        }
        .home-library-subtitle {
        font-size: 12px !important;
        }
        .home-record-preview {
        height: 170px !important;
        }
        .home-record-card {
        border-radius: 20px !important;
        }
        .home-record-card .home-record-meta-row {
        flex-direction: column !important;
        align-items: flex-start !important;
        }
    }
    `;
