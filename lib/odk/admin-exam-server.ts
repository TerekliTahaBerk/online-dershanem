import "server-only";

import { prisma } from "@/lib/prisma";
import { validateVersionReadiness } from "@/lib/odk/exam-domain";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";

export const odkExamEditorInclude = {
  series: { select: { id: true, title: true } },
  examFamilyRef: { select: { code: true, name: true } },
  currentVersion: {
    include: {
      scoringPolicy: true,
      files: true,
      sections: { orderBy: { position: "asc" as const }, include: { questions: { orderBy: { position: "asc" as const }, include: { outcomes: true } } } },
    },
  },
} as const;

export async function getOdkExamReadiness(examId: string) {
  const exam = await prisma.odkExam.findUnique({ where: { id: examId }, include: odkExamEditorInclude });
  if (!exam?.currentVersion) return { exam, issues: [{ level: "error" as const, code: "VERSION_MISSING", message: "Aktif sınav sürümü bulunamadı." }] };
  const version = exam.currentVersion;
  const issues = validateVersionReadiness({
    family: exam.family,
    familyCode: getOdkExamFamilyCode(exam),
    durationMinutes: version.durationMinutes,
    scoringPolicyCode: version.scoringPolicy.code,
    structureMode: exam.structureMode,
    templateCode: exam.templateCode,
    files: version.files.map((file) => file.type),
    requireBookletPdf: version.sections.some((section) => section.questions.some((question) => question.contentType === "BOOKLET_PDF")),
    sections: version.sections.map((section) => ({ code: section.code, questionCount: section.questionCount, questions: section.questions.map((question) => ({ questionNumber: question.questionNumber, correctOption: question.correctOption, outcomes: question.outcomes.map((outcome) => ({ outcomeId: outcome.outcomeId, isPrimary: outcome.isPrimary })) })) })),
  });
  return { exam, issues };
}
