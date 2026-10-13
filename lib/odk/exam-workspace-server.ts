import "server-only";

import { prisma } from "@/lib/prisma";
import { getActiveOutcomeOptions } from "@/lib/curriculum/catalog-cache";
import { getOdkExamReadiness } from "@/lib/odk/admin-exam-server";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import { parseExamSecurityPolicy } from "@/lib/odk/exam-security";
import { readSessionPlan } from "@/lib/odk/exam-sessions";
import { buildExamResultsSummary } from "@/lib/odk/results-ops";
import { SUBMITTED_STATUSES, loadStaffViewer } from "@/lib/odk/staff-management-data";
import {
  examCapabilities,
  examPrimaryAction,
  examWindowEnded,
  parseQuestionFilter,
  readinessChecklist,
  resolveExamTab,
  visibleExamTabs,
} from "@/lib/odk/staff-workspace";

/**
 * DENEME ÇALIŞMA ALANI yükleyicisi (K03) — web
 * `app/panel/odk/yonetim/sinavlar/[id]` ve mobil
 * `GET /api/panel/odk/management/exams/[id]` AYNI veriyi okur (sayfadan
 * taşındı). Sekmeler izinle sınırlıdır; cevap anahtarı yalnız `odk:exam:edit`
 * taşıyana döner.
 */
import { FULLSCREEN_LABEL_TEXT as FULLSCREEN_LABEL } from "./exam-workspace-labels";

/** `includeOutcomeOptions`: web soru editörünün kazanım seçenekleri (mobil okumada gerekmez). */
export async function loadOdkExamWorkspace(userId: string, examId: string, query: { sekme?: string; filtre?: string }, now = new Date(), options: { includeOutcomeOptions?: boolean } = {}) {
  const viewer = await loadStaffViewer(userId);
  const caps = examCapabilities(viewer.permissions);
  const { exam, issues } = await getOdkExamReadiness(examId);
  if (!exam?.currentVersion) return null;
  const version = exam.currentVersion;
  const familyCode = getOdkExamFamilyCode(exam);
  const sessionPlan = readSessionPlan(version.settings);
  const tabs = visibleExamTabs(caps, { hasSessions: Boolean(sessionPlan) });
  const tab = resolveExamTab(query.sekme, tabs);
  const questionFilter = parseQuestionFilter(query.filtre);
  const windowEnded = examWindowEnded(exam, now);

  const [outcomes, attempts, assignedCount] = await Promise.all([
    options.includeOutcomeOptions !== false && caps.edit && tab === "sorular" ? getActiveOutcomeOptions(familyCode, exam.structureMode === "MATH_ONLY") : Promise.resolve([]),
    prisma.odkExamAttempt.findMany({
      where: { examId, status: { not: "VOID" } },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        status: true,
        integrityLevel: true,
        integrityReviewedAt: true,
        startedAt: true,
        submittedAt: true,
        deadlineAt: true,
        lastActivityAt: true,
        student: { select: { fullName: true, email: true } },
        score: tab === "raporlar"
          ? { select: { attemptId: true, correctCount: true, wrongCount: true, blankCount: true, totalNet: true, publicationStatus: true, activeDurationMs: true, sectionBreakdown: true } }
          : { select: { attemptId: true } },
      },
    }),
    prisma.odkExamAssignment.count({ where: { examId, isActive: true } }),
  ]);

  const questions = version.sections.flatMap((section) =>
    section.questions.map((question) => ({
      id: question.id,
      sectionTitle: section.title,
      questionNumber: question.questionNumber,
      correctOption: question.correctOption,
      difficulty: question.difficulty,
      bookletPage: question.bookletPage,
      contentType: question.contentType,
      contentText: question.contentText,
      assetUrl: question.assetUrl,
      outcomeIds: question.outcomes.map((outcome) => outcome.outcomeId),
      primaryOutcomeId: question.outcomes.find((outcome) => outcome.isPrimary)?.outcomeId || null,
    })),
  );
  const submittedCount = attempts.filter((attempt) => (SUBMITTED_STATUSES as readonly string[]).includes(attempt.status)).length;
  const scoredCount = attempts.filter((attempt) => attempt.score).length;
  const reviewCount = attempts.filter((attempt) => attempt.integrityLevel !== "NORMAL").length;
  const security = parseExamSecurityPolicy(version.settings);
  const readiness = readinessChecklist({
    examId: exam.id,
    questionCount: questions.length,
    sectionCount: version.sections.length,
    hasBooklet: version.files.some((file) => file.type === "BOOKLET_PDF"),
    issues,
    securityLabel: `${FULLSCREEN_LABEL[security.fullscreenMode]}${version.autoSubmit ? " · otomatik teslim" : ""}`,
  });
  const primary = examPrimaryAction(exam.status, caps, windowEnded);
  const draftEditable = exam.status === "DRAFT" && version.status === "DRAFT";
  return {
    viewer,
    caps,
    exam,
    version,
    issues,
    familyCode,
    sessionPlan,
    tabs,
    tab,
    questionFilter,
    windowEnded,
    outcomes,
    attempts,
    assignedCount,
    questions,
    submittedCount,
    scoredCount,
    reviewCount,
    security,
    readiness,
    primary,
    draftEditable,
  };
}

