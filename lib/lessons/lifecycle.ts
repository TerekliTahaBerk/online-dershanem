/**
 * Sprint 6 — Lesson lifecycle state machine (PURE — DB yok).
 *
 * Yaşam döngüsü:
 *
 *   SCHEDULED ──(start)──► LIVE ──(end | auto-end)──► ENDED
 *      │                    │
 *      │                    └──(rare admin)──► CANCELLED
 *      ├──(no-join+grace)──► MISSED
 *      ├──(teacher cancel)──► CANCELLED
 *      └──(legacy manual)──► COMPLETED
 *
 * Bu modül `server-only` İÇERMEZ → tsx ile unit test edilebilir.
 */

import type { LessonStatus } from "@prisma/client";

export type LifecycleAction = "start" | "end" | "cancel" | "autoEnd" | "autoMissed";

/** Geçişe izin verilen mevcut → hedef durumlar. */
const TRANSITIONS: Record<LifecycleAction, { from: LessonStatus[]; to: LessonStatus }> = {
  start:      { from: ["SCHEDULED"],          to: "LIVE" },
  end:        { from: ["LIVE"],               to: "ENDED" },
  autoEnd:    { from: ["LIVE"],               to: "ENDED" },
  autoMissed: { from: ["SCHEDULED"],          to: "MISSED" },
  cancel:     { from: ["SCHEDULED", "LIVE"],  to: "CANCELLED" },
};

export type TransitionGuardResult =
  | { ok: true; nextStatus: LessonStatus }
  | { ok: false; code: "INVALID_TRANSITION" | "OUT_OF_WINDOW" | "NO_JOIN_URL"; message: string };

export type GuardContext = {
  status: LessonStatus;
  scheduledAt: Date;
  duration: number; // dakika
  now?: Date;
  /** Manual provider için zorunlu; auto için göz ardı edilir. */
  meetingJoinUrl?: string | null;
};

/** Pencere: SCHEDULED → LIVE için "scheduledAt - 30dk" .. "scheduledAt + 90dk". */
export const START_GRACE_BEFORE_MS = 30 * 60_000;
export const START_GRACE_AFTER_MS = 90 * 60_000;

/** Auto-end ve auto-missed için "scheduledAt + duration + 30dk" eşiği. */
export const AUTO_END_GRACE_MS = 30 * 60_000;
export const AUTO_MISSED_GRACE_MS = 30 * 60_000;

export function canStart(ctx: GuardContext): TransitionGuardResult {
  const t = TRANSITIONS.start;
  if (!t.from.includes(ctx.status)) {
    return { ok: false, code: "INVALID_TRANSITION", message: `Bu derste başlatma yapılamaz (durum=${ctx.status}).` };
  }
  const now = ctx.now ?? new Date();
  const start = ctx.scheduledAt.getTime() - START_GRACE_BEFORE_MS;
  const end = ctx.scheduledAt.getTime() + START_GRACE_AFTER_MS;
  if (now.getTime() < start || now.getTime() > end) {
    return { ok: false, code: "OUT_OF_WINDOW", message: "Ders başlatma penceresi dışında (±30/90 dk)." };
  }
  if (!ctx.meetingJoinUrl || ctx.meetingJoinUrl.trim() === "") {
    return { ok: false, code: "NO_JOIN_URL", message: "Önce ders bağlantısı (join URL) tanımlayın." };
  }
  return { ok: true, nextStatus: t.to };
}

export function canEnd(ctx: Pick<GuardContext, "status">): TransitionGuardResult {
  const t = TRANSITIONS.end;
  if (!t.from.includes(ctx.status)) {
    return { ok: false, code: "INVALID_TRANSITION", message: `Bu durumda ders bitirilemez (durum=${ctx.status}).` };
  }
  return { ok: true, nextStatus: t.to };
}

export function canCancel(ctx: Pick<GuardContext, "status">): TransitionGuardResult {
  const t = TRANSITIONS.cancel;
  if (!t.from.includes(ctx.status)) {
    return { ok: false, code: "INVALID_TRANSITION", message: `Bu durumda ders iptal edilemez (durum=${ctx.status}).` };
  }
  return { ok: true, nextStatus: t.to };
}

/** Cron: LIVE + (now > scheduledAt + duration + grace). */
export function shouldAutoEnd(ctx: GuardContext): boolean {
  if (ctx.status !== "LIVE") return false;
  const now = ctx.now ?? new Date();
  const cutoff = ctx.scheduledAt.getTime() + ctx.duration * 60_000 + AUTO_END_GRACE_MS;
  return now.getTime() >= cutoff;
}

/** Cron: SCHEDULED + (now > scheduledAt + grace). */
export function shouldAutoMissed(ctx: GuardContext): boolean {
  if (ctx.status !== "SCHEDULED") return false;
  const now = ctx.now ?? new Date();
  const cutoff = ctx.scheduledAt.getTime() + AUTO_MISSED_GRACE_MS;
  return now.getTime() >= cutoff;
}

/** UI'da "Canlı"/"Bitti"/"Kaçırıldı" rozeti için sade isim. */
export function lessonStatusLabel(status: LessonStatus): string {
  switch (status) {
    case "SCHEDULED": return "Planlandı";
    case "LIVE":      return "Canlı";
    case "ENDED":     return "Bitti";
    case "COMPLETED": return "Bitti";
    case "MISSED":    return "Kaçırıldı";
    case "CANCELLED": return "İptal";
    default:          return String(status);
  }
}

/** UI rozet tone seçimi (PageHeader/Badge için). */
export function lessonStatusTone(status: LessonStatus): "teal" | "ok" | "bad" | "warn" {
  switch (status) {
    case "LIVE":      return "ok";
    case "ENDED":
    case "COMPLETED": return "ok";
    case "MISSED":    return "warn";
    case "CANCELLED": return "bad";
    case "SCHEDULED":
    default:          return "teal";
  }
}
