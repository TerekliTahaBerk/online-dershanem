import { StatusBadge } from "@/components/panel/primitives";
import { COACH_ATTENTION_LABEL, type CoachAttentionReason } from "@/lib/kocum/coach-workspace";

const REASON_TONE: Record<CoachAttentionReason, "warning" | "critical" | "info"> = {
  RESCHEDULE_REQUESTED: "info",
  HELP_OPEN: "warning",
  SESSION_OVERDUE: "critical",
  PLAN_APPROVAL: "warning",
  SUGGESTION_PENDING: "info",
  NO_PLAN: "warning",
  CHECK_IN_MISSING: "info",
  LOW_COMPLIANCE: "warning",
};

/** Koç öğrenci tablosundaki durum: öncelikli dikkat nedeni ya da "Yolunda". */
export function AttentionBadge({ reason }: { reason: CoachAttentionReason | null }) {
  return reason ? (
    <StatusBadge label={COACH_ATTENTION_LABEL[reason]} tone={REASON_TONE[reason]} />
  ) : (
    <StatusBadge label="Yolunda" tone="success" />
  );
}
