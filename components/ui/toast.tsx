"use client";

/**
 * Minimalist toast provider — global notification UI.
 *
 * Kullanım:
 *   import { useToast } from "@/components/ui/toast";
 *   const toast = useToast();
 *   toast.success("Kaydedildi");
 *   toast.error("Hata oluştu");
 *   toast.info("Bilgi");
 *
 * Layout'ta bir kez monte edilir: <ToastProvider>{children}</ToastProvider>
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info" | "warn";

export type Toast = {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
  durationMs?: number;
};

type ToastContextValue = {
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  success: (message: string, opts?: { title?: string; durationMs?: number }) => string;
  error: (message: string, opts?: { title?: string; durationMs?: number }) => string;
  info: (message: string, opts?: { title?: string; durationMs?: number }) => string;
  warn: (message: string, opts?: { title?: string; durationMs?: number }) => string;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

function genId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = genId();
      const toast: Toast = { id, durationMs: DEFAULT_DURATION, ...t };
      setToasts((prev) => [...prev, toast]);
      if (toast.durationMs && toast.durationMs > 0) {
        const handle = setTimeout(() => dismiss(id), toast.durationMs);
        timersRef.current.set(id, handle);
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((h) => clearTimeout(h));
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      dismiss,
      success: (message, opts) => push({ tone: "success", message, ...opts }),
      error: (message, opts) => push({ tone: "error", message, durationMs: 6000, ...opts }),
      info: (message, opts) => push({ tone: "info", message, ...opts }),
      warn: (message, opts) => push({ tone: "warn", message, durationMs: 5000, ...opts }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

// ─── UI ──────────────────────────────────────────────────────────────────────

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 380,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

const TONE_STYLES: Record<ToastTone, { bg: string; border: string; fg: string; icon: string }> = {
  success: { bg: "#ecfdf5", border: "#a7f3d0", fg: "#065f46", icon: "✓" },
  error:   { bg: "#fef2f2", border: "#fecaca", fg: "#991b1b", icon: "✕" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", fg: "#1e40af", icon: "ℹ" },
  warn:    { bg: "#fff7ed", border: "#fed7aa", fg: "#9a3412", icon: "⚠" },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const s = TONE_STYLES[toast.tone];
  return (
    <div
      role="status"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.fg,
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        fontSize: 13,
        lineHeight: 1.4,
        pointerEvents: "auto",
        animation: "od-toast-in 180ms ease-out",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>{s.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title ? (
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{toast.title}</div>
        ) : null}
        <div style={{ wordBreak: "break-word" }}>{toast.message}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Bildirimi kapat"
        style={{
          background: "transparent",
          border: 0,
          color: s.fg,
          opacity: 0.6,
          cursor: "pointer",
          fontSize: 16,
          padding: 0,
          marginLeft: 4,
        }}
      >
        ×
      </button>
      <style>{`@keyframes od-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
