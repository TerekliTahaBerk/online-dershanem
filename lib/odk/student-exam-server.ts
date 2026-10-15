import "server-only";

import { prisma } from "@/lib/prisma";
import { attemptHasExpired, decideAttemptStart } from "@/lib/odk/attempt-domain";
import { getActiveOdkExamGrant, listActiveOdkContracts } from "@/lib/odk/product-contract-server";
import { contractAnswerKeyAvailable, contractExamSchedule, contractResultAvailable } from "@/lib/odk/product-contract";
import { buildOutcomeTrends, buildWeakOutcomeSignals } from "@/lib/odk/reporting";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import { normalizeSectionBreakdown } from "@/lib/odk/student-result-view";

export const studentExamInclude = {
  examFamilyRef: { select: { code: true } },
  currentVersion: {
    include: {
      sections: { orderBy: { position: "asc" as const }, include: { questions: { where: { isActive: true }, orderBy: { position: "asc" as const }, select: { id: true, questionNumber: true, position: true, bookletPage: true } } } },
      files: { where: { type: "BOOKLET_PDF" as const }, select: { id: true } },
    },
  },
} as const;

/**
 * Öğrencinin yetkili denemeleri, en yeni başlangıç önce. `limit` varsayılanı
 * web ile aynı 50; mobil liste kesildiğini bilmek için bir fazlasını ister.
 */
export async function listStudentExams(studentUserId: string, options: { limit?: number; cursor?: string } = {}) {
  const now = new Date();
  const contracts = await listActiveOdkContracts(studentUserId, now);
  const examIds = [...new Set(contracts.flatMap(({ contract }) => contract.exams.map((exam) => exam.id)))];
  const grants = new Map<string, { exam: (typeof contracts)[number]["contract"]["exams"][number]; liveService: boolean }>();
  for (const { contract } of contracts) {
    for (const exam of contract.exams) if (!grants.has(exam.id)) grants.set(exam.id, { exam, liveService: contract.policy.rights.liveService });
  }
  return prisma.odkExam.findMany({
    where: { id: { in: examIds }, status: { in: ["SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED"] }, publishedAt: { not: null } },
    // `id` eşitlik bozucudur: aynı başlangıçlı denemelerde sayfalama kararlı kalır.
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    take: options.limit ?? 50,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: {
      id: true, title: true, family: true, examFamilyRef: { select: { code: true } }, status: true, startsAt: true, endsAt: true, lateEntryMinutes: true, meetRequired: true, resultsReleasedAt: true,
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
      family: getOdkExamFamilyCode(exam),
      ...(schedule || {}),
      meetRequired: Boolean(grant?.exam.liveServiceRequired && grant.liveService),
      serverNow: now,
      startDecision,
      resultAvailable,
    };
  }));
}

/**
 * `finalizeExpired` (varsayılan true, web davranışı): süresi dolmuş açık
 * denemeyi okurken otomatik teslim eder. Mobil ayrıntı ekranı salt okunurdur
 * ve `false` geçer: yazma yapılmaz, yalnız `attemptExpired` bildirilir.
 */
export async function getStudentExam(examId: string, studentUserId: string, options: { finalizeExpired?: boolean } = {}) {
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
  const attemptExpired = Boolean(attempt?.status === "IN_PROGRESS" && attemptHasExpired(attempt.deadlineAt));
  if (attemptExpired && attempt && options.finalizeExpired !== false) {
    const finalized = await prisma.odkExamAttempt.update({ where: { id: attempt.id }, data: { status: "AUTO_SUBMITTED", submittedAt: new Date() }, include: { answers: true } });
    exam.attempts[0] = finalized;
  }
  const decision = exam.currentVersion ? decideAttemptStart({ status: exam.status, ...contractExamSchedule(grant.exam), durationMinutes: exam.currentVersion.durationMinutes }) : { ok: false as const, code: "NOT_SCHEDULED" as const };
  const current = exam.attempts[0] || null;
  return {
    exam,
    attempt: current,
    // Yalnız `finalizeExpired: false` iken true kalabilir (deneme hâlâ IN_PROGRESS kayıtlı).
    attemptExpired: Boolean(current?.status === "IN_PROGRESS" && attemptHasExpired(current.deadlineAt)),
    startDecision: decision,
    resultAvailable: contractResultAvailable(grant.exam, exam),
    serverNow: new Date(),
  };
}

