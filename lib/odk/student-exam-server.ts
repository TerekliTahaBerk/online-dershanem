import "server-only";

import { prisma } from "@/lib/prisma";
import { attemptHasExpired, decideAttemptStart } from "@/lib/odk/attempt-domain";
import { getActiveOdkExamGrant, listActiveOdkContracts } from "@/lib/odk/product-contract-server";
import { contractAnswerKeyAvailable, contractExamSchedule, contractResultAvailable } from "@/lib/odk/product-contract";
import { buildOutcomeTrends, buildWeakOutcomeSignals } from "@/lib/odk/reporting";

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
  const contracts = await listActiveOdkContracts(studentUserId, now);
  const examIds = [...new Set(contracts.flatMap(({ contract }) => contract.exams.map((exam) => exam.id)))];
  const grants = new Map<string, { exam: (typeof contracts)[number]["contract"]["exams"][number]; liveService: boolean }>();
  for (const { contract } of contracts) {
    for (const exam of contract.exams) if (!grants.has(exam.id)) grants.set(exam.id, { exam, liveService: contract.policy.rights.liveService });
  }
  return prisma.odkExam.findMany({
    where: { id: { in: examIds }, status: { in: ["SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED"] }, publishedAt: { not: null } },
    orderBy: [{ startsAt: "desc" }],
    take: 50,
    select: {
      id: true, title: true, family: true, status: true, startsAt: true, endsAt: true, lateEntryMinutes: true, meetRequired: true, resultsReleasedAt: true,
      currentVersion: { select: { durationMinutes: true } },
      attempts: { where: { studentUserId }, orderBy: { attemptNumber: "desc" }, take: 1, select: { id: true, status: true, deadlineAt: true, submittedAt: true } },
    },
  }).then((exams) => exams.map((exam) => {
    const grant = grants.get(exam.id);
    const schedule = grant ? contractExamSchedule(grant.exam) : null;
    const startDecision = schedule && exam.currentVersion
      ? decideAttemptStart({
          status: exam.status,
          ...schedule,
          durationMinutes: exam.currentVersion.durationMinutes,
        }, now)
      : { ok: false as const, code: "NOT_SCHEDULED" as const };
    const resultAvailable = grant ? contractResultAvailable(grant.exam, exam) : false;
    return {
      ...exam,
      ...(schedule || {}),
      meetRequired: Boolean(grant?.exam.liveServiceRequired && grant.liveService),
      serverNow: now,
      startDecision,
      resultAvailable,
    };
  }));
}

export async function getStudentExam(examId: string, studentUserId: string) {
  const grant = await getActiveOdkExamGrant(studentUserId, examId);
  if (!grant) return null;
  const exam = await prisma.odkExam.findFirst({
    where: { id: examId, status: { in: ["SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED"] }, publishedAt: { not: null } },
    include: { ...studentExamInclude, attempts: { where: { studentUserId }, orderBy: { attemptNumber: "desc" }, take: 1, include: { answers: true } } },
  });
  if (!exam) return null;
  const schedule = contractExamSchedule(grant.exam);
  exam.startsAt = schedule.startsAt;
  exam.endsAt = schedule.endsAt;
  exam.lateEntryMinutes = schedule.lateEntryMinutes;
  exam.attemptLimit = schedule.attemptLimit;
  exam.meetRequired = grant.exam.liveServiceRequired && grant.contract.policy.rights.liveService;
  const attempt = exam.attempts[0] || null;
  if (attempt?.status === "IN_PROGRESS" && attemptHasExpired(attempt.deadlineAt)) {
    const finalized = await prisma.odkExamAttempt.update({ where: { id: attempt.id }, data: { status: "AUTO_SUBMITTED", submittedAt: new Date() }, include: { answers: true } });
    exam.attempts[0] = finalized;
  }
  const decision = exam.currentVersion ? decideAttemptStart({ status: exam.status, ...contractExamSchedule(grant.exam), durationMinutes: exam.currentVersion.durationMinutes }) : { ok: false as const, code: "NOT_SCHEDULED" as const };
  return { exam, attempt: exam.attempts[0] || null, startDecision: decision, resultAvailable: contractResultAvailable(grant.exam, exam), serverNow: new Date() };
}

