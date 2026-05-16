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
import aslSpace from "../assets/alphabet/space.png";
import aslDel from "../assets/alphabet/del.png";

import FA from "../assets/fsl_alphabet/A.png";
import FB from "../assets/fsl_alphabet/B.png";
import FC from "../assets/fsl_alphabet/C.png";
import FD from "../assets/fsl_alphabet/D.png";
import FE from "../assets/fsl_alphabet/E.png";
import FF from "../assets/fsl_alphabet/F.png";
import FG from "../assets/fsl_alphabet/G.png";
import FH from "../assets/fsl_alphabet/H.png";
import FI from "../assets/fsl_alphabet/I.png";
import FJ from "../assets/fsl_alphabet/J.png";
import FK from "../assets/fsl_alphabet/K.png";
import FL from "../assets/fsl_alphabet/L.png";
import FM from "../assets/fsl_alphabet/M.png";
import FN from "../assets/fsl_alphabet/N.png";
import FO from "../assets/fsl_alphabet/O.png";
import FP from "../assets/fsl_alphabet/P.png";
import FQ from "../assets/fsl_alphabet/Q.png";
import FR from "../assets/fsl_alphabet/R.png";
import FS from "../assets/fsl_alphabet/S.png";
import FT from "../assets/fsl_alphabet/T.png";
import FU from "../assets/fsl_alphabet/U.png";
import FV from "../assets/fsl_alphabet/V.png";
import FW from "../assets/fsl_alphabet/W.png";
import FX from "../assets/fsl_alphabet/X.png";
import FY from "../assets/fsl_alphabet/Y.png";
import FZ from "../assets/fsl_alphabet/Z.png";
import fslSpace from "../assets/alphabet/space.png";
import fslDel from "../assets/alphabet/del.png";

const ASL_IMAGES: Record<string, string> = {
  A, B, C, D, E, F, G, H, I, J, K, L, M,
  N, O, P, Q, R, S, T, U, V, W, X, Y, Z,
  space: aslSpace, del: aslDel,
};

const FSL_IMAGES: Record<string, string> = {
  A: FA, B: FB, C: FC, D: FD, E: FE, F: FF, G: FG, H: FH,
  I: FI, J: FJ, K: FK, L: FL, M: FM, N: FN, O: FO, P: FP,
  Q: FQ, R: FR, S: FS, T: FT, U: FU, V: FV, W: FW, X: FX,
  Y: FY, Z: FZ, space: fslSpace, del: fslDel,
};

const LETTERS = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M",
  "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
  "space", "del",
];

type AlphabetMode = 'asl' | 'fsl';

let persistedMode: AlphabetMode = 'asl';

interface ASLOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export default function ASLOverlay({ visible, onClose }: ASLOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [mode, setMode] = useState<AlphabetMode>(persistedMode);
  const [animatingSwitch, setAnimatingSwitch] = useState(false);

  useEffect(() => {
    const allImages = [...Object.values(ASL_IMAGES), ...Object.values(FSL_IMAGES)];
    allImages.forEach(src => { const img = new Image(); img.src = src; });
    }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setMode(persistedMode);
      const t = setTimeout(() => setAnimateIn(true), 10);
      return () => clearTimeout(t);
    } else {
      setAnimateIn(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  function switchMode(next: AlphabetMode) {
    if (next === mode || animatingSwitch) return;
    setAnimatingSwitch(true);
    setTimeout(() => {
      setMode(next);
      persistedMode = next;
      setAnimatingSwitch(false);
    }, 180);
  }

  if (!mounted) return null;

  const images = mode === 'asl' ? ASL_IMAGES : FSL_IMAGES;
  const title = mode === 'asl' ? 'ASL Alphabet' : 'FSL Alphabet';
  const subtitle = mode === 'asl'
    ? 'American Sign Language — Reference guide'
    : 'Filipino Sign Language — Reference guide';

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
        @keyframes gridFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .asl-overlay-bg { animation: overlayFadeIn 0.25s ease forwards; }
        .asl-panel { animation: panelSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .asl-letter-card {
          animation: letterPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }
        .asl-letter-card:hover { transform: translateY(-4px) scale(1.08) !important; }
        .asl-close-btn:hover { background: rgba(255,255,255,0.2) !important; }
        .asl-close-btn { transition: background 0.2s ease !important; }
        .asl-tab-btn {
          padding: 5px 16px; border-radius: 50px;
          border: 1px solid rgba(255,255,255,0.15);
          background: transparent;
          color: rgba(255,255,255,0.5);
          font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: 'Manrope', sans-serif;
          letter-spacing: 0.04em;
          transition: all 0.15s ease;
        }
        .asl-tab-btn.active {
          background: #F97316;
          border-color: #F97316;
          color: #fff;
        }
        .asl-tab-btn:not(.active):hover {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
        }
        .asl-grid-wrap {
          animation: gridFadeIn 0.2s ease forwards;
        }
      `}</style>

      <div
        className="asl-overlay-bg"
        style={{
          position: "absolute", inset: 0, borderRadius: "16px",
          background: "rgba(0, 0, 0, 0.82)",
          backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
          zIndex: 20, display: "flex", alignItems: "center",
          justifyContent: "center", padding: "24px",
          opacity: animateIn ? 1 : 0, transition: "opacity 0.25s ease",
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="asl-panel"
          style={{
            width: "100%", maxWidth: "990px",
            background: "rgba(0, 0, 0, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            borderRadius: "20px", padding: "28px 32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(249,115,22,0.1) inset",
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#ffffff", fontFamily: "'Manrope', sans-serif", letterSpacing: "-0.01em" }}>
                  {title}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", fontFamily: "'Manrope', sans-serif" }}>
                  {subtitle}
                </p>
              </div>

            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className={`asl-tab-btn${mode === 'asl' ? ' active' : ''}`} onClick={() => switchMode('asl')}>ASL</button>
              <button className={`asl-tab-btn${mode === 'fsl' ? ' active' : ''}`} onClick={() => switchMode('fsl')}>FSL</button>
              <button className="asl-close-btn" onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 4 }}>
                ✕
              </button>
            </div>
          </div>

          <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)", marginBottom: "20px" }} />

          <div
            key={mode}
            className="asl-grid-wrap"
            style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", opacity: animatingSwitch ? 0 : 1, transition: "opacity 0.18s ease" }}
          >
            {LETTERS.map((letter, i) => (
              <div
                key={letter}
                className="asl-letter-card"
                style={{ animationDelay: `${i * 0.02}s`, padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", cursor: "default", transition: "transform 0.2s ease" }}
              >
                <img
                  src={images[letter]}
                  alt={`${mode.toUpperCase()} sign for ${letter}`}
                  style={{ width: "60px", height: "60px", objectFit: "contain" }}
                />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", fontFamily: "'Manrope', sans-serif", letterSpacing: "-0.01em" }}>
                  {letter}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.3)", fontFamily: "'Manrope', sans-serif", letterSpacing: "0.02em" }}>
              Tap outside or press ✕ to dismiss
            </p>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.3)", fontFamily: "'Manrope', sans-serif" }}>
              Press the tabs to switch between ASL and FSL
            </p>
          </div>
        </div>
      </div>
    </>
  );
}