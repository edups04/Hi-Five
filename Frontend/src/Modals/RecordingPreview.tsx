import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Save, Loader2 } from "lucide-react";
import {
  recordingModalStyles as s,
  recordingModalCss as css,
} from "../styles/pages/RecordingPreview.styles";

export interface RecordingPreviewModalProps {
  blob: Blob | null;
  onKeep: (name: string) => void;
  onDiscard: () => void;
  isSaving?: boolean;
  uploadProgress?: number;
}

export function RecordingPreviewModal(props: RecordingPreviewModalProps) {
  const { blob, onKeep, onDiscard, isSaving = false, uploadProgress = 0 } = props;
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const blobUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    if (!blob) return;
    setName("");
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [blob]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!blob) return null;

  const trimmed = name.trim();
  const canKeep = trimmed.length > 0 && !isSaving;

  function handleKeep() {
    if (!canKeep) return;
    onKeep(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleKeep();
    }
  }

  const progress = Math.min(100, Math.max(0, uploadProgress));

  return (
    <div style={s.backdrop} role="dialog" aria-modal="true" aria-labelledby="asl-modal-title">
      <style>{css}</style>
      <div style={s.card} className="asl-modal-card">
        <div style={s.header}>
          <h2 id="asl-modal-title" style={s.title} className="asl-modal-title">
            Save recording?
          </h2>
          <p style={s.subtitle}>
            Review your clip and give it a name to save, or discard it.
          </p>
        </div>

        <div style={s.videoWrap}>
          {blobUrl && (
            <video
              key={blobUrl}
              src={blobUrl}
              style={s.video}
              controls
              playsInline
              preload="metadata"
            />
          )}
        </div>

        <div style={s.fieldGroup}>
          <label htmlFor="asl-modal-name-input" style={s.label}>
            NAME
          </label>
          <input
            ref={inputRef}
            id="asl-modal-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Hello demo, Practice run #3"
            style={s.input}
            className="asl-modal-input"
            maxLength={80}
            autoComplete="off"
            disabled={isSaving}
          />
        </div>

        {isSaving && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#9B7355', fontFamily: "'Manrope', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Uploading...
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#C2410C', fontFamily: "'Manrope', sans-serif" }}>
                {progress}%
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: '#F0D9C8', borderRadius: 50, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #F97316, #C2410C)',
                borderRadius: 50,
                transition: 'width 0.2s ease',
              }} />
            </div>
          </div>
        )}

        <div style={s.actions} className="asl-modal-actions">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            style={{
              ...s.discardBtn,
              ...(isSaving ? { opacity: 0.6, cursor: "not-allowed" } : {}),
            }}
            className="asl-modal-discard-btn"
          >
            <Trash2 size={16} strokeWidth={1.8} />
            Discard
          </button>
          <button
            type="button"
            onClick={handleKeep}
            disabled={!canKeep}
            style={{
              ...s.keepBtn,
              ...(canKeep ? {} : s.keepBtnDisabled),
            }}
            className="asl-modal-keep-btn"
            title={canKeep ? "Save (Enter)" : isSaving ? "Saving..." : "Type a name to save"}
          >
            {isSaving ? (
              <Loader2 size={16} strokeWidth={2.2} className="asl-modal-spin" />
            ) : (
              <Save size={16} strokeWidth={1.8} />
            )}
            {isSaving ? `Saving... ${progress}%` : "Keep"}
          </button>
        </div>
      </div>
    </div>
  );
}
