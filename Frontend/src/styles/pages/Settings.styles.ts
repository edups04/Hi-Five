import type { CSSProperties } from "react";

export const settingsStyles: Record<string, CSSProperties> = {
	root: {
		display: "flex",
		minHeight: "100vh",
		background: "#FAF0E8",
		fontFamily: "'Manrope', sans-serif",
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
	brand: { display: "flex", alignItems: "center", gap: "10px", paddingLeft: "4px" },
	brandName: { fontSize: "18px", fontWeight: 800, color: "#3B1A00", letterSpacing: "-0.01em" },
	brandSub: { fontSize: "9px", color: "#C2410C", fontWeight: 700, letterSpacing: "0.1em", marginTop: "1px" },
	mobileTopRow: { display: "block" },
	mobileMenuBtn: { display: "none" },
	nav: { display: "flex", flexDirection: "column", gap: "7px" },
	navItem: {
		display: "flex",
		alignItems: "center",
		gap: "10px",
		padding: "11px 14px",
		borderRadius: "10px",
		border: "none",
		background: "transparent",
		fontSize: "15px",
		fontWeight: 600,
		color: "#7A4520",
		cursor: "pointer",
		textAlign: "left",
		width: "100%",
		fontFamily: "'Manrope', sans-serif",
	},
	navItemActive: { background: "#F97316", color: "#fff" },
	sidebarBottom: { display: "flex", flexDirection: "column", gap: "8px" },
	newRecBtn: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "8px",
		background: "#92400E",
		color: "#fff",
		border: "none",
		borderRadius: "50px",
		padding: "13px 16px",
		fontSize: "14px",
		fontWeight: 700,
		cursor: "pointer",
		width: "100%",
		fontFamily: "'Manrope', sans-serif",
		transition: "background 0.15s ease, transform 0.1s ease",
	},
	logoutBtn: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "8px",
		background: "transparent",
		color: "#9B7355",
		border: "none",
		padding: "10px",
		fontSize: "14px",
		fontWeight: 600,
		cursor: "pointer",
		fontFamily: "'Manrope', sans-serif",
	},
	main: {
		flex: 1,
		padding: "24px 26px 32px",
		display: "flex",
		flexDirection: "column",
		gap: "18px",
	},
	topBar: { display: "flex", justifyContent: "space-between", alignItems: "center" },
	pageTitle: { margin: "0 0 4px", color: "#C2410C", fontSize: "26px", fontWeight: 800, letterSpacing: "-0.01em" },
	topAvatar: {
		width: "42px",
		height: "42px",
		borderRadius: "50%",
		border: "2px solid #F59E0B",
		objectFit: "cover",
	},
	topAvatarFallback: {
		width: "42px",
		height: "42px",
		borderRadius: "50%",
		border: "2px solid #F59E0B",
		display: "grid",
		placeItems: "center",
		color: "#92400E",
		fontWeight: 800,
		background: "#F6E0D3",
	},
	profileCard: {
		display: "flex",
		alignItems: "center",
		gap: "24px",
		background: "#F8E8DE",
		borderRadius: "20px",
		padding: "16px 24px",
		minHeight: "168px",
	},
	profileImageWrap: { position: "relative", width: "180px", height: "140px", display: "flex", alignItems: "center", justifyContent: "center" },
	profileImage: {
		width: "130px",
		height: "130px",
		borderRadius: "50%",
		border: "4px solid #F97316",
		objectFit: "cover",
		background: "#f0d1bf",
	},
	profileFallback: {
		width: "130px",
		height: "130px",
		borderRadius: "50%",
		border: "4px solid #F97316",
		display: "grid",
		placeItems: "center",
		background: "#FAF0E8",
		color: "#92400E",
		fontWeight: 800,
		fontSize: "44px",
	},
	imageEditBtn: {
		position: "absolute",
		right: "22px",
		bottom: "8px",
		width: "34px",
		height: "34px",
		borderRadius: "50%",
		border: "none",
		display: "grid",
		placeItems: "center",
		color: "#fff",
		background: "#B45309",
		boxShadow: "0 8px 14px rgba(146, 64, 14, 0.24)",
		cursor: "pointer",
	},
	profileTextWrap: { display: "flex", flexDirection: "column", gap: "6px" },
	profileName: { margin: 0, fontSize: "58px", color: "#3B1A00", fontWeight: 800, lineHeight: 1.02 },
	profileMeta: { margin: 0, color: "#9B7355", fontWeight: 700, fontSize: "38px", letterSpacing: "0.03em" },
	formCard: {
		background: "#EEEEEE",
		borderRadius: "20px",
		padding: "18px 22px",
		boxShadow: "0 12px 24px rgba(59, 26, 0, 0.05)",
	},
	section: { padding: "6px 0 2px" },
	sectionHeader: {
		margin: "0 0 12px",
		fontSize: "16px",
		fontWeight: 700,
		color: "#3B1A00",
		borderLeft: "4px solid #B45309",
		paddingLeft: "10px",
	},
	inputGrid: { display: "grid", gap: "16px", gridTemplateColumns: "1fr 1fr" },
	field: { display: "flex", flexDirection: "column", gap: "6px" },
	label: { color: "#9B7355", fontWeight: 700, fontSize: "13px" },
	input: {
		width: "100%",
		background: "#F6E3D8",
		border: "1px solid transparent",
		borderRadius: "10px",
		padding: "10px 12px",
		minHeight: "44px",
		outline: "none",
		color: "#7C2D12",
		fontSize: "14px",
		fontWeight: 600,
		fontFamily: "'Manrope', sans-serif",
	},
	inputLockedWrap: { position: "relative" },
	lockIcon: { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#A78B7A" },
	divider: { border: "none", borderTop: "1px solid #E3D8D2", margin: "6px 0 10px" },
	actions: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", gap: "10px" },
	actionBtn: {
		minHeight: "44px",
		borderRadius: "999px",
		border: "1px solid #E7C9B6",
		background: "#fff0e7",
		color: "#9B7355",
		fontWeight: 800,
		letterSpacing: "0.04em",
		fontSize: "13px",
		padding: "0 22px",
		cursor: "pointer",
		textTransform: "uppercase",
		fontFamily: "'Manrope', sans-serif",
	},
	actionBtnPrimary: {
		border: "none",
		background: "#B45309",
		color: "#fff",
		boxShadow: "0 10px 18px rgba(146, 64, 14, 0.26)",
	},
	actionBtnDanger: {
		border: "1px solid #E9BDA8",
		color: "#D9480F",
		background: "transparent",
		borderRadius: "10px",
		minHeight: "36px",
		minWidth: "100px",
		fontSize: "13px",
		fontWeight: 800,
		cursor: "pointer",
		fontFamily: "'Manrope', sans-serif",
	},
	dangerCard: {
		maxWidth: "780px",
		margin: "2px auto 0",
		width: "100%",
		border: "1px solid #F1D1BF",
		borderRadius: "14px",
		background: "#F8E8DE",
		padding: "10px 16px",
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "12px",
	},
	dangerTitle: { margin: "0 0 2px", color: "#D9480F", fontWeight: 800, fontSize: "15px" },
	dangerText: { margin: 0, color: "#9B7355", fontSize: "13px" },
	passwordWrap: { position: "relative" },
	eyeBtn: {
		position: "absolute",
		right: "10px",
		top: "50%",
		transform: "translateY(-50%)",
		background: "none",
		border: "none",
		padding: 0,
		cursor: "pointer",
		color: "#A78B7A",
		display: "grid",
		placeItems: "center",
	},
};

