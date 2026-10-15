import "server-only";

import { createHash } from "node:crypto";
import type { OdkAnswerOption, OdkQuestionResult } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { aggregateOutcomeScores, scoreAttempt, scoreSubtests } from "@/lib/odk/scoring";
import { readTemplateSnapshot } from "@/lib/odk/exam-templates";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import { diffAnswerKey, type AnswerKeyEntry } from "@/lib/odk/answer-key-revision";

export const ODK_SCORING_VERSION = "odk-exam-v2";

type ScoringDb = Pick<typeof prisma, "odkExam" | "odkAttemptScore" | "$transaction">;

/**
 * Bir revizyonun (henüz yazılmamış) anahtar değişikliği: soru kimliği → yeni
 * doğru seçenek ya da iptal. Yalnız etki önizlemesinde kullanılır.
 */
export type AnswerKeyOverride = Map<string, { correctOption: OdkAnswerOption } | { cancelled: true }>;

const versionInclude = { scoringPolicy: true, sections: { orderBy: { position: "asc" as const }, include: { questions: { orderBy: { position: "asc" as const }, include: { outcomes: true } } } } } as const;

async function loadScoringExam(db: ScoringDb, examId: string) {
  return db.odkExam.findUnique({
    where: { id: examId },
    include: {
      examFamilyRef: { select: { code: true } },
      // İptal edilen (isActive=false) sorular da yüklenir: anahtar farkı ve iptal etkisi için.
      // Tüm sürümler yüklenir: her attempt KENDİ sürümüyle puanlanır (P1-8).
      versions: { include: versionInclude },
      attempts: {
        where: { status: { not: "VOID" } },
        include: {
          answers: true,
          timings: true,
          score: { select: { attemptId: true, publicationStatus: true, totalNet: true, questionResults: { select: { questionId: true, correctOption: true } } } },
        },
      },
    },
  });
}

type LoadedExam = NonNullable<Awaited<ReturnType<typeof loadScoringExam>>>;
type LoadedAttempt = LoadedExam["attempts"][number];
type LoadedVersion = LoadedExam["versions"][number];

/** Puanlamaya giren sorular: aktif + (varsa) revizyon önizlemesi uygulanmış. */
function scoringQuestions(version: LoadedVersion, override?: AnswerKeyOverride) {
  return version.sections.flatMap((section) =>
    section.questions.flatMap((question) => {
      const change = override?.get(question.id);
      if (change && "cancelled" in change) return [];
      if (!question.isActive) return [];
      const correctOption = change && "correctOption" in change ? change.correctOption : question.correctOption;
      return [{ ...question, correctOption, sectionId: section.id, sectionTitle: section.title, sectionCode: section.code }];
    }),
  );
}

type ScoringQuestion = ReturnType<typeof scoringQuestions>[number];

function answerKeyHashOf(questions: ScoringQuestion[]) {
  return createHash("sha256").update(JSON.stringify(questions.map((question) => [question.id, question.correctOption]))).digest("hex");
}

function computeAttemptScore(version: LoadedVersion, questions: ScoringQuestion[], attempt: LoadedAttempt) {
  const policy = version.scoringPolicy;
  const activeIds = new Set(questions.map((question) => question.id));
  const sections = version.sections.map((section) => ({ id: section.id, code: section.code, title: section.title, questionCount: section.questions.filter((question) => activeIds.has(question.id)).length }));
  const official = questions.map((question) => ({ sectionId: question.sectionId, questionNumber: question.questionNumber, correctOption: question.correctOption! }));
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const student = attempt.answers.flatMap((answer) => { const question = questionById.get(answer.questionId); return question && answer.selectedOption ? [{ sectionId: question.sectionId, questionNumber: question.questionNumber, selectedOption: answer.selectedOption }] : []; });
  const result = scoreAttempt(sections, official, student, Number(policy.wrongPenalty), { minimumNetIsZero: policy.minimumNetIsZero });
  // Alt test kırılımı yalnız sürümün kendi şablon görüntüsünden (Faz 3); eski denemeler yeniden yorumlanmaz.
  const snapshot = readTemplateSnapshot(version.settings);
  if (snapshot) {
    const subtestsBySection = new Map(version.sections.map((section) => [section.id, snapshot.sections.find((item) => item.code === section.code)?.subtests ?? []]));
    const subtests = scoreSubtests(result.perQuestion, subtestsBySection, Number(policy.wrongPenalty));
    for (const row of result.sectionScores) {
      const rows = subtests.get(row.sectionId);
      if (rows) row.subtests = rows;
    }
  }
  const selectedByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer.selectedOption]));
  const questionResults = questions.map((question) => {
    const selected = selectedByQuestion.get(question.id) || null;
    const questionResult: OdkQuestionResult = !selected ? "BLANK" : selected === question.correctOption ? "CORRECT" : "WRONG";
    return { questionId: question.id, selectedOption: selected as OdkAnswerOption | null, correctOption: question.correctOption!, result: questionResult };
  });
  const outcomesByQuestion = new Map(questions.map((question) => [question.id, question.outcomes.map((outcome) => outcome.outcomeId)]));
  // Soru başı aktif süre kazanım özetine taşınır (P1-5); süre kaydı hiç yoksa alan boş kalır.
  const timingByQuestion = attempt.timings?.length ? new Map(attempt.timings.map((timing) => [timing.questionId, timing.activeDurationMs])) : null;
  const outcomeScores = aggregateOutcomeScores(questionResults.map((question) => ({ result: question.result, outcomeIds: outcomesByQuestion.get(question.questionId) || [], ...(timingByQuestion ? { activeDurationMs: timingByQuestion.get(question.questionId) ?? 0 } : {}) })));
  const activeDurationMs = (attempt.timings || []).reduce((sum, timing) => sum + timing.activeDurationMs, 0);
  return { result, questionResults, outcomeScores, activeDurationMs };
}

