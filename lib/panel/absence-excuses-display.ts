/**
 * Phase 2 / Session 13 — Client-safe display helpers for absence excuses.
 *
 * Pure functions and types with NO `server-only` marker, so they can be
 * imported from `"use client"` components without pulling Prisma into the
 * client bundle. The server module `lib/panel/absence-excuses.ts` re-exports
 * from here.
 */
import type {
  AbsenceExcuseReason,
  AbsenceExcuseStatus,
} from "@prisma/client";

const REASON_LABEL: Record<AbsenceExcuseReason, string> = {
  ILLNESS: "Hastalık",
  FAMILY: "Ailevi neden",
  TECHNICAL: "Teknik sorun",
  TRAVEL: "Seyahat",
  OTHER: "Diğer",
};

const STATUS_LABEL: Record<AbsenceExcuseStatus, string> = {
  PENDING: "Beklemede",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal edildi",
};

const STATUS_TONE: Record<
  AbsenceExcuseStatus,
  "ok" | "warn" | "bad" | "neutral"
> = {
  PENDING: "warn",
  APPROVED: "ok",
  REJECTED: "bad",
  CANCELLED: "neutral",
};

export function getAbsenceExcuseReasonLabel(r: AbsenceExcuseReason): string {
  return REASON_LABEL[r] ?? String(r);
}
export function getAbsenceExcuseStatusLabel(s: AbsenceExcuseStatus): string {
  return STATUS_LABEL[s] ?? String(s);
}
export function getAbsenceExcuseStatusTone(s: AbsenceExcuseStatus) {
  return STATUS_TONE[s] ?? "neutral";
}

export const ABSENCE_REASON_OPTIONS: ReadonlyArray<{
  value: AbsenceExcuseReason;
  label: string;
}> = (
  Object.keys(REASON_LABEL) as AbsenceExcuseReason[]
).map((r) => ({ value: r, label: REASON_LABEL[r] }));

export type AbsenceExcuseRow = {
  id: string;
  parentId: string;
  parentName: string | null;
  studentId: string;
  studentName: string | null;
  classroomNames: string[];
  lessonId: string | null;
  lessonTitle: string | null;
  lessonScheduledAt: Date | null;
  startsAt: Date;
  endsAt: Date;
  reason: AbsenceExcuseReason;
  note: string | null;
  attachmentUrl: string | null;
  status: AbsenceExcuseStatus;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  affectedLessonCount: number;
  createdAt: Date;
  updatedAt: Date;
};
