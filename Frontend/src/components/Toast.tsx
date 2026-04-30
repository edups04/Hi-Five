// src/components/Toast.tsx
//
// Small toast notification system. Wrap the app (or just the page) in
// <ToastProvider>, then call useToast() inside any component to push messages.
//
//   const toast = useToast();
//   toast.success('Saved!');
//   toast.error('Upload failed: network error');
//
// Toasts auto-dismiss after 3.5s (longer for errors) and stack from the bottom.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++;
      setToasts(prev => [...prev, { id, kind, message }]);
      const ttl = kind === 'error' ? 5500 : 3500;
      setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      <style>{toastCss}</style>
      {children}
      <div style={styles.container} aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              ...styles.toast,
              ...kindStyles[t.kind],
            }}
            className="hi-toast"
          >
            <span style={styles.icon}>
              {t.kind === 'success' && <CheckCircle2 size={18} strokeWidth={2} />}
              {t.kind === 'error' && <AlertCircle size={18} strokeWidth={2} />}
              {t.kind === 'info' && <AlertCircle size={18} strokeWidth={2} />}
            </span>
            <span style={styles.message}>{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              style={styles.closeBtn}
              aria-label="Dismiss"
              className="hi-toast-close"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

// ---- Styles -----------------------------------------------------------------

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    zIndex: 9999,
    pointerEvents: 'none',           // children re-enable
    fontFamily: "'Manrope', sans-serif",
    maxWidth: 'calc(100vw - 48px)',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    boxShadow: '0 10px 24px rgba(60,25,0,0.22), 0 2px 6px rgba(60,25,0,0.12)',
    minWidth: 240,
    maxWidth: 380,
    pointerEvents: 'auto',
  },
  icon: {
    display: 'inline-flex',
    flexShrink: 0,
  },
  message: {
    flex: 1,
    lineHeight: 1.35,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'currentColor',
    opacity: 0.7,
    cursor: 'pointer',
    padding: 2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
};

// Per-kind colors — fits the Hi-Five orange/cream palette.
const kindStyles: Record<ToastKind, CSSProperties> = {
  success: {
    background: '#0F7B3F',
    color: '#fff',
  },
  error: {
    background: '#B42318',
    color: '#fff',
  },
  info: {
    background: '#3B1A00',
    color: '#FAF0E8',
  },
};

const toastCss = `
  .hi-toast {
    animation: hi-toast-in 0.18s ease-out;
  }
  .hi-toast-close:hover {
    opacity: 1 !important;
    background: rgba(255,255,255,0.15) !important;
  }
  @keyframes hi-toast-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
