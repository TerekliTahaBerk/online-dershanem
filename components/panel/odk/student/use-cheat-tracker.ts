"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type CheatEventType =
  | "TAB_BLUR" | "TAB_FOCUS"
  | "VISIBILITY_HIDDEN" | "VISIBILITY_VISIBLE"
  | "FULLSCREEN_ENTER" | "FULLSCREEN_EXIT"
  | "RIGHT_CLICK" | "COPY" | "PASTE" | "CUT" | "PRINT" | "KEY_DEVTOOLS"
  | "ANSWER_CHANGE" | "NAVIGATE" | "AUTOSAVE"
  | "NETWORK_DROP" | "NETWORK_RESUME" | "WARNING_SHOWN";

type Event = {
  type: CheatEventType;
  questionNumber?: number;
  payload?: Record<string, unknown>;
  occurredAt?: string;
};

type Options = {
  attemptId: string;
  enabled: boolean;
  blockCopyPaste?: boolean;
  /** UI'a warning gösterilecek violation tipleri için callback */
  onViolation?: (type: CheatEventType, totalViolations: number) => void;
  flushIntervalMs?: number; // default 4000
};

const VIOLATION_SET = new Set<CheatEventType>([
  "TAB_BLUR", "VISIBILITY_HIDDEN", "FULLSCREEN_EXIT",
  "COPY", "PASTE", "CUT", "PRINT", "KEY_DEVTOOLS",
]);

/**
 * Çözüm sayfasında çağrılır. Browser olaylarını dinler, batch'leyip
 * sunucuya gönderir. cheatViolationCount toplamını state olarak döner.
 */
export function useCheatTracker({
  attemptId, enabled,
  blockCopyPaste = true,
  onViolation,
  flushIntervalMs = 4000,
}: Options) {
  const [totalViolations, setTotalViolations] = useState(0);
  const queueRef = useRef<Event[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enqueue = useCallback((ev: Event) => {
    queueRef.current.push({ ...ev, occurredAt: ev.occurredAt ?? new Date().toISOString() });
  }, []);

  const flush = useCallback(async () => {
    if (queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    try {
      const res = await fetch(`/api/v1/odk/student/attempts/${attemptId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setTotalViolations(json.data.totalViolations ?? 0);
        if (json.data.violationDelta > 0 && onViolation) {
          // En son violation tipini bul
          const lastViolation = [...batch].reverse().find((e) => VIOLATION_SET.has(e.type));
          if (lastViolation) onViolation(lastViolation.type, json.data.totalViolations);
        }
      }
    } catch {
      // Geri yaz, bir sonraki flush'ta dener
      queueRef.current.unshift(...batch);
    }
  }, [attemptId, onViolation]);

  // Periyodik flush
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      void flush();
      timerRef.current = setTimeout(tick, flushIntervalMs);
    };
    timerRef.current = setTimeout(tick, flushIntervalMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, flush, flushIntervalMs]);

  // Browser event listeners
  useEffect(() => {
    if (!enabled) return;

    const onBlur = () => enqueue({ type: "TAB_BLUR" });
    const onFocus = () => enqueue({ type: "TAB_FOCUS" });

    const onVisibility = () => {
      if (document.visibilityState === "hidden") enqueue({ type: "VISIBILITY_HIDDEN" });
      else enqueue({ type: "VISIBILITY_VISIBLE" });
    };

    const onContextMenu = (e: MouseEvent) => {
      enqueue({ type: "RIGHT_CLICK" });
      // Sağ tık'ı engellemek istersek:
      e.preventDefault();
    };

    const onCopy = (e: ClipboardEvent) => {
      enqueue({ type: "COPY" });
      if (blockCopyPaste) e.preventDefault();
    };
    const onCut = (e: ClipboardEvent) => {
      enqueue({ type: "CUT" });
      if (blockCopyPaste) e.preventDefault();
    };
    const onPaste = (e: ClipboardEvent) => {
      enqueue({ type: "PASTE" });
      if (blockCopyPaste) e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I/J/C, Ctrl+U
      const isDev =
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === "U");
      if (isDev) {
        enqueue({ type: "KEY_DEVTOOLS", payload: { key: e.key } });
        e.preventDefault();
      }
      // Ctrl/Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        enqueue({ type: "PRINT" });
        e.preventDefault();
      }
    };

    const onFullscreenChange = () => {
      if (document.fullscreenElement) enqueue({ type: "FULLSCREEN_ENTER" });
      else enqueue({ type: "FULLSCREEN_EXIT" });
    };

    const onOnline = () => enqueue({ type: "NETWORK_RESUME" });
    const onOffline = () => enqueue({ type: "NETWORK_DROP" });

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [enabled, blockCopyPaste, enqueue]);

  // Sayfa kapanışında sendBeacon ile flush
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      if (queueRef.current.length === 0) return;
      const batch = queueRef.current.splice(0, queueRef.current.length);
      try {
        const blob = new Blob([JSON.stringify({ events: batch })], { type: "application/json" });
        navigator.sendBeacon?.(`/api/v1/odk/student/attempts/${attemptId}/events`, blob);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeunload", handler);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") handler();
    });
    return () => window.removeEventListener("beforeunload", handler);
  }, [attemptId, enabled]);

  const flushNow = useCallback(() => flush(), [flush]);

  const logCustom = useCallback((ev: Event) => {
    enqueue(ev);
  }, [enqueue]);

  return {
    totalViolations,
    flushNow,
    logCustom,
  };
}