/**
 * Puanlama planı: her puanlanacak attempt kendi sürümüyle eşlenir (P1-8). Güncel
 * sürüm sonradan değişse de geçmiş attempt'ler kendi sorularıyla puanlanır.
 * Revizyon önizlemesi (`override`) yalnız soru kimliğiyle eşleşen sorulara uygulanır.
 */
function scoringPlan(exam: LoadedExam | null, now: Date, override?: AnswerKeyOverride): { ok: true; byVersion: Map<string, { version: LoadedVersion; questions: ScoringQuestion[]; answerKeyHash: string }>; currentHash: string } | { ok: false; error: string } {
  const current = exam?.versions.find((version) => version.id === exam.currentVersionId);
  if (!exam || !current) return { ok: false, error: "Aktif sınav sürümü bulunamadı." };
  if (!exam.endsAt || exam.endsAt > now) return { ok: false, error: "Deneme bitmeden puanlama yapılamaz." };
  if (!["SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED"].includes(exam.status)) return { ok: false, error: "Deneme bu durumda puanlanamaz." };
  const usedIds = new Set([current.id, ...exam.attempts.map((attempt) => attempt.versionId)]);
  const byVersion = new Map<string, { version: LoadedVersion; questions: ScoringQuestion[]; answerKeyHash: string }>();
  for (const version of exam.versions.filter((item) => usedIds.has(item.id))) {
    const questions = scoringQuestions(version, override);
    const label = version.id === current.id ? "Kilitli cevap anahtarı eksik." : `Sürüm ${version.versionNumber} cevap anahtarı eksik.`;
    if (!questions.length || questions.some((question) => !question.correctOption)) return { ok: false, error: label };
    // `odk_attempt_scores.total_net >= 0` DB kısıtı negatif toplamı saklayamaz. Negatif
    // nete izin veren politika bu kısıt kaldırılmadan (ürün kararı + migration)
    // uygulanamaz; sessizce kesmek yerine puanlama açıkça reddedilir (P0-1).
    if (!version.scoringPolicy.minimumNetIsZero) return { ok: false, error: "Bu puanlama politikası negatif nete izin veriyor; sonuç deposu henüz negatif toplam neti desteklemiyor. Politikayı gözden geçirin." };
    byVersion.set(version.id, { version, questions, answerKeyHash: answerKeyHashOf(questions) });
  }
  return { ok: true, byVersion, currentHash: byVersion.get(current.id)!.answerKeyHash };
}

