/**
 * Payment status pill — single source of truth for status colour + label
 * across parent and admin finance surfaces.
 *
 * Reads label/tone from `lib/panel/parent-finance.ts` so admin and parent
 * UI never disagree about what a status means.
 *
 * Stage 3H: Migrated to v2 `soft-pill` vocabulary.
 */
import {
  getPaymentScheduleStatusLabel,
  getPaymentScheduleStatusTone,
  type PaymentScheduleDisplayStatus,
} from "@/lib/panel/parent-finance-display";

const TONE_PILL: Record<string, string> = {
  ok: "is-mint",
  accent: "is-sky",
  warn: "is-yellow",
  bad: "is-blush",
  neutral: "",
};

export function PaymentStatusBadge({
  status,
}: {
  status: PaymentScheduleDisplayStatus;
}) {
  const tone = getPaymentScheduleStatusTone(status);
  const label = getPaymentScheduleStatusLabel(status);
  const pill = TONE_PILL[tone] ?? "";
  return <span className={`soft-pill ${pill}`.trim()}>{label}</span>;
}
