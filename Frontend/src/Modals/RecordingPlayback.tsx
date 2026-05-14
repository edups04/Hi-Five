import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import {
  recordingModalStyles as s,
  recordingModalCss as css,
} from "../styles/pages/RecordingPreview.styles";
import { type RecordingMeta } from "../lib/recordingsClient";
import { sanitizeFilename } from "../hooks/useVideoRecorder";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface RecordingPlaybackModalProps {
  recording: RecordingMeta | null;
  onClose: () => void;
}

export function RecordingPlaybackModal({
  recording,
  onClose,
}: RecordingPlaybackModalProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) { setVideoSrc(null); return; }
    const token = localStorage.getItem("accessToken") || "";
    setVideoSrc(`${API_URL}/api/recordings/${recording.id}/video?token=${token}`);
  }, [recording]);

  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording, onClose]);

  if (!recording) return null;

  function handleDownload() {
    if (!videoSrc) return;
    const a = document.createElement("a");
    a.href = `${videoSrc}&download=true`;
    a.download = `${sanitizeFilename(recording!.name)}.mp4`;
    a.click();
  }

  return (
    <div style={s.backdrop} role="dialog" aria-modal="true" aria-labelledby="asl-playback-title">
      <style>{css}</style>
      <div style={s.card} className="asl-modal-card">
        <div style={{ ...s.header, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 id="asl-playback-title" style={s.title} className="asl-modal-title">
              {recording.name}
            </h2>
            {recording.sentence && (
              <p style={s.subtitle}>"{recording.sentence}"</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent", border: "none",
              padding: 8, borderRadius: 8, color: "#7A4520",
              cursor: "pointer", display: "inline-flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div style={s.videoWrap}>
          {videoSrc && (
            <video
              key={videoSrc}
              src={videoSrc}
              style={s.video}
              controls
              playsInline
              autoPlay
            />
          )}
        </div>

        <div style={s.actions} className="asl-modal-actions">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!videoSrc}
            style={{ ...s.keepBtn, ...(videoSrc ? {} : s.keepBtnDisabled) }}
            className="asl-modal-keep-btn"
          >
            <Download size={16} strokeWidth={1.8} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}