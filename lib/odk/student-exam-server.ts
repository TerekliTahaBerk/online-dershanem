import "server-only";

import { prisma } from "@/lib/prisma";
import { attemptHasExpired, decideAttemptStart } from "@/lib/odk/attempt-domain";

export const studentExamInclude = {
  currentVersion: {
    include: {
      sections: { orderBy: { position: "asc" as const }, include: { questions: { where: { isActive: true }, orderBy: { position: "asc" as const }, select: { id: true, questionNumber: true, position: true } } } },
      files: { where: { type: "BOOKLET_PDF" as const }, select: { id: true } },
    },
  },
} as const;

export async function listStudentExams(studentUserId: string) {
  const now = new Date();
  return prisma.odkExam.findMany({
    where: { status: { in: ["SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED"] }, publishedAt: { not: null } },
    orderBy: [{ startsAt: "desc" }],
    take: 50,
    select: {
      id: true, title: true, family: true, status: true, startsAt: true, endsAt: true, lateEntryMinutes: true, meetRequired: true,
      currentVersion: { select: { durationMinutes: true } },
      attempts: { where: { studentUserId }, orderBy: { attemptNumber: "desc" }, take: 1, select: { id: true, status: true, deadlineAt: true, submittedAt: true } },
    },
  }).then((exams) => exams.map((exam) => ({ ...exam, serverNow: now })));
}

export async function getStudentExam(examId: string, studentUserId: string) {
  const exam = await prisma.odkExam.findFirst({
    where: { id: examId, status: { in: ["SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED"] }, publishedAt: { not: null } },
    include: { ...studentExamInclude, attempts: { where: { studentUserId }, orderBy: { attemptNumber: "desc" }, take: 1, include: { answers: true } } },
  });
  if (!exam) return null;
  const attempt = exam.attempts[0] || null;
  if (attempt?.status === "IN_PROGRESS" && attemptHasExpired(attempt.deadlineAt)) {
    const finalized = await prisma.odkExamAttempt.update({ where: { id: attempt.id }, data: { status: "AUTO_SUBMITTED", submittedAt: new Date() }, include: { answers: true } });
    exam.attempts[0] = finalized;
  }
  const decision = exam.currentVersion ? decideAttemptStart({ ...exam, durationMinutes: exam.currentVersion.durationMinutes }) : { ok: false as const, code: "NOT_SCHEDULED" as const };
  return { exam, attempt: exam.attempts[0] || null, startDecision: decision, serverNow: new Date() };
}

export async function getReleasedStudentResult(examId: string, studentUserId: string) {
  const exam = await prisma.odkExam.findFirst({
    where: { id: examId, status: "RELEASED", resultsReleasedAt: { lte: new Date() } },
    select: {
      id: true, title: true, family: true, resultsReleasedAt: true,
      currentVersion: { select: { files: { where: { type: "ANSWER_KEY_PDF" }, take: 1, select: { id: true } } } },
      attempts: {
        where: { studentUserId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, score: { isNot: null } }, orderBy: { attemptNumber: "desc" }, take: 1,
        select: {
          id: true, submittedAt: true,
          score: {
            select: {
              correctCount: true, wrongCount: true, blankCount: true, totalNet: true,
              questionResults: { orderBy: { question: { position: "asc" } }, select: { selectedOption: true, correctOption: true, result: true, question: { select: { questionNumber: true } } } },
              outcomeScores: { orderBy: [{ accuracyRate: "asc" }, { outcome: { code: "asc" } }], select: { questionCount: true, correctCount: true, wrongCount: true, blankCount: true, accuracyRate: true, outcome: { select: { code: true, title: true, unit: { select: { name: true } } } } } },
            },
          },
        },
      },
    },
  });
  const attempt = exam?.attempts[0];
  return exam && attempt?.score ? { exam, attempt, score: attempt.score } : null;
}
