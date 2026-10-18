import type { CSSProperties } from "react";

export const indexStyles: Record<string, CSSProperties> = {
  root: {
    display: "flex", height: "100vh",
    fontFamily: "'Manrope', sans-serif",
    background: "#FAF0E8", overflow: "hidden",
  },
  sidebar: {
    width: "210px", flexShrink: 0,
    background: "#FAF0E8", borderRight: "1px solid #F0D9C8",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: "28px 16px 24px", height: "100vh",
    position: "sticky", top: 0,
  },
  sidebarTop: { display: "flex", flexDirection: "column", gap: "32px" },
  sidebarBottom: { display: "flex", flexDirection: "column", gap: "8px" },
  brand: { display: "flex", alignItems: "center", gap: "10px", paddingLeft: "4px" },
  brandLogo: { width: "60px", height: "90px" },
  brandName: { fontSize: "18px", fontWeight: 800, color: "#3B1A00", letterSpacing: "-0.01em" },
  brandSub: { fontSize: "9px", color: "#C2410C", fontWeight: 700, letterSpacing: "0.1em", marginTop: "1px" },
  nav: { display: "flex", flexDirection: "column", gap: "4px" },
  navItem: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "11px 14px", borderRadius: "10px",
    border: "none", background: "transparent",
    fontSize: "15px", fontWeight: 600, color: "#7A4520",
    cursor: "pointer", textAlign: "left", width: "100%",
    fontFamily: "'Manrope', sans-serif", transition: "all 0.15s ease",
  },
  navItemActive: { background: "#F97316", color: "#fff" },
  navItemInactive: { background: "transparent", color: "#7A4520" },
  navIconActive: { color: "#fff" },
  navIconInactive: { color: "#C2410C" },
  logoutBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    background: "transparent", color: "#9B7355",
    border: "none", padding: "10px",
    fontSize: "14px", fontWeight: 600, cursor: "pointer",
    fontFamily: "'Manrope', sans-serif", transition: "color 0.15s ease",
  },
  topbar: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "14px 20px",
    background: "#FAF0E8",
  },
  topbarUsername: { fontSize: "14px", color: "#9B7355", fontWeight: 600, marginLeft: "auto" },
  mobileMenuBtn: {
    display: "none",
    alignItems: "center", justifyContent: "center",
    width: "42px", height: "42px", borderRadius: "10px",
    border: "1px solid #E9CDB7", background: "#fff4ec",
    color: "#C2410C", cursor: "pointer", flexShrink: 0,
  },
};

export const adminCss = `
  * { box-sizing: border-box; }
  .admin-nav-item:hover { background: rgba(249,115,22,0.12) !important; color: #C2410C !important; }
  .admin-logout-btn:hover { color: #C2410C !important; }
  .admin-action-btn:hover { background: #7C3410 !important; transform: translateY(-1px); }
  .admin-table-row:hover { background: #FDF5EE !important; }
  .admin-icon-btn:hover { background: rgba(249,115,22,0.12) !important; }
  .admin-filter-btn:hover { background: rgba(146,64,14,0.12) !important; color: #92400E !important; }
  .admin-page-btn:hover { background: #FDF0E8 !important; }
  .admin-delete-btn:hover { background: #FCA5A5 !important; }
  .admin-export-btn:hover { background: #F0D9C8 !important; }
  input:focus, select:focus { outline: none !important; border-color: #F97316 !important; }

  .admin-mobile-overlay {
    display: none;
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.28);
    z-index: 30; opacity: 0; pointer-events: none;
    transition: opacity 0.2s ease;
  }
  .admin-mobile-overlay-open { opacity: 1 !important; pointer-events: auto !important; }
  .admin-mobile-drawer {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: min(78vw, 260px);
    background: #FAF0E8; border-right: 1px solid #F0D9C8;
    box-shadow: 8px 0 30px rgba(30,18,10,0.12);
    transform: translateX(-104%); transition: transform 0.24s ease;
    z-index: 40; display: flex; flex-direction: column;
    padding: 16px; gap: 14px;
  }
  .admin-mobile-drawer-open { transform: translateX(0) !important; }
  .admin-mobile-menu-btn { display: none !important; }
  .admin-sidebar { display: flex !important; }

  @media (max-width: 900px) {
    .admin-sidebar { display: none !important; }
    .admin-mobile-menu-btn {
      display: inline-flex !important; align-items: center !important;
      justify-content: center !important; width: 42px !important;
      height: 42px !important; border-radius: 10px !important;
      border: 1px solid #E9CDB7 !important; background: #fff4ec !important;
      color: #C2410C !important; cursor: pointer !important; flex-shrink: 0 !important;
    }
    .admin-mobile-overlay { display: block !important; }
    .admin-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .admin-content { padding: 18px 14px !important; }
    .admin-table-wrap { overflow-x: auto !important; }
    .admin-logs-filters { flex-direction: column !important; }
    .admin-topbar { padding: 14px 16px !important; }
  }

  @media (min-width: 901px) {
    .admin-mobile-overlay, .admin-mobile-drawer { display: none !important; }
  }

  @media (max-width: 600px) {
    .admin-stat-grid { grid-template-columns: 1fr 1fr !important; }
    .admin-page-title { font-size: 20px !important; }
    .admin-user-mgmt-top { flex-direction: column !important; align-items: flex-start !important; }
  }
`;
