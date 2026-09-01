/**
 * Integrity monitoring — davranışsal sinyaller üretir; otomatik suçlama / invalidation yapmaz.
 */

export type IntegritySignalCode =
  | "TAB_HIDDEN"
  | "LONG_BLUR"
  | "FULLSCREEN_EXIT"
  | "COPY_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "FREQUENT_TAB_CHANGE"
  | "SESSION_CHANGE"
  | "IP_CHANGE";

export type IntegrityEventInput = {
  type: string;
  metadata?: Record<string, unknown> | null;
  durationMs?: number;
};

export type IntegrityAssessment = {
  level: "NORMAL" | "REVIEW" | "HIGH";
  label: string;
  reasons: string[];
  signals: Array<{ code: IntegritySignalCode; count: number; detail: string }>;
};

const HIGH_VALUE_EVENT_TYPES = new Set([
  "EXAM_STARTED",
  "QUESTION_OPENED",
  "QUESTION_CLOSED",
  "ANSWER_SELECTED",
  "ANSWER_CHANGED",
  "QUESTION_FLAGGED",
  "SECTION_CHANGED",
  "TAB_HIDDEN",
  "TAB_VISIBLE",
  "WINDOW_BLUR",
  "WINDOW_FOCUS",
  "FULLSCREEN_ENTER",
  "FULLSCREEN_EXIT",
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
  "CONTEXT_MENU",
  "NETWORK_OFFLINE",
  "NETWORK_ONLINE",
  "EXAM_SUBMITTED",
  "AUTO_SUBMITTED",
]);

export function isHighValueExamEvent(type: string): boolean {
  return HIGH_VALUE_EVENT_TYPES.has(type);
}

function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes <= 0) return `${seconds} sn`;
  return `${minutes} dk ${String(seconds).padStart(2, "0")} sn`;
}

export function assessIntegrity(events: IntegrityEventInput[]): IntegrityAssessment {
  const tabHidden = events.filter((event) => event.type === "TAB_HIDDEN").length;
  const fullscreenExit = events.filter((event) => event.type === "FULLSCREEN_EXIT").length;
  const copyAttempts = events.filter((event) => event.type === "COPY_ATTEMPT").length;
  const pasteAttempts = events.filter((event) => event.type === "PASTE_ATTEMPT").length;
  const blurMs = events
    .filter((event) => event.type === "WINDOW_BLUR" || event.type === "TAB_HIDDEN")
    .reduce((sum, event) => sum + (Number(event.durationMs || event.metadata?.durationMs) || 0), 0);
  const sessionChanges = events.filter((event) => event.type === "SESSION_CHANGE" || event.metadata?.sessionChanged).length;
  const ipChanges = events.filter((event) => event.metadata?.ipChanged).length;

  const signals: IntegrityAssessment["signals"] = [];
  if (tabHidden > 0) signals.push({ code: "TAB_HIDDEN", count: tabHidden, detail: `${tabHidden} kez sekmeden ayrıldı` });
  if (blurMs >= 30_000) signals.push({ code: "LONG_BLUR", count: 1, detail: `toplam ${formatDuration(blurMs)} sınav ekranı arka planda kaldı` });
  if (fullscreenExit > 0) signals.push({ code: "FULLSCREEN_EXIT", count: fullscreenExit, detail: `${fullscreenExit} kez fullscreen kapatıldı` });
  if (copyAttempts > 0) signals.push({ code: "COPY_ATTEMPT", count: copyAttempts, detail: `${copyAttempts} kez kopyalama denemesi` });
  if (pasteAttempts > 0) signals.push({ code: "PASTE_ATTEMPT", count: pasteAttempts, detail: `${pasteAttempts} kez yapıştırma denemesi` });
  if (tabHidden >= 8) signals.push({ code: "FREQUENT_TAB_CHANGE", count: tabHidden, detail: "çok sık sekme değişimi" });
  if (sessionChanges > 0) signals.push({ code: "SESSION_CHANGE", count: sessionChanges, detail: "oturum değişimi sinyali" });
  if (ipChanges > 0) signals.push({ code: "IP_CHANGE", count: ipChanges, detail: "beklenmedik IP/session değişimi" });

  let level: IntegrityAssessment["level"] = "NORMAL";
  if (signals.some((signal) => ["SESSION_CHANGE", "IP_CHANGE"].includes(signal.code)) || tabHidden >= 8 || blurMs >= 10 * 60_000) {
    level = "HIGH";
  } else if (signals.length > 0) {
    level = "REVIEW";
  }

  const label = level === "NORMAL" ? "Normal" : level === "REVIEW" ? "İncelenmeli" : "Yüksek sinyal";
  return {
    level,
    label,
    reasons: signals.map((signal) => signal.detail),
    signals,
  };
}

export function integrityTeacherSafeLabel(level: "NORMAL" | "REVIEW" | "HIGH"): string | null {
  if (level === "NORMAL") return null;
  return "Yönetim incelemesi mevcut";
}
