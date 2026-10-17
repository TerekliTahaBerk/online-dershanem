import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma, type PrismaClient, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transactionalAudit } from "@/lib/panel/education-write";
import { bookletAnswerRemap, bookletCodesOf, changedBookletCodes, validateBookletOrders, type BookletOrder, type BookletOrderInput } from "@/lib/odk/booklets";
import { rescoreOdkExamCommand } from "@/lib/odk/exam-results-commands";

/**
 * Çoklu kitapçık sıra tablosu (B–E) — yalnız taslak sürümde yazılır. Önizleme
 * doğrular ve güncel tablonun hash'ini döner; kayıt aynı hash'le ve aynı
 * transaction'da tabloyu atomik olarak değiştirir (boş liste = tek kitapçık).
 */
type Db = PrismaClient;

export async function loadBookletSetup(db: Pick<Db, "odkExam">, examId: string) {
  const exam = await db.odkExam.findUnique({
    where: { id: examId },
    select: {
      status: true,
      currentVersion: {
        select: {
          id: true,
          status: true,
          sections: { orderBy: { position: "asc" }, select: { id: true, code: true, title: true, questions: { where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, questionNumber: true } } } },
          bookletOrders: { select: { bookletCode: true, questionId: true, sectionId: true, bookletQuestionNumber: true, bookletPage: true } },
        },
      },
    },
  });
  if (!exam?.currentVersion) return null;
  const version = exam.currentVersion;
  const questions = version.sections.flatMap((section) => section.questions.map((question) => ({ id: question.id, sectionId: section.id, sectionCode: section.code, questionNumber: question.questionNumber })));
  return { exam, version, questions, orders: version.bookletOrders, codes: bookletCodesOf(version.bookletOrders) };
}

