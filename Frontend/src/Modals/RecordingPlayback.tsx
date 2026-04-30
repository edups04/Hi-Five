import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import {
  recordingModalStyles as s,
  recordingModalCss as css,
} from "../styles/pages/RecordingPreview.styles";
import { fetchRecordingBlobUrl, type RecordingMeta } from "../lib/recordingsClient";
import { downloadBlob, sanitizeFilename } from "../hooks/useVideoRecorder";

export interface RecordingPlaybackModalProps {
  /** When non-null, the modal is open and showing this recording. */
  recording: RecordingMeta | null;
  /** Called when the modal should close. */
  onClose: () => void;
}

/**
 * Plays a previously-saved recording fetched from the backend. Reuses the
 * preview modal's styles so it feels consistent with the post-recording flow,
 * but is read-only — name and Discard/Keep buttons are replaced with a
 * Download action.
 *
 * The video stream is fetched as a blob (with the auth header) and turned
 * into a blob URL — we can't put the API URL directly into <video src> because
 * browsers don't send Authorization on media requests.
 */
export function RecordingPlaybackModal({
  recording,
  onClose,
}: RecordingPlaybackModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the video stream when a recording is set; clean up when it changes.
  useEffect(() => {
    if (!recording) {
      setBlobUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(null);
    fetchRecordingBlobUrl(recording.id)
      .then((url) => {
        createdUrl = url;
        if (cancelled) {
          // The user closed the modal before the fetch finished — clean up.
          URL.revokeObjectURL(url);
          return;
        }
        setBlobUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load video");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setBlobUrl(null);
    };
  }, [recording]);

  // Esc closes this modal — safe here because there's nothing destructive
  // about closing playback (the recording is already saved server-side).
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording, onClose]);

  if (!recording) return null;

  function handleDownload() {
    if (!blobUrl) return;
    // Re-fetch the blob from the URL to download it. (We could keep the
    // original Blob around in state but this is simpler and rarely called.)
    fetch(blobUrl)
      .then((r) => r.blob())
      .then((blob) => {
        downloadBlob(blob, `${sanitizeFilename(recording!.name)}.webm`);
      })
      .catch(() => {
        /* silent — toast is on the parent if we ever need it */
      });
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
              background: "transparent",
              border: "none",
              padding: 8,
              borderRadius: 8,
              color: "#7A4520",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div style={s.videoWrap}>
          {loading && (
            <span style={{ color: "#9B7355", fontSize: 14, fontWeight: 600 }}>
              Loading video...
            </span>
          )}
          {error && !loading && (
            <span style={{ color: "#E0A48A", fontSize: 14, fontWeight: 600 }}>
              {error}
            </span>
          )}
          {!loading && !error && blobUrl && (
            <video
              key={blobUrl}
              src={blobUrl}
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
            disabled={!blobUrl}
            style={{
              ...s.keepBtn,
              ...(blobUrl ? {} : s.keepBtnDisabled),
            }}
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
