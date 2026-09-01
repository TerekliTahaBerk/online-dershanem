import "server-only";

import { createHash } from "node:crypto";
import type { OdkAnswerOption, OdkQuestionResult } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { aggregateOutcomeScores, scoreAttempt } from "@/lib/odk/scoring";

export const ODK_SCORING_VERSION = "odk-exam-v2";

export async function scoreOdkExam(examId: string, scoredById: string, options: { rescore?: boolean } = {}) {
  const now = new Date();
  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    include: {
      currentVersion: { include: { scoringPolicy: true, sections: { orderBy: { position: "asc" }, include: { questions: { where: { isActive: true }, orderBy: { position: "asc" }, include: { outcomes: true } } } } } },
      attempts: { where: { status: { not: "VOID" } }, include: { answers: true, score: { select: { attemptId: true, publicationStatus: true } }, timings: true } },
    },
  });
  if (!exam?.currentVersion) return { ok: false as const, error: "Aktif sınav sürümü bulunamadı." };
  if (!exam.endsAt || exam.endsAt > now) return { ok: false as const, error: "Deneme bitmeden puanlama yapılamaz." };
  if (!["SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED"].includes(exam.status)) return { ok: false as const, error: "Deneme bu durumda puanlanamaz." };

  const questions = exam.currentVersion.sections.flatMap((section) => section.questions.map((question) => ({ ...question, sectionId: section.id, sectionTitle: section.title, sectionCode: section.code })));
  if (!questions.length || questions.some((question) => !question.correctOption)) return { ok: false as const, error: "Kilitli cevap anahtarı eksik." };
  const answerKeyHash = createHash("sha256").update(JSON.stringify(questions.map((question) => [question.id, question.correctOption]))).digest("hex");
  const penalty = Number(exam.currentVersion.scoringPolicy.wrongPenalty);

  await prisma.$transaction(async (tx) => {
    await tx.odkExamAttempt.updateMany({ where: { examId, status: "IN_PROGRESS", deadlineAt: { lte: now } }, data: { status: "AUTO_SUBMITTED", submittedAt: now } });
    for (const attempt of exam.attempts) {
      if (!options.rescore && attempt.score) continue;
      if (attempt.status === "IN_PROGRESS" && attempt.deadlineAt > now) continue;
      if (options.rescore && attempt.score) {
        await tx.odkAttemptQuestionResult.deleteMany({ where: { attemptId: attempt.id } });
        await tx.odkAttemptOutcomeScore.deleteMany({ where: { attemptId: attempt.id } });
        await tx.odkAttemptScore.delete({ where: { attemptId: attempt.id } });
      }
      const sections = exam.currentVersion!.sections.map((section) => ({ id: section.id, title: section.title, questionCount: section.questions.length }));
      const official = questions.map((question) => ({ sectionId: question.sectionId, questionNumber: question.questionNumber, correctOption: question.correctOption! }));
      const questionById = new Map(questions.map((question) => [question.id, question]));
      const student = attempt.answers.flatMap((answer) => { const question = questionById.get(answer.questionId); return question && answer.selectedOption ? [{ sectionId: question.sectionId, questionNumber: question.questionNumber, selectedOption: answer.selectedOption }] : []; });
      const result = scoreAttempt(sections, official, student, penalty);
      const selectedByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer.selectedOption]));
      const questionResults = questions.map((question) => {
        const selected = selectedByQuestion.get(question.id) || null;
        const questionResult: OdkQuestionResult = !selected ? "BLANK" : selected === question.correctOption ? "CORRECT" : "WRONG";
        return { questionId: question.id, selectedOption: selected as OdkAnswerOption | null, correctOption: question.correctOption!, result: questionResult };
      });
      const outcomesByQuestion = new Map(questions.map((question) => [question.id, question.outcomes.map((outcome) => outcome.outcomeId)]));
      const outcomeScores = aggregateOutcomeScores(questionResults.map((question) => ({ result: question.result, outcomeIds: outcomesByQuestion.get(question.questionId) || [] })));
      const activeDurationMs = (attempt.timings || []).reduce((sum, timing) => sum + timing.activeDurationMs, 0);
      const publicationStatus = exam.status === "RELEASED" || attempt.score?.publicationStatus === "PUBLISHED" ? "PUBLISHED" : "HIDDEN";
      await tx.odkAttemptScore.create({
        data: {
          attemptId: attempt.id, correctCount: result.correctCount, wrongCount: result.wrongCount, blankCount: result.blankCount, totalNet: result.totalNet,
          sectionBreakdown: result.sectionScores,
          scoringVersion: ODK_SCORING_VERSION, answerKeyHash, scoredById, publicationStatus, activeDurationMs,
          questionResults: { create: questionResults },
          outcomeScores: { create: outcomeScores },
        },
      });
    }
    if (exam.status !== "RELEASED") await tx.odkExam.update({ where: { id: examId }, data: { status: "SCORED" } });
  });
  const scoredCount = await prisma.odkAttemptScore.count({ where: { attempt: { examId } } });
  return { ok: true as const, scoredCount, answerKeyHash, family: exam.family };
}
