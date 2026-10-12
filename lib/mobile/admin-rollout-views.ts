import { MOCK_EXAM_ERROR_CATEGORIES, MOCK_EXAM_TYPES, type MobileMockExams, type MobilePilot, type PilotActionCode } from "@/lib/mobile-contracts/admin-rollout";
import { mockExamErrorLabels, mockExamTemplates, sectionNet, summarizeMockExamTrend } from "@/lib/mock-exams";
import type { AdminMockExams } from "@/lib/panel/admin-mock-exams-server";
import { mockExamRevision } from "@/lib/panel/mock-exam-core";
import { pilotTransitionAllowed, roleCoverage } from "@/lib/pilot-rollout";
import { pilotGroupDetail } from "@/lib/panel/pilot-core";
import type { PilotPage } from "@/lib/panel/pilot-server";

/**
 * Kontrollü yayın (pilot) mobil projeksiyonu. Web sayfası ve
 * `PilotRolloutControl` ile AYNI alanlar ve etiketler; izinli geçişler
 * `pilotTransitionAllowed` kuralından gelir (istemci hesaplamaz).
 */

const STATUS: Record<MobilePilot["cohorts"][number]["status"], { label: string; tone: MobilePilot["cohorts"][number]["tone"] }> = {
  DRAFT: { label: "Taslak", tone: "neutral" },
  ACTIVE: { label: "Aktif", tone: "success" },
  PAUSED: { label: "Duraklatıldı", tone: "warning" },
  COMPLETED: { label: "Tamamlandı", tone: "neutral" },
  ROLLED_BACK: { label: "Geri alındı", tone: "neutral" },
};

const ACTIONS: { action: PilotActionCode; label: string; destructive: boolean; needsReason: boolean }[] = [
  { action: "ACTIVATE", label: "Aktive et", destructive: false, needsReason: false },
  { action: "RESUME", label: "Sürdür", destructive: false, needsReason: false },
  { action: "PAUSE", label: "Duraklat", destructive: false, needsReason: true },
  { action: "COMPLETE", label: "Tamamla", destructive: false, needsReason: false },
  { action: "ROLLBACK", label: "Geri al", destructive: true, needsReason: true },
];

/** Web kontrolündeki durdurma nedenleri (aynı sıra). */
export const PILOT_STOP_REASONS = [
  { value: "OPERATIONAL", label: "Operasyon" },
  { value: "GUARDRAIL_BREACH", label: "Guardrail ihlali" },
  { value: "SECURITY_INCIDENT", label: "Güvenlik olayı" },
  { value: "DATA_QUALITY", label: "Veri kalitesi" },
];

const CHECK_LABEL = { PASS: "Hazır", BLOCK: "Bloke", WAIT: "Veri bekliyor" } as const;

export function toMobilePilot(page: PilotPage): MobilePilot {
  const { readiness } = page;
  return {
    contractVersion: 1,
    meta: readiness.canExpand ? "Genişlemeye hazır" : readiness.canActivate ? "Pilot başlatılabilir" : "Kapılar tamamlanmalı",
    readiness: {
      canActivate: readiness.canActivate,
      canExpand: readiness.canExpand,
      checks: readiness.checks.map((item) => ({ key: item.key, label: item.label, status: item.status, statusLabel: CHECK_LABEL[item.status], detail: item.detail })),
    },
    groups: page.groups.map((group) => ({ id: group.id, name: group.name, detail: pilotGroupDetail(group) })),
    stopReasons: PILOT_STOP_REASONS,
    cohorts: page.cohorts.map((cohort) => ({
      id: cohort.id,
      groupName: cohort.groupNameSnapshot,
      status: cohort.status,
      statusLabel: STATUS[cohort.status].label,
      tone: STATUS[cohort.status].tone,
      version: cohort.version,
      memberCount: cohort.members.length,
      coverage: roleCoverage(cohort.members.map((member) => member.role)),
      createdAt: cohort.createdAt.toISOString(),
      actions: ACTIONS.filter((item) => pilotTransitionAllowed(cohort.status, item.action)),
    })),
  };
}

/* ------------------------------------------------------------------ *
 * Dış denemeler (Y18). Web `MockExamWorkspace` ile AYNI hesaplar:
 * `sectionNet`, `summarizeMockExamTrend`, onay koşulu (en yeni denemede
 * onaylı adım yoksa ve tekrarlayan neden varsa).
 * ------------------------------------------------------------------ */

export function toMobileMockExams(data: AdminMockExams, requestedStudentId: string | null): MobileMockExams {
  const students = data.students.map((student) => ({ id: student.id, name: student.user.fullName || student.user.email }));
  const studentId = students.find((student) => student.id === requestedStudentId)?.id ?? students[0]?.id ?? null;
  const visible = data.exams.filter((exam) => exam.studentId === studentId);
  const categories = MOCK_EXAM_ERROR_CATEGORIES;
  const trend = summarizeMockExamTrend(visible.map((exam) => ({ exam: exam.exam, takenAt: exam.takenAt, sections: exam.sections })));
  const latest = visible[0];
  return {
    contractVersion: 1,
    templates: MOCK_EXAM_TYPES.map((exam) => ({ exam, label: mockExamTemplates[exam].label, defaultDuration: mockExamTemplates[exam].defaultDuration, sections: mockExamTemplates[exam].sections })),
    errorCategories: categories.map((value) => ({ value, label: mockExamErrorLabels[value] })),
    students,
    studentId,
    exams: visible.map((exam) => {
      const sections = exam.sections.map((section) => ({
        id: section.id,
        subjectName: section.subjectName,
        correct: section.correctCount,
        incorrect: section.incorrectCount,
        blank: section.blankCount,
        net: sectionNet(exam.exam, section.correctCount, section.incorrectCount),
        errors: section.errors.map((error) => error.category),
      }));
      return {
        id: exam.id,
        exam: exam.exam,
        title: exam.title || "",
        publisher: exam.publisher || "",
        takenAt: exam.takenAt.toISOString(),
        durationMinutes: exam.durationMinutes,
        nextAction: exam.nextAction || null,
        net: Math.round(sections.reduce((sum, section) => sum + section.net, 0) * 100) / 100,
        correct: sections.reduce((sum, section) => sum + section.correct, 0),
        incorrect: sections.reduce((sum, section) => sum + section.incorrect, 0),
        blank: sections.reduce((sum, section) => sum + section.blank, 0),
        revision: mockExamRevision(exam),
        sections,
      };
    }),
    trend: {
      heatmap: trend.heatmap.map((row) => ({ key: row.key, subject: row.subject, counts: categories.map((value) => row.categories[value]) })),
      recurring: trend.recurringError ? { category: trend.recurringError.category, label: mockExamErrorLabels[trend.recurringError.category], count: trend.recurringError.count, action: trend.recurringError.action } : null,
    },
    approval: trend.recurringError && latest && !latest.nextAction ? { examId: latest.id, action: trend.recurringError.action } : null,
  };
}
