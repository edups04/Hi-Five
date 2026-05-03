import { useState, useEffect } from "react";

import A from "../assets/alphabet/A.png";
import B from "../assets/alphabet/B.png";
import C from "../assets/alphabet/C.png";
import D from "../assets/alphabet/D.png";
import E from "../assets/alphabet/E.png";
import F from "../assets/alphabet/F.png";
import G from "../assets/alphabet/G.png";
import H from "../assets/alphabet/H.png";
import I from "../assets/alphabet/I.png";
import J from "../assets/alphabet/J.png";
import K from "../assets/alphabet/K.png";
import L from "../assets/alphabet/L.png";
import M from "../assets/alphabet/M.png";
import N from "../assets/alphabet/N.png";
import O from "../assets/alphabet/O.png";
import P from "../assets/alphabet/P.png";
import Q from "../assets/alphabet/Q.png";
import R from "../assets/alphabet/R.png";
import S from "../assets/alphabet/S.png";
import T from "../assets/alphabet/T.png";
import U from "../assets/alphabet/U.png";
import V from "../assets/alphabet/V.png";
import W from "../assets/alphabet/W.png";
import X from "../assets/alphabet/X.png";
import Y from "../assets/alphabet/Y.png";
import Z from "../assets/alphabet/Z.png";
import space from "../assets/alphabet/space.png";
import del from "../assets/alphabet/del.png";

const ASL_IMAGES: Record<string, string> = {
  A, B, C, D, E, F, G, H, I, J, K, L, M,
  N, O, P, Q, R, S, T, U, V, W, X, Y, Z, space, del
};

const ASL_LETTERS = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M",
  "N","O","P","Q","R","S","T","U","V","W","X","Y","Z", "space", "del"
];

interface ASLOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export default function ASLOverlay({ visible, onClose }: ASLOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const t = setTimeout(() => setAnimateIn(true), 10);
      return () => clearTimeout(t);
    } else {
      setAnimateIn(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes panelSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes letterPop {
          0% { opacity: 0; transform: scale(0.5) translateY(8px); }
          70% { transform: scale(1.08) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .asl-overlay-bg {
          animation: overlayFadeIn 0.25s ease forwards;
        }
        .asl-panel {
          animation: panelSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .asl-letter-card {
          animation: letterPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }
        .asl-letter-card:hover {
          transform: translateY(-4px) scale(1.08) !important;
        }
        .asl-close-btn:hover {
          background: rgba(255,255,255,0.2) !important;
        }
        .asl-close-btn {
          transition: background 0.2s ease !important;
        }
      `}</style>

      {/* Overlay — only covers the camera area */}
      <div
        className="asl-overlay-bg"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "16px",
          background: "rgba(0, 0, 0, 0.82)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          opacity: animateIn ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Panel */}
        <div
          className="asl-panel"
          style={{
            width: "100%",
            maxWidth: "990px",
            background: "rgba(0, 0, 0, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            borderRadius: "20px",
            padding: "28px 32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(249,115,22,0.1) inset",
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                color: "#ffffff",
                fontFamily: "'Manrope', sans-serif",
                letterSpacing: "-0.01em",
              }}>
                ASL Alphabet
              </h2>
              <p style={{
                margin: "4px 0 0",
                fontSize: "13px",
                fontWeight: 600,
                color: "#ffffff",
                fontFamily: "'Manrope', sans-serif",
              }}>
                Reference guide — hold each sign clearly in view
              </p>
            </div>

            <button
              className="asl-close-btn"
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              ✕
            </button>
          </div>

          {/* Divider */}
          <div style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
            marginBottom: "20px",
          }} />

          {/* Letter grid — 6 per row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "10px",
          }}>
            {ASL_LETTERS.map((letter, i) => (
              <div
                key={letter}
                className="asl-letter-card"
                style={{
                  animationDelay: `${i * 0.025}s`,
                  padding: "8px 4px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "default",
                  transition: "transform 0.2s ease",
                }}
              >
                <img
                  src={ASL_IMAGES[letter]}
                  alt={`ASL sign for ${letter}`}
                  style={{
                    width: "60px",
                    height: "60px",
                    objectFit: "contain",
                  }}
                />
                <span style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#ffffff",
                  fontFamily: "'Manrope', sans-serif",
                  letterSpacing: "-0.01em",
                }}>
                  {letter}
                </span>
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div style={{
            marginTop: "18px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{ fontSize: "14px" }}></span>
            <p style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              fontFamily: "'Manrope', sans-serif",
              letterSpacing: "0.02em",
            }}>
              Tap outside or press ✕ to dismiss
            </p>
          </div>
        </div>
      </div>
    </>
  );
}