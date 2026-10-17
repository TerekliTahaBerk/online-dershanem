import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma, type PrismaClient, type UserRole } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { transactionalAudit } from "@/lib/panel/education-write";
import type { answerKeyRevisionCommitSchema, answerKeyRevisionPreviewSchema } from "@/lib/odk/admin-schemas";
import { planAnswerKeyRevision, type AnswerKeyChange } from "@/lib/odk/answer-key-revision";
import { rescoreImpactFrom, rescoreOdkExamCommand } from "@/lib/odk/exam-results-commands";
import { previewOdkRescore } from "@/lib/odk/scoring-service";

/**
 * CEVAP ANAHTARI REVİZYONU (P0-2). Kilitli denemede anahtar doğrudan
 * yazılmaz; bu akış:
 *   1. önizleme  — değişiklikleri doğrular, öğrenci başı net farkını kuru
 *                  çalıştırmayla hesaplar, güncel anahtar hash'ini döner;
 *   2. commit    — hash hâlâ aynıysa (arada başka revizyon yoksa) revizyon
 *                  kaydını ve soru güncellemesini TEK transaction'da yazar;
 *                  deneme puanlanmışsa ardından yeniden puanlar (yayınlanmış
 *                  sonuç değişiyorsa açık onay gerekir) ve neti değişen
 *                  öğrenciyi bilgilendirir.
 * Önceki cevaplar revizyon kaydında, önceki puanlar rescore audit'inde saklanır.
 */
type Db = PrismaClient;
type Actor = { userId: string; role: UserRole };

async function loadRevisionTarget(db: Db, examId: string) {
  return db.odkExam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      status: true,
      resultsReleasedAt: true,
      currentVersion: {
        select: {
          id: true,
          status: true,
          sections: { orderBy: { position: "asc" }, select: { code: true, questions: { orderBy: { position: "asc" }, select: { id: true, questionNumber: true, correctOption: true, isActive: true } } } },
        },
      },
    },
  });
}

type RevisionTarget = NonNullable<Awaited<ReturnType<typeof loadRevisionTarget>>>;

function revisionQuestions(target: RevisionTarget) {
  return target.currentVersion!.sections.flatMap((section) => section.questions.map((question) => ({ ...question, sectionCode: section.code })));
}

/** Güncel anahtarın (iptaller dahil) hash'i: eşzamanlı revizyonları yakalar. */
export function revisionStateHash(target: RevisionTarget) {
  return createHash("sha256").update(JSON.stringify(revisionQuestions(target).map((question) => [question.id, question.isActive ? question.correctOption : "CANCELLED"]))).digest("hex");
}

async function planFor(db: Db, examId: string, changes: AnswerKeyChange[]) {
  const target = await loadRevisionTarget(db, examId);
  if (!target?.currentVersion) return { ok: false as const, response: NextResponse.json({ error: "Denemeyi bulamadık." }, { status: 404 }) };
  const plan = planAnswerKeyRevision({ examStatus: target.status, questions: revisionQuestions(target), changes });
  if (!plan.ok) return { ok: false as const, response: NextResponse.json({ error: plan.issues[0].message, code: plan.issues[0].code, issues: plan.issues }, { status: plan.issues[0].code === "REVISION_NOT_ALLOWED" ? 409 : 400 }) };
  return { ok: true as const, target, plan };
}

async function impactFor(db: Db, target: RevisionTarget, plan: Extract<ReturnType<typeof planAnswerKeyRevision>, { ok: true }>) {
  // Henüz puanlanmamış (LIVE / ENDED) denemede öğrenci neti yoktur; etki yalnız soru düzeyindedir.
  if (!["SCORED", "RELEASED"].includes(target.status)) return null;
  const dryRun = await previewOdkRescore(target.id, plan.override, db);
  if (!dryRun.ok) return null;
  return { ...rescoreImpactFrom(dryRun.preview, Boolean(target.resultsReleasedAt) || target.status === "RELEASED"), changedAttempts: dryRun.preview.changedAttempts.map(({ attemptId, published, netBefore, netAfter }) => ({ attemptId, published, netBefore, netAfter })) };
}

export async function previewAnswerKeyRevision(examId: string, input: z.output<typeof answerKeyRevisionPreviewSchema>, db: Db = prisma): Promise<NextResponse> {
  const planned = await planFor(db, examId, input.changes);
  if (!planned.ok) return planned.response;
  const { target, plan } = planned;
  const impact = await impactFor(db, target, plan);
  return NextResponse.json({
    answerKeyHash: revisionStateHash(target),
    cancelledQuestionPolicy: plan.cancelledQuestionPolicy,
    previousAnswers: plan.previousAnswers,
    nextAnswers: plan.nextAnswers,
    requiresRescore: Boolean(impact),
    impact,
  });
}

