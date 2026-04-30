import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Save, Loader2 } from "lucide-react";
import {
  recordingModalStyles as s,
  recordingModalCss as css,
} from "../styles/pages/RecordingPreview.styles";

export interface RecordingPreviewModalProps {
  /** When non-null, the modal is open and showing this blob. */
  blob: Blob | null;
  /** Called with the user-typed name when they click Keep. */
  onKeep: (name: string) => void;
  /** Called when they click Discard. */
  onDiscard: () => void;
  /** When true, shows a spinner on the Keep button and disables interaction. */
  isSaving?: boolean;
}

/**
 * Preview a freshly-recorded clip; user names it and saves, or discards.
 *
 * UX rules:
 *  - Name input starts empty; Keep is disabled until they type something.
 *  - Esc deliberately does nothing (losing a recording to a misclick is bad).
 *  - Enter while name is non-empty triggers Keep.
 *  - While isSaving=true, both buttons disable so we don't double-submit.
 */
export function RecordingPreviewModal(props: RecordingPreviewModalProps) {
  const { blob, onKeep, onDiscard, isSaving = false } = props;
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
            {isSaving ? "Saving..." : "Keep"}
          </button>
        </div>
      </div>
    </div>
  );
}