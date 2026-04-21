    import type { CSSProperties } from "react";

    export const authSuccessStyles: Record<string, CSSProperties> = {
    root: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F2E6DF",
        padding: "20px",
        fontFamily: "'Manrope', sans-serif",
    },
    frame: {
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    card: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        textAlign: "center",
        padding: 0,
    },
    logo: {
        width: "68px",
        height: "68px",
        objectFit: "contain",
    },
    title: {
        margin: 0,
        color: "#4A2A16",
        fontSize: "54px",
        lineHeight: 1,
        fontWeight: 800,
        letterSpacing: "-0.02em",
    },
    subtitle: {
        margin: 0,
        color: "#8F6648",
        fontSize: "31px",
        lineHeight: 1.2,
        fontWeight: 500,
    },
    spinner: {
        marginTop: "28px",
        width: "54px",
        height: "54px",
        borderRadius: "50%",
        border: "4px solid rgba(245, 126, 36, 0.28)",
        borderTopColor: "#F57E24",
        animation: "auth-ring-spin 0.9s linear infinite",
    },
    };

    export const authSuccessCss = `
    @keyframes auth-ring-spin {
        to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
        .auth-success-root {
        padding: 14px !important;
        }

        .auth-success-frame {
        min-height: calc(100vh - 28px) !important;
        }

        .auth-success-title {
        font-size: 40px !important;
        }

        .auth-success-subtitle {
        font-size: 24px !important;
        }
    }

    @media (max-width: 480px) {
        .auth-success-frame {
        min-height: calc(100vh - 28px) !important;
        }

        .auth-success-title {
        font-size: 34px !important;
        }

        .auth-success-subtitle {
        font-size: 20px !important;
        }

        .auth-success-spinner {
        width: 48px !important;
        height: 48px !important;
        }
    }
    `;