export async function commitAnswerKeyRevision(examId: string, input: z.output<typeof answerKeyRevisionCommitSchema>, actor: Actor, db: Db = prisma): Promise<NextResponse> {
  const planned = await planFor(db, examId, input.changes);
  if (!planned.ok) return planned.response;
  const { target, plan } = planned;
  if (revisionStateHash(target) !== input.expectedAnswerKeyHash) {
    return NextResponse.json({ error: "Önizlemeden sonra cevap anahtarı değişti. Yeniden önizleyin.", code: "REVISION_STALE" }, { status: 409 });
  }
  const impact = await impactFor(db, target, plan);
  if (impact?.publishedResultsWillChange && !input.confirmPublishedChange) {
    return NextResponse.json({ error: "Yayınlanmış sonuçlar değişecek. confirmPublishedChange=true ile onaylayın.", code: "CONFIRMATION_REQUIRED", impact }, { status: 409 });
  }
  const versionId = target.currentVersion!.id;
  const now = new Date();
  let revisionId: string;
  try {
    revisionId = await db.$transaction(async (tx) => {
      // Aynı transaction'da yeniden doğrula: eşzamanlı revizyon hash'i değiştirmişse yazma.
      const fresh = await loadRevisionTarget(tx as unknown as Db, examId);
      if (!fresh?.currentVersion || fresh.currentVersion.id !== versionId || revisionStateHash(fresh) !== input.expectedAnswerKeyHash) throw new RevisionStaleError();
      const last = await tx.odkAnswerKeyRevision.findFirst({ where: { versionId }, orderBy: { revisionNumber: "desc" }, select: { revisionNumber: true } });
      const revision = await tx.odkAnswerKeyRevision.create({
        data: {
          versionId,
          revisionNumber: (last?.revisionNumber ?? 0) + 1,
          reason: input.reason,
          previousAnswers: plan.previousAnswers as Prisma.InputJsonValue,
          nextAnswers: plan.nextAnswers as Prisma.InputJsonValue,
          changedById: actor.userId,
          rescoreRequestedAt: impact ? now : null,
        },
        select: { id: true, revisionNumber: true },
      });
      for (const [questionId, change] of plan.override) {
        const updated = await tx.odkExamQuestion.updateMany({
          where: { id: questionId, isActive: true, section: { versionId } },
          data: "cancelled" in change ? { isActive: false } : { correctOption: change.correctOption },
        });
        if (updated.count !== 1) throw new RevisionStaleError();
      }
      return revision.id;
    }, { timeout: 15_000 });
  } catch (error) {
    // P2002: aynı revizyon numarası (yarış); P2028/P2034: kilit beklerken zaman aşımı / serileştirme çatışması.
    if (error instanceof RevisionStaleError || (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2028", "P2034"].includes(error.code))) {
      return NextResponse.json({ error: "Aynı anda başka bir revizyon yazıldı. Yeniden önizleyin.", code: "REVISION_STALE" }, { status: 409 });
    }
    throw error;
  }
  await transactionalAudit(db)({
    actorUserId: actor.userId,
    entityType: "OdkExam",
    entityId: examId,
    action: "odk.answer_key_revised",
    summary: `Cevap anahtarı revize edildi (${plan.override.size} soru)`,
    payload: { revisionId, reason: input.reason, previousAnswers: plan.previousAnswers, nextAnswers: plan.nextAnswers, cancelledQuestionPolicy: plan.cancelledQuestionPolicy, impact: impact ? { changedAttemptCount: impact.changedAttemptCount, publishedChangedCount: impact.publishedChangedCount } : null },
  });
  if (!impact) return NextResponse.json({ ok: true, revisionId, rescored: false }, { status: 201 });
  // Puanlanmış denemede yeniden puanlama aynı akışta: bildirim + önceki puan anlık görüntüsü rescore komutunda.
  const rescore = await rescoreOdkExamCommand(examId, { confirmPublishedChange: input.confirmPublishedChange, reason: `Anahtar revizyonu: ${input.reason}`.slice(0, 500) }, actor, db);
  const rescoreBody = await rescore.json().catch(() => ({}));
  return NextResponse.json({ ok: true, revisionId, rescored: rescore.ok, rescore: rescoreBody }, { status: rescore.ok ? 201 : 202 });
}

class RevisionStaleError extends Error {}

/**
 * Revizyon paneli verisi (yalnız `odk:key:revise` sahibine çizilir): güncel
 * sürümün tüm soruları (iptaller dahil) ve revizyon geçmişi.
 */
export async function loadAnswerKeyRevisionPanel(examId: string, db: Db = prisma) {
  const exam = await db.odkExam.findUnique({
    where: { id: examId },
    select: {
      status: true,
      currentVersion: {
        select: {
          id: true,
          sections: { orderBy: { position: "asc" }, select: { code: true, title: true, questions: { orderBy: { position: "asc" }, select: { id: true, questionNumber: true, correctOption: true, isActive: true } } } },
          answerKeyRevisions: {
            orderBy: { revisionNumber: "desc" },
            take: 50,
            select: { id: true, revisionNumber: true, reason: true, previousAnswers: true, nextAnswers: true, createdAt: true, rescoreRequestedAt: true, rescoreCompletedAt: true, changedBy: { select: { fullName: true, email: true } } },
          },
        },
      },
    },
  });
  if (!exam?.currentVersion) return null;
  const questions = exam.currentVersion.sections.flatMap((section) =>
    section.questions.map((question) => ({ id: question.id, sectionCode: section.code, sectionTitle: section.title, questionNumber: question.questionNumber, correctOption: question.correctOption, isActive: question.isActive })),
  );
  const labelById = new Map(questions.map((question) => [question.id, `${question.sectionCode} ${question.questionNumber}`]));
  const asRecord = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, string | null>) : {});
  return {
    status: exam.status,
    questions,
    revisions: exam.currentVersion.answerKeyRevisions.map((revision) => {
      const previous = asRecord(revision.previousAnswers);
      const next = asRecord(revision.nextAnswers);
      return {
        id: revision.id,
        revisionNumber: revision.revisionNumber,
        reason: revision.reason,
        actor: revision.changedBy.fullName || revision.changedBy.email,
        createdAt: revision.createdAt.toISOString(),
        rescore: revision.rescoreCompletedAt ? "COMPLETED" as const : revision.rescoreRequestedAt ? "PENDING" as const : "NOT_NEEDED" as const,
        changes: Object.keys(next).map((questionId) => ({ label: labelById.get(questionId) ?? questionId, previous: previous[questionId] ?? null, next: next[questionId] ?? null })),
      };
    }),
  };
}