export async function scoreOdkExam(examId: string, scoredById: string, options: { rescore?: boolean } = {}, db: ScoringDb = prisma) {
  const now = new Date();
  const exam = await loadScoringExam(db, examId);
  const plan = scoringPlan(exam, now);
  if (!plan.ok || !exam) return { ok: false as const, error: plan.ok ? "Deneme bulunamadı." : plan.error };

  await db.$transaction(async (tx) => {
    await tx.odkExamAttempt.updateMany({ where: { examId, status: "IN_PROGRESS", deadlineAt: { lte: now } }, data: { status: "AUTO_SUBMITTED", submittedAt: now } });
    for (const attempt of exam.attempts) {
      if (!options.rescore && attempt.score) continue;
      if (attempt.status === "IN_PROGRESS" && attempt.deadlineAt > now) continue;
      if (options.rescore && attempt.score) {
        await tx.odkAttemptQuestionResult.deleteMany({ where: { attemptId: attempt.id } });
        await tx.odkAttemptOutcomeScore.deleteMany({ where: { attemptId: attempt.id } });
        await tx.odkAttemptScore.delete({ where: { attemptId: attempt.id } });
      }
      const entry = plan.byVersion.get(attempt.versionId)!;
      const { result, questionResults, outcomeScores, activeDurationMs } = computeAttemptScore(entry.version, entry.questions, attempt);
      // Yayın durumu puanlamayla DEĞİŞMEZ (P0-9): yeniden puanlama önceki durumu korur;
      // yayından hariç tutulan (ör. bütünlük incelemesi) sonuç gizli kalır. Yeni puan gizli başlar.
      const publicationStatus = attempt.score?.publicationStatus ?? "HIDDEN";
      await tx.odkAttemptScore.create({
        data: {
          attemptId: attempt.id, correctCount: result.correctCount, wrongCount: result.wrongCount, blankCount: result.blankCount, totalNet: result.totalNet,
          sectionBreakdown: result.sectionScores,
          scoringVersion: ODK_SCORING_VERSION, answerKeyHash: entry.answerKeyHash, scoredById, publicationStatus, activeDurationMs,
          questionResults: { create: questionResults },
          outcomeScores: { create: outcomeScores },
        },
      });
    }
    if (exam.status !== "RELEASED") await tx.odkExam.update({ where: { id: examId }, data: { status: "SCORED" } });
  });
  const scoredCount = await db.odkAttemptScore.count({ where: { attempt: { examId } } });
  return { ok: true as const, scoredCount, answerKeyHash: plan.currentHash, family: getOdkExamFamilyCode(exam) };
}

export type RescorePreview = {
  attemptCount: number;
  scoredAttemptCount: number;
  changedQuestionIds: string[];
  cancelledQuestionIds: string[];
  restoredQuestionIds: string[];
  changedAttempts: Array<{ attemptId: string; studentUserId: string; published: boolean; netBefore: number; netAfter: number }>;
  publishedChangedCount: number;
  answerKeyHash: string;
};

/**
 * Yeniden puanlamanın KURU çalıştırması (P0-3): hiçbir şey yazmaz. Saklı soru
 * sonuçlarındaki anahtar ile güncel (ve varsa revizyon önizlemesi uygulanmış)
 * anahtarı karşılaştırır; her puanlanmış attempt'i yeniden hesaplayıp net
 * farkını döndürür.
 */
export async function previewOdkRescore(examId: string, override?: AnswerKeyOverride, db: ScoringDb = prisma, now = new Date()): Promise<{ ok: true; preview: RescorePreview } | { ok: false; error: string }> {
  const exam = await loadScoringExam(db, examId);
  const plan = scoringPlan(exam, now, override);
  if (!plan.ok || !exam) return { ok: false, error: plan.ok ? "Deneme bulunamadı." : plan.error };
  const scored = exam.attempts.filter((attempt) => attempt.score);
  // Anahtar farkı her attempt'in kendi sürümündeki soru kümesiyle (P1-8).
  const stored = new Map<string, OdkAnswerOption>();
  for (const attempt of scored) for (const row of attempt.score!.questionResults) stored.set(row.questionId, row.correctOption);
  const usedVersionIds = new Set(scored.map((attempt) => attempt.versionId));
  const currentKey: AnswerKeyEntry[] = [...plan.byVersion.entries()]
    .filter(([versionId]) => !scored.length || usedVersionIds.has(versionId))
    .flatMap(([, entry]) => entry.questions.map((question) => ({ questionId: question.id, correctOption: question.correctOption! })));
  const diff = diffAnswerKey(scored.length ? [...stored].map(([questionId, correctOption]) => ({ questionId, correctOption })) : currentKey, currentKey);
  const changedAttempts = scored.flatMap((attempt) => {
    const entry = plan.byVersion.get(attempt.versionId)!;
    const netBefore = Number(attempt.score!.totalNet);
    const netAfter = computeAttemptScore(entry.version, entry.questions, attempt).result.totalNet;
    return netBefore === netAfter ? [] : [{ attemptId: attempt.id, studentUserId: attempt.studentUserId, published: attempt.score!.publicationStatus === "PUBLISHED", netBefore, netAfter }];
  });
  return {
    ok: true,
    preview: {
      attemptCount: exam.attempts.length,
      scoredAttemptCount: scored.length,
      changedQuestionIds: diff.changed,
      cancelledQuestionIds: diff.removed,
      restoredQuestionIds: diff.added,
      changedAttempts,
      publishedChangedCount: changedAttempts.filter((row) => row.published).length,
      answerKeyHash: plan.currentHash,
    },
  };
}
