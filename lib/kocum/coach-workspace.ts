/**
 * Koç çalışma alanı — "Kim ilgimi bekliyor, sırada ne var?"
 * (docs/panel-design-roadmap.md §10.5). Saf hesap: sayfa koçun AKTİF
 * atamalarındaki öğrencilerin sinyallerini okur, burada neden bazında kuyruk
 * ve öğrenci başına tek durum çıkarılır. Yeni veri kaynağı yoktur.
 */

import { lowCompletion } from "./visibility";

export type CoachAttentionReason =
  | "PLAN_APPROVAL"
  | "NO_PLAN"
  | "SESSION_OVERDUE"
  | "RESCHEDULE_REQUESTED"
  | "HELP_OPEN"
  | "CHECK_IN_MISSING"
  | "LOW_COMPLIANCE"
  | "SUGGESTION_PENDING";

export type CoachStudentSignals = {
  studentId: string;
  name: string;
  targetGoal: string | null;
  overdue: boolean;
  nextScheduledAt: Date | null;
  rescheduleRequested: boolean;
  /** Bu haftanın planı; yoksa null. */
  planStatus: "DRAFT" | "CHANGE_REQUESTED" | "APPROVED" | null;
  /** Yayındaki planın tamamlanma yüzdesi (görevi yoksa null). */
  planCompletionPct: number | null;
  checkInThisWeek: boolean;
  openHelpRequests: number;
  pendingSuggestions: number;
};

export type CoachWorkspaceOptions = {
  adaptivePlan: boolean;
  studentCheckIn: boolean;
  /** Düşük plan uyumu eşiği (ürün kararı; varsayılan %50). */
  lowComplianceThreshold?: number;
};

/** Ekranda kuyruk sırası: önce eylem bekleyen iletişim, sonra plan, sonra izleme. */
export const COACH_ATTENTION_ORDER: CoachAttentionReason[] = [
  "RESCHEDULE_REQUESTED",
  "HELP_OPEN",
  "SESSION_OVERDUE",
  "PLAN_APPROVAL",
  "SUGGESTION_PENDING",
  "NO_PLAN",
  "CHECK_IN_MISSING",
  "LOW_COMPLIANCE",
];

export const COACH_ATTENTION_LABEL: Record<CoachAttentionReason, string> = {
  RESCHEDULE_REQUESTED: "Yeni saat isteği",
  HELP_OPEN: "Yanıtsız yardım isteği",
  SESSION_OVERDUE: "Görüşme gecikti",
  PLAN_APPROVAL: "Plan onay bekliyor",
  SUGGESTION_PENDING: "Deneme sonrası öneri bekliyor",
  NO_PLAN: "Bu hafta planı yok",
  CHECK_IN_MISSING: "Check-in eksik",
  LOW_COMPLIANCE: "Düşük plan uyumu",
};

export function coachAttentionReasons(student: CoachStudentSignals, options: CoachWorkspaceOptions): CoachAttentionReason[] {
  const reasons = new Set<CoachAttentionReason>();
  if (student.rescheduleRequested) reasons.add("RESCHEDULE_REQUESTED");
  if (student.overdue) reasons.add("SESSION_OVERDUE");
  if (options.studentCheckIn) {
    if (student.openHelpRequests > 0) reasons.add("HELP_OPEN");
    if (!student.checkInThisWeek) reasons.add("CHECK_IN_MISSING");
  }
  if (options.adaptivePlan) {
    if (student.planStatus === "DRAFT" || student.planStatus === "CHANGE_REQUESTED") reasons.add("PLAN_APPROVAL");
    if (student.planStatus === null) reasons.add("NO_PLAN");
    if (student.pendingSuggestions > 0) reasons.add("SUGGESTION_PENDING");
    if (
      student.planStatus === "APPROVED" &&
      lowCompletion(student.planCompletionPct, options.lowComplianceThreshold ?? 50)
    ) {
      reasons.add("LOW_COMPLIANCE");
    }
  }
  return COACH_ATTENTION_ORDER.filter((reason) => reasons.has(reason));
}

export type CoachAttentionGroup = {
  reason: CoachAttentionReason;
  label: string;
  students: CoachStudentSignals[];
};

export type CoachWorkspace = {
  groups: CoachAttentionGroup[];
  /** En az bir nedeni olan öğrenci sayısı (bir öğrenci birden çok kuyrukta olabilir). */
  attentionCount: number;
  /** Öğrenci başına öncelikli neden (tablo durum sütunu); yoksa null. */
  primaryReason: Map<string, CoachAttentionReason | null>;
};

export function buildCoachWorkspace(students: CoachStudentSignals[], options: CoachWorkspaceOptions): CoachWorkspace {
  const primaryReason = new Map<string, CoachAttentionReason | null>();
  const buckets = new Map<CoachAttentionReason, CoachStudentSignals[]>();
  for (const student of students) {
    const reasons = coachAttentionReasons(student, options);
    primaryReason.set(student.studentId, reasons[0] ?? null);
    for (const reason of reasons) {
      const list = buckets.get(reason) ?? [];
      list.push(student);
      buckets.set(reason, list);
    }
  }
  const groups = COACH_ATTENTION_ORDER.filter((reason) => buckets.has(reason)).map((reason) => ({
    reason,
    label: COACH_ATTENTION_LABEL[reason],
    students: [...buckets.get(reason)!].sort((a, b) => a.name.localeCompare(b.name, "tr")),
  }));
  return {
    groups,
    attentionCount: [...primaryReason.values()].filter(Boolean).length,
    primaryReason,
  };
}

export type CoachExamInput = {
  studentId: string;
  takenAt: Date;
  /** Bölüm netleri toplamı (`sectionNet` ile sınav türüne göre hesaplanmış). */
  totalNet: number;
};

export type CoachExamSummary = { net: number; delta: number | null; takenAt: Date };

/** Öğrenci başına son deneme toplam neti ve bir önceki denemeye göre farkı. */
export function latestExamByStudent(exams: CoachExamInput[]): Map<string, CoachExamSummary> {
  const byStudent = new Map<string, CoachExamInput[]>();
  for (const exam of exams) {
    const list = byStudent.get(exam.studentId) ?? [];
    list.push(exam);
    byStudent.set(exam.studentId, list);
  }
  const result = new Map<string, CoachExamSummary>();
  for (const [studentId, list] of byStudent) {
    const sorted = [...list].sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    const [latest, previous] = sorted;
    const round = (value: number) => Math.round(value * 100) / 100;
    result.set(studentId, {
      net: round(latest.totalNet),
      delta: previous ? round(latest.totalNet - previous.totalNet) : null,
      takenAt: latest.takenAt,
    });
  }
  return result;
}