export type OdkExamWorkspace = NonNullable<Awaited<ReturnType<typeof loadOdkExamWorkspace>>>;
type ReportAttempt = { id: string; status: string; integrityLevel: "NORMAL" | "REVIEW" | "HIGH"; startedAt: Date; submittedAt: Date | null; student: { fullName: string | null; email: string }; score: unknown };

/** Raporlar sekmesi: özet + en zayıf 6 kazanım (web ve mobil aynı). */
export async function loadOdkExamReport(examId: string, assignedCount: number, attempts: ReportAttempt[]) {
  const summary = buildExamResultsSummary({
    assignmentCount: assignedCount,
    attempts: attempts.map((attempt) => {
      const score = attempt.score as null | {
        correctCount?: number;
        wrongCount?: number;
        blankCount?: number;
        totalNet?: unknown;
        publicationStatus?: "HIDDEN" | "PUBLISHED";
        activeDurationMs?: number | null;
        sectionBreakdown?: unknown;
      };
      return {
        id: attempt.id,
        studentName: attempt.student.fullName || attempt.student.email,
        status: attempt.status,
        integrityLevel: attempt.integrityLevel,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        score: score && score.publicationStatus
          ? {
              correctCount: score.correctCount ?? 0,
              wrongCount: score.wrongCount ?? 0,
              blankCount: score.blankCount ?? 0,
              totalNet: Number(score.totalNet ?? 0),
              publicationStatus: score.publicationStatus,
              activeDurationMs: score.activeDurationMs,
              sectionBreakdown: Array.isArray(score.sectionBreakdown)
                ? (score.sectionBreakdown as Array<{ code: string; title: string; net?: number; accuracy?: number }>)
                : null,
            }
          : null,
      };
    }),
  });
  const weakest = await prisma.odkAttemptOutcomeScore.groupBy({
    by: ["outcomeId"],
    where: { score: { attempt: { examId, status: { not: "VOID" } } } },
    _avg: { accuracyRate: true },
    _count: { _all: true },
    orderBy: { _avg: { accuracyRate: "asc" } },
    take: 6,
  });
  const outcomeTitles = weakest.length
    ? new Map(
        (await prisma.learningOutcome.findMany({ where: { id: { in: weakest.map((row) => row.outcomeId) } }, select: { id: true, code: true, title: true } })).map(
          (outcome) => [outcome.id, `${outcome.code} · ${outcome.title}`],
        ),
      )
    : new Map<string, string>();
  return { summary, weakest, outcomeTitles };
}
