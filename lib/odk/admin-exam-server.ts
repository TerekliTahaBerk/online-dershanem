import "server-only";

import { prisma } from "@/lib/prisma";
import { validateVersionReadiness } from "@/lib/odk/exam-domain";

export const odkExamEditorInclude = {
  series: { select: { id: true, title: true } },
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
    durationMinutes: version.durationMinutes,
    scoringPolicyCode: version.scoringPolicy.code,
    structureMode: exam.structureMode,
    templateCode: exam.templateCode,
    files: version.files.map((file) => file.type),
    sections: version.sections.map((section) => ({ code: section.code, questionCount: section.questionCount, questions: section.questions.map((question) => ({ questionNumber: question.questionNumber, correctOption: question.correctOption, outcomes: question.outcomes.map((outcome) => ({ outcomeId: outcome.outcomeId, isPrimary: outcome.isPrimary })) })) })),
  });
  return { exam, issues };
}