export async function getReleasedStudentResult(examId: string, studentUserId: string) {
  const grant = await getActiveOdkExamGrant(studentUserId, examId);
  if (!grant || !grant.contract.policy.rights.studentReports) return null;
  const exam = await prisma.odkExam.findFirst({
    where: { id: examId, status: "RELEASED" },
    select: {
      id: true, title: true, family: true, examFamilyRefId: true, examFamilyRef: { select: { code: true } }, status: true, resultsReleasedAt: true, answerKeyReleasedAt: true,
      currentVersion: { select: { files: { where: { type: "ANSWER_KEY_PDF" }, take: 1, select: { id: true } } } },
      attempts: {
        where: { studentUserId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, score: { is: { publicationStatus: "PUBLISHED" } } }, orderBy: { attemptNumber: "desc" }, take: 1,
        select: {
          id: true, submittedAt: true, startedAt: true, bookletCode: true, versionId: true,
          // Eski puan satırlarında eksik bölüm kodunu tamamlamak için (P0-11).
          version: { select: { sections: { select: { id: true, code: true } } } },
          timings: { select: { questionId: true, activeDurationMs: true } },
          // "İşaretlediğim" filtresi: öğrencinin kendi işaretleri (yalnız soru kimliği ve bayrak).
          answers: { where: { isMarked: true }, select: { questionId: true } },
          score: {
            select: {
              correctCount: true, wrongCount: true, blankCount: true, totalNet: true, activeDurationMs: true, sectionBreakdown: true,
              questionResults: {
                orderBy: { question: { position: "asc" } },
                select: {
                  selectedOption: true, correctOption: true, result: true,
                  questionId: true,
                  question: {
                    select: {
                      questionNumber: true,
                      section: { select: { code: true, title: true } },
                      outcomes: { select: { isPrimary: true, outcome: { select: { code: true, title: true } } } },
                    },
                  },
                },
              },
              outcomeScores: { orderBy: [{ accuracyRate: "asc" }, { outcome: { code: "asc" } }], select: { outcomeId: true, questionCount: true, correctCount: true, wrongCount: true, blankCount: true, accuracyRate: true, activeDurationMs: true, outcome: { select: { code: true, title: true, unit: { select: { name: true } } } } } },
            },
          },
        },
      },
    },
  });
  if (!exam || !contractResultAvailable(grant.exam, exam)) return null;
  const attempt = exam?.attempts[0];
  if (!attempt?.score) return null;
  // Çoklu kitapçık: öğrenci soruları kendi kitapçığının numarası ve sırasıyla görür (puan kanonik).
  if (attempt.bookletCode !== "A") {
    const orders = await prisma.odkBookletQuestionOrder.findMany({ where: { versionId: attempt.versionId, bookletCode: attempt.bookletCode }, select: { questionId: true, bookletQuestionNumber: true } });
    if (orders.length) {
      const numberById = new Map(orders.map((row) => [row.questionId, row.bookletQuestionNumber]));
      const sectionOrder = [...new Set(attempt.score.questionResults.map((item) => item.question.section.code))];
      for (const item of attempt.score.questionResults) item.question.questionNumber = numberById.get(item.questionId) ?? item.question.questionNumber;
      attempt.score.questionResults.sort((a, b) => sectionOrder.indexOf(a.question.section.code) - sectionOrder.indexOf(b.question.section.code) || a.question.questionNumber - b.question.questionNumber);
    }
  }
  const attempts = await prisma.odkExamAttempt.findMany({
    where: { studentUserId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, exam: { status: "RELEASED", examFamilyRefId: exam.examFamilyRefId }, score: { is: { publicationStatus: "PUBLISHED" } } },
    orderBy: [{ exam: { startsAt: "desc" } }, { submittedAt: "desc" }, { attemptNumber: "desc" }],
    take: 30,
    select: {
      examId: true,
      submittedAt: true,
      exam: { select: { id: true, title: true, startsAt: true, family: true, examFamilyRef: { select: { code: true } } } },
      score: {
        select: {
          totalNet: true,
          outcomeScores: { select: { outcomeId: true, questionCount: true, accuracyRate: true, outcome: { select: { code: true, title: true, unit: { select: { name: true } } } } } },
        },
      },
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
  const timingByQuestion = new Map(attempt.timings.map((row) => [row.questionId, row.activeDurationMs]));
  const { aggregateQuestionTimings } = await import("@/lib/odk/time-analysis");
  const timeAnalysis = aggregateQuestionTimings(
    attempt.score.questionResults.map((item) => ({
      questionId: item.questionId,
      sectionCode: item.question.section.code,
      sectionTitle: item.question.section.title,
      result: item.result,
      activeDurationMs: timingByQuestion.get(item.questionId) || 0,
    })),
  );
  const comparison = [...latestByExam.values()]
    .filter((row) => row.score)
    .map((row) => ({
      examId: row.examId,
      title: row.exam.title,
      family: getOdkExamFamilyCode(row.exam),
      takenAt: row.exam.startsAt || row.submittedAt || new Date(0),
      totalNet: Number(row.score!.totalNet),
    }))
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const coachSuggestions = (await import("@/lib/odk/coach-suggestions")).buildCoachSuggestions(
    attempt.score.outcomeScores.map((item) => ({
      code: item.outcome.code,
      title: item.outcome.title,
      unitName: item.outcome.unit.name,
      questionCount: item.questionCount,
      correctCount: item.correctCount,
      accuracyRate: Number(item.accuracyRate),
    })),
    3,
  );
  return {
    exam,
    attempt,
    score: attempt.score,
    answerKeyAvailable: contractAnswerKeyAvailable(grant.exam, exam),
    outcomeTrends,
    weakOutcomeSignals,
    timeAnalysis,
    comparison,
    coachSuggestions,
    sectionBreakdown: normalizeSectionBreakdown(attempt.score.sectionBreakdown, new Map(attempt.version.sections.map((section) => [section.id, section.code]))),
  };
}

/**
 * Çözücünün soru listesi ve oturum planı ATTEMPT'İN sürümünden gelir (P1-8):
 * deneme sonradan yeni sürüme geçse de öğrenci başladığı sorularla devam eder;
 * cevap ucu da aynı sürümü doğrular.
 */
export async function loadAttemptRunnerVersion(versionId: string, bookletCode = "A") {
  return prisma.odkExamVersion.findUnique({
    where: { id: versionId },
    select: {
      settings: true,
      _count: { select: { bookletOrders: true } },
      // Çoklu kitapçık: öğrencinin kitapçığının soru sırası (A kanonik, satırı yok).
      bookletOrders: { where: { bookletCode }, select: { bookletCode: true, questionId: true, sectionId: true, bookletQuestionNumber: true, bookletPage: true } },
      sections: { orderBy: { position: "asc" }, select: { id: true, code: true, title: true, questions: { where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, questionNumber: true, position: true, bookletPage: true } } } },
    },
  });
}