export function bookletOrdersHash(orders: ReadonlyArray<{ bookletCode: string; questionId: string; bookletQuestionNumber: number; bookletPage: number | null }>) {
  const rows = [...orders].map((row) => [row.bookletCode, row.questionId, row.bookletQuestionNumber, row.bookletPage]).sort((a, b) => String(a).localeCompare(String(b)));
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function summary(orders: ReadonlyArray<{ bookletCode: string }>) {
  return bookletCodesOf(orders).map((code) => ({ code, questionCount: orders.filter((row) => row.bookletCode === code).length }));
}

export async function previewBookletOrders(examId: string, rows: BookletOrderInput[], db: Db = prisma) {
  const setup = await loadBookletSetup(db, examId);
  if (!setup) return NextResponse.json({ error: "Denemeyi bulamadık." }, { status: 404 });
  const result = validateBookletOrders(setup.questions, rows);
  return NextResponse.json({ ok: result.issues.length === 0, issues: result.issues, booklets: summary(result.orders), currentHash: bookletOrdersHash(setup.orders) });
}

class BookletStaleError extends Error {}
class BookletInProgressError extends Error {}

export async function replaceBookletOrders(examId: string, input: { rows: BookletOrderInput[]; expectedHash: string }, actorId: string, db: Db = prisma) {
  const setup = await loadBookletSetup(db, examId);
  if (!setup) return NextResponse.json({ error: "Denemeyi bulamadık." }, { status: 404 });
  if (setup.exam.status !== "DRAFT" || setup.version.status !== "DRAFT") return NextResponse.json({ error: "Kitapçık sırası yalnız taslak sürümde değiştirilebilir." }, { status: 409 });
  const result = validateBookletOrders(setup.questions, input.rows);
  if (result.issues.length) return NextResponse.json({ error: result.issues[0].message, issues: result.issues }, { status: 400 });
  const versionId = setup.version.id;
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM odk_exam_versions WHERE id = ${versionId} FOR UPDATE`;
      const current = await tx.odkBookletQuestionOrder.findMany({ where: { versionId }, select: { bookletCode: true, questionId: true, bookletQuestionNumber: true, bookletPage: true } });
      if (bookletOrdersHash(current) !== input.expectedHash) throw new BookletStaleError();
      await tx.odkBookletQuestionOrder.deleteMany({ where: { versionId } });
      if (result.orders.length) await tx.odkBookletQuestionOrder.createMany({ data: result.orders.map((row) => ({ ...row, versionId })) });
    });
  } catch (error) {
    if (error instanceof BookletStaleError) return NextResponse.json({ error: "Önizlemeden sonra kitapçık sırası değişti. Yeniden önizleyin.", code: "BOOKLET_STALE" }, { status: 409 });
    throw error;
  }
  await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkExam", entityId: examId, action: "odk.booklet_orders_updated", summary: `Kitapçık sırası güncellendi (${bookletCodesOf(result.orders).join(", ")})`, payload: { booklets: summary(result.orders) } });
  return NextResponse.json({ ok: true, booklets: summary(result.orders), currentHash: bookletOrdersHash(result.orders) });
}

/*
 * KİTAPÇIK SIRASI DÜZELTMESİ (taslak sonrası). Yanlış eşlenmiş B–E sırası
 * kilitli/canlı/bitmiş denemede düzeltilebilir:
 *   - kitapçık kümesi değişmez (kitapçık eklenip çıkarılamaz);
 *   - değişen kitapçıkta süren deneme varsa reddedilir (açık çözücünün yerel
 *     cevapları eski eşlemeye göredir);
 *   - o kitapçıktaki her denemenin cevapları ve soru süreleri kitapçık konumuna
 *     göre doğru kanonik soruya taşınır (tek transaction);
 *   - önceki ve yeni sıra audit kaydında saklanır (taşıma bu ikisinden yeniden
 *     üretilebilir, geri alınabilir);
 *   - puanlanmış denemede ardından yeniden puanlanır; yayınlanmış sonuç
 *     etkileniyorsa önceden açık onay gerekir.
 */
type Actor = { userId: string; role: UserRole };
type CorrectionPlan = { versionId: string; examStatus: string; released: boolean; previous: BookletOrder[]; next: BookletOrder[]; changed: string[]; remaps: Map<string, Map<string, string>> };

async function planCorrection(db: Db, examId: string, rows: BookletOrderInput[]) {
  const setup = await loadBookletSetup(db, examId);
  if (!setup) return { ok: false as const, response: NextResponse.json({ error: "Denemeyi bulamadık." }, { status: 404 }) };
  if (setup.version.status === "DRAFT") return { ok: false as const, response: NextResponse.json({ error: "Taslak sürümde kitapçık sırası doğrudan kaydedilir.", code: "USE_DRAFT_EDIT" }, { status: 409 }) };
  if (setup.exam.status === "ARCHIVED") return { ok: false as const, response: NextResponse.json({ error: "Arşivlenmiş deneme düzeltilemez." }, { status: 409 }) };
  const result = validateBookletOrders(setup.questions, rows);
  const nextCodes = bookletCodesOf(result.orders);
  const issues = [...result.issues];
  if (!result.issues.length && nextCodes.join() !== setup.codes.join()) {
    issues.push({ code: "BOOKLET_SET_LOCKED", message: `Kilitli denemede kitapçık eklenemez ya da çıkarılamaz (mevcut: ${setup.codes.join(", ")}).` });
  }
  const previous = setup.orders as BookletOrder[];
  const changed = issues.length ? [] : changedBookletCodes(previous, result.orders);
  const remaps = new Map(changed.map((code) => [code, bookletAnswerRemap(previous, result.orders, code)]));
  const plan: CorrectionPlan = { versionId: setup.version.id, examStatus: setup.exam.status, released: setup.exam.status === "RELEASED", previous, next: result.orders, changed, remaps };
  return { ok: true as const, setup, issues, plan };
}

async function correctionImpact(db: Db | Prisma.TransactionClient, examId: string, plan: CorrectionPlan) {
  const moving = [...plan.remaps].filter(([, remap]) => remap.size).map(([code]) => code);
  const [inProgress, attempts] = await Promise.all([
    db.odkExamAttempt.count({ where: { examId, versionId: plan.versionId, bookletCode: { in: plan.changed }, status: "IN_PROGRESS", deadlineAt: { gt: new Date() } } }),
    moving.length
      ? db.odkExamAttempt.findMany({ where: { examId, versionId: plan.versionId, bookletCode: { in: moving }, status: { not: "VOID" } }, select: { id: true, bookletCode: true, score: { select: { publicationStatus: true } }, answers: { select: { questionId: true } } } })
      : Promise.resolve([]),
  ]);
  const affected = attempts
    .map((attempt) => ({ attempt, moved: attempt.answers.filter((answer) => plan.remaps.get(attempt.bookletCode)?.has(answer.questionId)).length }))
    .filter((row) => row.moved > 0);
  const scored = ["SCORED", "RELEASED"].includes(plan.examStatus);
  return {
    inProgress,
    affectedAttemptIds: affected.map((row) => row.attempt.id),
    affectedAttemptCount: affected.length,
    movedAnswerCount: affected.reduce((sum, row) => sum + row.moved, 0),
    requiresRescore: scored && affected.length > 0,
    publishedResultsMayChange: affected.some((row) => row.attempt.score?.publicationStatus === "PUBLISHED") || (plan.released && affected.length > 0),
  };
}

export async function previewBookletCorrection(examId: string, rows: BookletOrderInput[], db: Db = prisma) {
  const planned = await planCorrection(db, examId, rows);
  if (!planned.ok) return planned.response;
  const { plan, issues, setup } = planned;
  const impact = issues.length ? null : await correctionImpact(db, examId, plan);
  if (impact?.inProgress) issues.push({ code: "BOOKLET_ATTEMPTS_IN_PROGRESS", message: `Değişen kitapçıkta ${impact.inProgress} öğrenci şu an çözüyor; denemeleri bitince düzeltin.` });
  if (!issues.length && !plan.changed.length) issues.push({ code: "NO_CHANGE", message: "Kitapçık sırası zaten böyle." });
  return NextResponse.json({
    ok: issues.length === 0,
    issues,
    changedBooklets: plan.changed,
    booklets: summary(plan.next),
    impact: impact ? { affectedAttemptCount: impact.affectedAttemptCount, movedAnswerCount: impact.movedAnswerCount, requiresRescore: impact.requiresRescore, publishedResultsMayChange: impact.publishedResultsMayChange } : null,
    currentHash: bookletOrdersHash(setup.orders),
  });
}

export async function commitBookletCorrection(examId: string, input: { rows: BookletOrderInput[]; expectedHash: string; reason: string; confirmPublishedChange?: boolean }, actor: Actor, db: Db = prisma) {
  const planned = await planCorrection(db, examId, input.rows);
  if (!planned.ok) return planned.response;
  const { plan, issues } = planned;
  if (issues.length) return NextResponse.json({ error: issues[0].message, code: issues[0].code, issues }, { status: 400 });
  if (!plan.changed.length) return NextResponse.json({ error: "Kitapçık sırası zaten böyle.", code: "NO_CHANGE" }, { status: 400 });
  const before = await correctionImpact(db, examId, plan);
  if (before.publishedResultsMayChange && !input.confirmPublishedChange) {
    return NextResponse.json({ error: "Yayınlanmış sonuçlar değişebilir. confirmPublishedChange=true ile onaylayın.", code: "CONFIRMATION_REQUIRED" }, { status: 409 });
  }
  let applied: Awaited<ReturnType<typeof correctionImpact>>;
  try {
    applied = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM odk_exam_versions WHERE id = ${plan.versionId} FOR UPDATE`;
      // Başlatma ile aynı kilit: düzeltme sırasında bu denemede yeni kitapçık ataması/başlatma beklenir.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`odk-booklet:${examId}`}, 0))::text`;
      const current = await tx.odkBookletQuestionOrder.findMany({ where: { versionId: plan.versionId }, select: { bookletCode: true, questionId: true, bookletQuestionNumber: true, bookletPage: true } });
      if (bookletOrdersHash(current) !== input.expectedHash) throw new BookletStaleError();
      const impact = await correctionImpact(tx, examId, plan);
      if (impact.inProgress) throw new BookletInProgressError();
      await tx.odkBookletQuestionOrder.deleteMany({ where: { versionId: plan.versionId, bookletCode: { in: plan.changed } } });
      await tx.odkBookletQuestionOrder.createMany({ data: plan.next.filter((row) => plan.changed.includes(row.bookletCode)).map((row) => ({ ...row, versionId: plan.versionId })) });
      for (const attemptId of impact.affectedAttemptIds) {
        const attempt = await tx.odkExamAttempt.findUniqueOrThrow({ where: { id: attemptId }, select: {
            bookletCode: true,
            answers: { select: { attemptId: true, questionId: true, selectedOption: true, isMarked: true, revision: true, changedCount: true, answeredAt: true, firstAnsweredAt: true, lastChangedAt: true } },
            timings: { select: { id: true, attemptId: true, questionId: true, visitCount: true, activeDurationMs: true, firstEnteredAt: true, lastLeftAt: true } },
          },
        });
        const remap = plan.remaps.get(attempt.bookletCode)!;
        const move = (questionId: string) => remap.get(questionId) ?? questionId;
        // Birincil anahtar (attempt, soru) olduğundan sil + yeniden yaz: permütasyon çakışmasız uygulanır.
        await tx.odkAttemptAnswer.deleteMany({ where: { attemptId } });
        if (attempt.answers.length) await tx.odkAttemptAnswer.createMany({ data: attempt.answers.map((answer) => ({ ...answer, questionId: move(answer.questionId) })) });
        await tx.odkAttemptQuestionTiming.deleteMany({ where: { attemptId } });
        if (attempt.timings.length) await tx.odkAttemptQuestionTiming.createMany({ data: attempt.timings.map((timing) => ({ ...timing, questionId: move(timing.questionId) })) });
      }
      return impact;
    }, { timeout: 120_000 });
  } catch (error) {
    if (error instanceof BookletStaleError) return NextResponse.json({ error: "Önizlemeden sonra kitapçık sırası değişti. Yeniden önizleyin.", code: "BOOKLET_STALE" }, { status: 409 });
    if (error instanceof BookletInProgressError) return NextResponse.json({ error: "Değişen kitapçıkta süren deneme var; denemeler bitince düzeltin.", code: "BOOKLET_ATTEMPTS_IN_PROGRESS" }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2028", "P2034"].includes(error.code)) return NextResponse.json({ error: "Aynı anda başka bir düzeltme yapılıyor. Yeniden önizleyin.", code: "BOOKLET_STALE" }, { status: 409 });
    throw error;
  }
  const changedRows = (rows: BookletOrder[]) => rows.filter((row) => plan.changed.includes(row.bookletCode)).map(({ bookletCode, questionId, sectionId, bookletQuestionNumber, bookletPage }) => ({ bookletCode, questionId, sectionId, bookletQuestionNumber, bookletPage }));
  await transactionalAudit(db)({
    actorUserId: actor.userId,
    entityType: "OdkExam",
    entityId: examId,
    action: "odk.booklet_orders_corrected",
    summary: `Kitapçık sırası düzeltildi (${plan.changed.join(", ")}; ${applied.affectedAttemptCount} deneme, ${applied.movedAnswerCount} cevap taşındı)`,
    payload: { reason: input.reason, changedBooklets: plan.changed, previousOrders: changedRows(plan.previous), nextOrders: changedRows(plan.next), affectedAttemptIds: applied.affectedAttemptIds, movedAnswerCount: applied.movedAnswerCount },
  });
  if (!applied.requiresRescore) return NextResponse.json({ ok: true, changedBooklets: plan.changed, affectedAttemptCount: applied.affectedAttemptCount, movedAnswerCount: applied.movedAnswerCount, rescored: false });
  const rescore = await rescoreOdkExamCommand(examId, { confirmPublishedChange: Boolean(input.confirmPublishedChange), reason: `Kitapçık sırası düzeltmesi: ${input.reason}`.slice(0, 500) }, actor, db);
  const rescoreBody = await rescore.json().catch(() => ({}));
  return NextResponse.json({ ok: true, changedBooklets: plan.changed, affectedAttemptCount: applied.affectedAttemptCount, movedAnswerCount: applied.movedAnswerCount, rescored: rescore.ok, rescore: rescoreBody }, { status: rescore.ok ? 200 : 202 });
}
