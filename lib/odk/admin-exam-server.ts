import "server-only";

import { prisma } from "@/lib/prisma";
import { validateVersionReadiness } from "@/lib/odk/exam-domain";
import { readTemplateSnapshot } from "@/lib/odk/exam-templates";
import { readSessionPlan } from "@/lib/odk/exam-sessions";
import { bookletCodesOf } from "@/lib/odk/booklets";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";

export const odkExamEditorInclude = {
  series: { select: { id: true, title: true } },
  examFamilyRef: { select: { code: true, name: true } },
  currentVersion: {
    include: {
      scoringPolicy: true,
      files: true,
      bookletOrders: { select: { bookletCode: true } },
      sections: { orderBy: { position: "asc" as const }, include: { questions: { orderBy: { position: "asc" as const }, include: { outcomes: true } } } },
    },
  },
} as const;

export async function getOdkExamReadiness(examId: string, db: Pick<typeof prisma, "odkExam"> = prisma) {
  const exam = await db.odkExam.findUnique({ where: { id: examId }, include: odkExamEditorInclude });
  if (!exam?.currentVersion) return { exam, issues: [{ level: "error" as const, code: "VERSION_MISSING", message: "Aktif sınav sürümü şu an görünmüyor." }] };
  const version = exam.currentVersion;
  const issues = validateVersionReadiness({
    family: exam.family,
    familyCode: getOdkExamFamilyCode(exam),
    durationMinutes: version.durationMinutes,
    scoringPolicyCode: version.scoringPolicy.code,
    structureMode: exam.structureMode,
    templateCode: exam.templateCode,
    templateSnapshot: readTemplateSnapshot(version.settings),
    files: version.files.map((file) => file.type),
    sessionKeys: readSessionPlan(version.settings)?.map((item) => item.key) ?? [],
    bookletSessionKeys: version.files.filter((file) => file.type === "BOOKLET_PDF").map((file) => file.sessionKey),
    bookletCodes: bookletCodesOf(version.bookletOrders),
    bookletFiles: version.files.filter((file) => file.type === "BOOKLET_PDF").map((file) => ({ sessionKey: file.sessionKey, bookletCode: file.bookletCode })),
    requireBookletPdf: version.sections.some((section) => section.questions.some((question) => question.contentType === "BOOKLET_PDF")),
    sections: version.sections.map((section) => ({ code: section.code, questionCount: section.questionCount, questions: section.questions.map((question) => ({ questionNumber: question.questionNumber, correctOption: question.correctOption, outcomes: question.outcomes.map((outcome) => ({ outcomeId: outcome.outcomeId, isPrimary: outcome.isPrimary })) })) })),
  });
  return { exam, issues };
}
