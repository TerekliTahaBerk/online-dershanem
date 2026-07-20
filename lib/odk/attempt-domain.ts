import type { OdkExamStatus } from "@prisma/client";

type StartableExam = {
  status: OdkExamStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  lateEntryMinutes: number;
  durationMinutes: number;
};

export type AttemptStartDecision =
  | { ok: true; deadlineAt: Date }
  | { ok: false; code: "NOT_SCHEDULED" | "NOT_STARTED" | "ENTRY_CLOSED" | "EXAM_ENDED" };

export function decideAttemptStart(exam: StartableExam, now = new Date()): AttemptStartDecision {
  if (!["SCHEDULED", "LIVE"].includes(exam.status) || !exam.startsAt || !exam.endsAt) {
    return { ok: false, code: "NOT_SCHEDULED" };
  }
  if (now < exam.startsAt) return { ok: false, code: "NOT_STARTED" };
  if (now >= exam.endsAt) return { ok: false, code: "EXAM_ENDED" };
  const entryClosesAt = new Date(exam.startsAt.getTime() + exam.lateEntryMinutes * 60_000);
  if (now > entryClosesAt) return { ok: false, code: "ENTRY_CLOSED" };
  const personalDeadline = new Date(now.getTime() + exam.durationMinutes * 60_000);
  return { ok: true, deadlineAt: personalDeadline < exam.endsAt ? personalDeadline : exam.endsAt };
}

export function attemptHasExpired(deadlineAt: Date, now = new Date()) {
  return now >= deadlineAt;
}

export function decideAnswerRevision(existing: { revision: number; selectedOption: string | null; isMarked: boolean } | null, incoming: { revision: number; selectedOption: string | null; isMarked: boolean }) {
  if (!existing) return incoming.revision === 1 ? "ACCEPT" as const : "CONFLICT" as const;
  if (incoming.revision === existing.revision && incoming.selectedOption === existing.selectedOption && incoming.isMarked === existing.isMarked) return "IDEMPOTENT" as const;
  return incoming.revision === existing.revision + 1 ? "ACCEPT" as const : "CONFLICT" as const;
}

export const attemptStartError = {
  NOT_SCHEDULED: "Bu deneme henüz sınava açılmadı.",
  NOT_STARTED: "Denemenin başlama saati henüz gelmedi.",
  ENTRY_CLOSED: "Denemeye geç giriş süresi doldu.",
  EXAM_ENDED: "Bu denemenin süresi sona erdi.",
} as const;
