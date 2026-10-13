import { check, v, type Infer } from "./validate";

/**
 * K04 · CANLI OPERASYON — `GET /api/panel/odk/management/operations`,
 * `.../operations/attempts/[id]` ve inceleme yazması. Öğrenci yalnız adla
 * (yoksa e-posta) görünür; cevap, puan veya cihaz verisi projeksiyonda yok.
 * Kalp atışı tarayıcı bağlantısıdır; Meet katılımının kanıtı değildir.
 */
const tone = () => v.oneOf(["neutral", "info", "success", "warning", "critical"]);
const integrity = v.object({ level: v.oneOf(["NORMAL", "REVIEW", "HIGH"]), label: v.string(), tone: tone(), reviewed: v.boolean() });
export const ODK_OPS_STATES = ["IN_PROGRESS", "DISCONNECTED", "SUBMITTED", "AUTO_SUBMITTED", "REVIEW", "OTHER"] as const;

const consoleView = v.object({
  contractVersion: v.literal(1),
  generatedAt: v.iso(),
  canReview: v.boolean(),
  view: v.oneOf(["all", "live", "attention"]),
  filters: v.object({ status: v.oneOf(["tumu", "devam", "kopuk", "teslim", "inceleme"]), integrity: v.oneOf(["tumu", "REVIEW", "HIGH"]), heartbeat: v.oneOf(["tumu", "2", "5", "10"]) }),
  exams: v.array(v.object({ id: v.nonEmpty(), title: v.string(), live: v.boolean() })),
  selected: v.nullable(
    v.object({
      id: v.nonEmpty(),
      title: v.string(),
      live: v.boolean(),
      startsAt: v.nullable(v.iso()),
      endsAt: v.nullable(v.iso()),
      meetRequired: v.boolean(),
      attemptCount: v.int(0),
      counters: v.object({ notStarted: v.int(0), inProgress: v.int(0), disconnected: v.int(0), submitted: v.int(0), autoSubmitted: v.int(0), review: v.int(0) }),
    }),
  ),
  rows: v.array(
    v.object({
      id: v.nonEmpty(),
      name: v.string(),
      state: v.oneOf(ODK_OPS_STATES),
      statusLabel: v.string(),
      tone: tone(),
      lastActivityAt: v.iso(),
      answerCount: v.int(0),
      integrity,
      meet: v.string(),
    }),
  ),
  alerts: v.array(v.object({ attemptId: v.nonEmpty(), name: v.string(), text: v.string() })),
});
export type OdkOpsConsole = Infer<typeof consoleView>;

const attemptView = v.object({
  contractVersion: v.literal(1),
  id: v.nonEmpty(),
  name: v.string(),
  examTitle: v.string(),
  statusLabel: v.string(),
  tone: tone(),
  lastActivityAt: v.iso(),
  answerCount: v.int(0),
  integrity,
  reviewedAt: v.nullable(v.iso()),
  revision: v.nonEmpty(),
  canReview: v.boolean(),
  events: v.array(v.object({ id: v.nonEmpty(), label: v.string(), signal: v.boolean(), at: v.iso() })),
});
export type OdkOpsAttempt = Infer<typeof attemptView>;
export type OdkIntegrityAction = "MARK_REVIEWED" | "REQUIRE_REVIEW" | "CLEAR_REVIEW";

export function parseOdkOpsConsole(input: unknown) {
  return check(consoleView, input);
}
export function parseOdkOpsAttempt(input: unknown) {
  return check(attemptView, input);
}
export function parseOdkIntegrityReviewWrite(input: unknown) {
  return check(v.object({ ok: v.literal(true), id: v.nonEmpty(), status: v.nonEmpty(), integrityReviewedAt: v.nullable(v.iso()), revision: v.nonEmpty(), replayed: v.boolean() }), input);
}