export async function getReleasedStudentResult(examId: string, studentUserId: string) {
  const grant = await getActiveOdkExamGrant(studentUserId, examId);
  if (!grant || !grant.contract.policy.rights.studentReports) return null;
  const exam = await prisma.odkExam.findFirst({
    where: { id: examId, status: "RELEASED" },
    select: {
      id: true, title: true, family: true, status: true, resultsReleasedAt: true, answerKeyReleasedAt: true,
      currentVersion: { select: { files: { where: { type: "ANSWER_KEY_PDF" }, take: 1, select: { id: true } } } },
      attempts: {
        where: { studentUserId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, score: { isNot: null } }, orderBy: { attemptNumber: "desc" }, take: 1,
        select: {
          id: true, submittedAt: true,
          score: {
            select: {
              correctCount: true, wrongCount: true, blankCount: true, totalNet: true,
              questionResults: { orderBy: { question: { position: "asc" } }, select: { selectedOption: true, correctOption: true, result: true, question: { select: { questionNumber: true } } } },
              outcomeScores: { orderBy: [{ accuracyRate: "asc" }, { outcome: { code: "asc" } }], select: { outcomeId: true, questionCount: true, correctCount: true, wrongCount: true, blankCount: true, accuracyRate: true, outcome: { select: { code: true, title: true, unit: { select: { name: true } } } } } },
            },
          },
        },
      },
    },
  });
  if (!exam || !contractResultAvailable(grant.exam, exam)) return null;
  const attempt = exam?.attempts[0];
  if (!attempt?.score) return null;
  const attempts = await prisma.odkExamAttempt.findMany({
    where: { studentUserId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, exam: { status: "RELEASED" }, score: { isNot: null } },
    orderBy: [{ exam: { startsAt: "desc" } }, { submittedAt: "desc" }, { attemptNumber: "desc" }],
    take: 30,
    select: {
      examId: true,
      submittedAt: true,
      exam: { select: { startsAt: true } },
      score: { select: { outcomeScores: { select: { outcomeId: true, questionCount: true, accuracyRate: true, outcome: { select: { code: true, title: true, unit: { select: { name: true } } } } } } } },
    },
  });
  const latestByExam = new Map<string, (typeof attempts)[number]>();
  for (const row of attempts) if (!latestByExam.has(row.examId)) latestByExam.set(row.examId, row);
  const outcomeEvidence = [...latestByExam.values()].flatMap((row) => row.score ? row.score.outcomeScores.map((outcome) => ({
    examId: row.examId,
    takenAt: row.exam.startsAt || row.submittedAt || new Date(0),
    outcomeId: outcome.outcomeId,
    code: outcome.outcome.code,
    title: outcome.outcome.title,
    unitName: outcome.outcome.unit.name,
    questionCount: outcome.questionCount,
    accuracyRate: Number(outcome.accuracyRate),
  })) : []);
  const outcomeTrends = buildOutcomeTrends(outcomeEvidence);
  const weakOutcomeSignals = buildWeakOutcomeSignals({
    latestScores: attempt.score.outcomeScores.map((item) => ({
      outcomeId: item.outcomeId,
      code: item.outcome.code,
      title: item.outcome.title,
      unitName: item.outcome.unit.name,
      questionCount: item.questionCount,
      accuracyRate: Number(item.accuracyRate),
    })),
    trends: outcomeTrends,
  });
  return { exam, attempt, score: attempt.score, answerKeyAvailable: contractAnswerKeyAvailable(grant.exam, exam), outcomeTrends, weakOutcomeSignals };
}
