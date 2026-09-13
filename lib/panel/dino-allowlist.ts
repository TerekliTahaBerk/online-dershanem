import type { DinoAudience } from "@/lib/dino";

/**
 * DINO AI — rol-aware kaynak allowlist.
 *
 * Model bağlamına yalnızca panelde o rolün zaten görebileceği kaynak türleri
 * girer. Deny listesi yanlışlıkla eklenen iç not / ödeme / yatay erişim
 * sızıntılarını ikinci bir kapıda keser.
 *
 * Kaynak kimlikleri `ATTENDANCE` gibi sabit veya `TEACHER_NOTE_1` gibi
 * önekli olabilir; tür eşlemesi `sourceKindFromId` ile yapılır.
 */

export const DINO_SOURCE_KINDS = [
  "ATTENDANCE",
  "PLAN_TASKS",
  "PLAN_REASONS",
  "ASSIGNMENTS",
  "LAST_EXAM",
  "EXAM_DELTA",
  "SUBJECT_TREND",
  "REVIEW_QUEUE",
  "OUTCOMES",
  "GOALS",
  "COACH_FOCUS",
  "COACH_NOTE",
  "TEACHER_NOTE",
  "ATTENTION",
  "GROUP_SUMMARY",
  "INTERVENTION_REASON",
  "HELP_SIGNAL",
  "NO_DATA",
] as const;

export type DinoSourceKind = (typeof DINO_SOURCE_KINDS)[number];

/** Asla modele gitmemesi gereken kavramsal kategoriler (dokümantasyon + test). */
export const DINO_ALWAYS_DENIED_CATEGORIES = [
  "INTERNAL_NOTES",
  "PRIVATE_COACH_NOTE",
  "PAYMENT_INFO",
  "OTHER_STUDENTS",
  "ADMIN_ONLY_RISK_METADATA",
  "PARENT_PRIVATE_DATA",
  "STUDENT_CHECKIN_FREE_TEXT",
] as const;

export type DinoDeniedCategory = (typeof DINO_ALWAYS_DENIED_CATEGORIES)[number];

const STUDENT_ALLOW: readonly DinoSourceKind[] = [
  "ATTENDANCE",
  "PLAN_TASKS",
  "PLAN_REASONS",
  "ASSIGNMENTS",
  "LAST_EXAM",
  "EXAM_DELTA",
  "SUBJECT_TREND",
  "REVIEW_QUEUE",
  "OUTCOMES",
  "GOALS",
  "COACH_FOCUS",
  "COACH_NOTE",
  "NO_DATA",
];

/** Veli: panelde gördüğü sakin özetle aynı yüzey. Tekrar kuyruğu ham satırları yok. */
const PARENT_ALLOW: readonly DinoSourceKind[] = [
  "ATTENDANCE",
  "PLAN_TASKS",
  "ASSIGNMENTS",
  "LAST_EXAM",
  "EXAM_DELTA",
  "SUBJECT_TREND",
  "GOALS",
  "COACH_FOCUS",
  "COACH_NOTE",
  "NO_DATA",
];

const TEACHER_ALLOW: readonly DinoSourceKind[] = [
  "ATTENDANCE",
  "PLAN_TASKS",
  "PLAN_REASONS",
  "ASSIGNMENTS",
  "LAST_EXAM",
  "EXAM_DELTA",
  "SUBJECT_TREND",
  "REVIEW_QUEUE",
  "OUTCOMES",
  "GOALS",
  "COACH_FOCUS",
  "COACH_NOTE",
  "TEACHER_NOTE",
  "ATTENTION",
  "GROUP_SUMMARY",
  "INTERVENTION_REASON",
  "HELP_SIGNAL",
  "NO_DATA",
];

export const DINO_AUDIENCE_ALLOWLIST: Record<DinoAudience, readonly DinoSourceKind[]> = {
  STUDENT: STUDENT_ALLOW,
  PARENT: PARENT_ALLOW,
  TEACHER: TEACHER_ALLOW,
};

/** Hangi rol hangi deny kategorisini özellikle korur (test + dokümantasyon). */
export const DINO_AUDIENCE_DENY_EMPHASIS: Record<DinoAudience, readonly DinoDeniedCategory[]> = {
  STUDENT: [
    "INTERNAL_NOTES",
    "PRIVATE_COACH_NOTE",
    "PAYMENT_INFO",
    "OTHER_STUDENTS",
    "ADMIN_ONLY_RISK_METADATA",
    "PARENT_PRIVATE_DATA",
  ],
  PARENT: [
    "INTERNAL_NOTES",
    "PRIVATE_COACH_NOTE",
    "PAYMENT_INFO",
    "OTHER_STUDENTS",
    "ADMIN_ONLY_RISK_METADATA",
    "STUDENT_CHECKIN_FREE_TEXT",
  ],
  TEACHER: ["PAYMENT_INFO", "PARENT_PRIVATE_DATA", "ADMIN_ONLY_RISK_METADATA", "OTHER_STUDENTS"],
};

export function sourceKindFromId(id: string): DinoSourceKind | null {
  if ((DINO_SOURCE_KINDS as readonly string[]).includes(id)) {
    return id as DinoSourceKind;
  }
  if (id.startsWith("TEACHER_NOTE")) return "TEACHER_NOTE";
  if (id.startsWith("ATTENTION")) return "ATTENTION";
  if (id.startsWith("INTERVENTION")) return "INTERVENTION_REASON";
  if (id.startsWith("HELP")) return "HELP_SIGNAL";
  if (id.startsWith("OUTCOME")) return "OUTCOMES";
  if (id.startsWith("SUBJECT")) return "SUBJECT_TREND";
  return null;
}

export function isSourceAllowedForAudience(sourceId: string, audience: DinoAudience): boolean {
  const kind = sourceKindFromId(sourceId);
  if (!kind) return false;
  return (DINO_AUDIENCE_ALLOWLIST[audience] as readonly string[]).includes(kind);
}

export function filterSourcesForAudience<T extends { id: string }>(
  rows: T[],
  audience: DinoAudience,
): T[] {
  return rows.filter((row) => isSourceAllowedForAudience(row.id, audience));
}

/** Öğretmen-only kaynakların veli/öğrenciye sızmadığını doğrulamak için. */
export function teacherOnlySourceKinds(): readonly DinoSourceKind[] {
  return ["TEACHER_NOTE", "ATTENTION", "GROUP_SUMMARY", "INTERVENTION_REASON", "HELP_SIGNAL"];
}
