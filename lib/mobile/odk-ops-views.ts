import { attemptStatusPresentation, integrityLevelPresentation } from "@/lib/odk/presentation";
import { attemptEventPresentation, opsStateOf, type OpsAttempt, type OpsCounters } from "@/lib/odk/staff-workspace";
import type { OdkOpsAttempt, OdkOpsConsole } from "@/lib/mobile-contracts/odk-management-ops";

/** K04 mobil projeksiyonları — saf; web konsolundaki etiket ve tonlarla aynı. */
const TONE = { neutral: "neutral", info: "info", warning: "warning", success: "success", danger: "critical" } as const;

function ageLabel(now: Date, at: Date) {
  const seconds = Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000));
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} dk` : `${Math.round(minutes / 60)} sa`;
}

type ConsoleAttempt = OpsAttempt & { id: string; meetAcknowledgedAt: Date | null; student: { fullName: string | null; email: string }; _count: { answers: number } };
type ConsoleExam = { id: string; title: string; startsAt: Date | null; endsAt: Date | null; meetRequired: boolean; attempts: ConsoleAttempt[] };

const integrityOf = (attempt: Pick<OpsAttempt, "integrityLevel" | "integrityReviewedAt">) => {
  const presentation = integrityLevelPresentation[attempt.integrityLevel];
  return { level: attempt.integrityLevel, label: presentation.label, tone: TONE[presentation.tone], reviewed: Boolean(attempt.integrityReviewedAt) };
};

export function toMobileOdkOpsConsole(input: {
  now: Date;
  canReview: boolean;
  view: OdkOpsConsole["view"];
  filters: OdkOpsConsole["filters"];
  selectable: ConsoleExam[];
  selected: ConsoleExam | null;
  counters: OpsCounters | null;
  rows: ConsoleAttempt[];
  alerts: ConsoleAttempt[];
  isLive: (exam: ConsoleExam) => boolean;
}): OdkOpsConsole {
  const { now, selected } = input;
  const name = (attempt: ConsoleAttempt) => attempt.student.fullName || attempt.student.email;
  return {
    contractVersion: 1,
    generatedAt: now.toISOString(),
    canReview: input.canReview,
    view: input.view,
    filters: input.filters,
    exams: input.selectable.map((exam) => ({ id: exam.id, title: exam.title, live: input.isLive(exam) })),
    selected:
      selected && input.counters
        ? {
            id: selected.id,
            title: selected.title,
            live: input.isLive(selected),
            startsAt: selected.startsAt?.toISOString() ?? null,
            endsAt: selected.endsAt?.toISOString() ?? null,
            meetRequired: selected.meetRequired,
            attemptCount: selected.attempts.length,
            counters: input.counters,
          }
        : null,
    rows: input.rows.map((attempt) => {
      const state = opsStateOf(attempt, now);
      const status = attemptStatusPresentation[attempt.status];
      return {
        id: attempt.id,
        name: name(attempt),
        state,
        statusLabel: state === "DISCONNECTED" ? "Bağlantı koptu" : status.label,
        tone: state === "DISCONNECTED" ? "warning" : TONE[status.tone],
        lastActivityAt: attempt.lastActivityAt.toISOString(),
        answerCount: attempt._count.answers,
        integrity: integrityOf(attempt),
        meet: !selected?.meetRequired ? "Gerekmiyor" : attempt.meetAcknowledgedAt ? "Onayladı" : "Onay eksik",
      };
    }),
    alerts: input.alerts.map((attempt) => ({
      attemptId: attempt.id,
      name: name(attempt),
      text: opsStateOf(attempt, now) === "DISCONNECTED" ? `Bağlantı ${ageLabel(now, attempt.lastActivityAt)} önce koptu` : `${integrityLevelPresentation[attempt.integrityLevel].label} · incelenmedi`,
    })),
  };
}

export function toMobileOdkOpsAttempt(input: {
  attempt: OpsAttempt & { id: string; student: { fullName: string | null; email: string }; exam: { title: string }; _count: { answers: number }; events: Array<{ id: string; type: string; serverOccurredAt: Date }> };
  revision: string;
  canReview: boolean;
  now: Date;
}): OdkOpsAttempt {
  const { attempt, now } = input;
  const state = opsStateOf(attempt, now);
  const status = attemptStatusPresentation[attempt.status];
  return {
    contractVersion: 1,
    id: attempt.id,
    name: attempt.student.fullName || attempt.student.email,
    examTitle: attempt.exam.title,
    statusLabel: state === "DISCONNECTED" ? "Bağlantı koptu" : status.label,
    tone: state === "DISCONNECTED" ? "warning" : TONE[status.tone],
    lastActivityAt: attempt.lastActivityAt.toISOString(),
    answerCount: attempt._count.answers,
    integrity: integrityOf(attempt),
    reviewedAt: attempt.integrityReviewedAt?.toISOString() ?? null,
    revision: input.revision,
    canReview: input.canReview,
    events: attempt.events.map((event) => {
      const presentation = attemptEventPresentation(event.type);
      return { id: event.id, label: presentation.label, signal: presentation.signal, at: event.serverOccurredAt.toISOString() };
    }),
  };
}