export const settingsCss = `
	.settings-nav-item:hover { background: rgba(249, 115, 22, 0.12) !important; color: #C2410C !important; }
	.settings-input:focus { border-color: #F97316 !important; background: #fff2ea !important; }
	.settings-primary-btn:hover { background: #92400E !important; }
	.settings-secondary-btn:hover { background: #ffe7d8 !important; }
	.settings-danger-btn:hover { background: #fff0ea !important; }
	.settings-new-recording-btn:hover { background: #7C3410 !important; }
	.settings-logout-btn:hover { color: #C2410C !important; }

	@media (max-width: 1200px) {
		.settings-page-title { font-size: 22px !important; }
		.settings-profile-name { font-size: 46px !important; }
		.settings-profile-meta { font-size: 22px !important; }
		.settings-danger-title { font-size: 15px !important; }
		.settings-danger-text { font-size: 13px !important; }
	}

	@media (max-width: 980px) {
		.settings-root { flex-direction: column !important; }
		.settings-sidebar {
			width: 100% !important;
			border-right: none !important;
			border-bottom: 1px solid #F0D9C8 !important;
			padding: 14px 16px !important;
		}
		.settings-sidebar-top { gap: 0 !important; }
		.settings-mobile-top-row {
			display: flex !important;
			align-items: center !important;
			gap: 10px !important;
		}
		.settings-mobile-left-group {
			display: flex !important;
			align-items: center !important;
			gap: 10px !important;
		}
		.settings-mobile-menu-btn {
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
		.settings-nav { display: none !important; }
		.settings-sidebar-bottom { display: none !important; }
		.settings-brand img { height: 62px !important; }
		.settings-main { padding: 16px !important; }
		.settings-profile-card {
			flex-direction: column !important;
			align-items: flex-start !important;
			min-height: auto !important;
			padding: 16px !important;
		}
		.settings-profile-name { font-size: 36px !important; }
		.settings-profile-meta { font-size: 11px !important; }
		.settings-mobile-overlay {
			position: fixed !important;
			inset: 0 !important;
			background: rgba(0,0,0,0.28) !important;
			opacity: 0 !important;
			pointer-events: none !important;
			transition: opacity 0.2s ease !important;
			z-index: 30 !important;
		}
		.settings-mobile-overlay-open {
			opacity: 1 !important;
			pointer-events: auto !important;
		}
		.settings-mobile-drawer {
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			bottom: 0 !important;
			width: min(78vw, 290px) !important;
			background: #FAF0E8 !important;
			border-right: 1px solid #EFD8C7 !important;
			box-shadow: 8px 0 30px rgba(30,18,10,0.12) !important;
			transform: translateX(-104%) !important;
			transition: transform 0.24s ease !important;
			z-index: 40 !important;
			display: flex !important;
			flex-direction: column !important;
			padding: 16px !important;
			gap: 14px !important;
		}
		.settings-mobile-drawer-open { transform: translateX(0) !important; }
		.settings-mobile-drawer-top {
			display: flex !important;
			justify-content: flex-end !important;
		}
		.settings-mobile-drawer-nav {
			display: flex !important;
			flex-direction: column !important;
			gap: 8px !important;
		}
		.settings-mobile-drawer-bottom {
			margin-top: auto !important;
			padding-top: 12px !important;
			border-top: 1px solid #efd9c8 !important;
		}
	}

	@media (min-width: 981px) {
		.settings-mobile-overlay,
		.settings-mobile-drawer { display: none !important; }
	}

	@media (max-width: 680px) {
		.settings-input-grid { grid-template-columns: 1fr !important; }
		.settings-top-avatar { display: none !important; }
		.settings-danger-card {
			flex-direction: column !important;
			align-items: flex-start !important;
		}
		.settings-danger-card .settings-danger-btn { width: 100% !important; }
		.settings-actions { flex-direction: column !important; align-items: stretch !important; }
		.settings-actions .settings-primary-btn,
		.settings-actions .settings-secondary-btn { width: 100% !important; }
	}
`;
