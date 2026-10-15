import "server-only";

import { NextResponse } from "next/server";
import type { PrismaClient, UserRole } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { afterResponse } from "@/lib/after-response";
import { afterEducationCommit, transactionalAudit } from "@/lib/panel/education-write";
import type { releaseCommitSchema, rescoreSchema } from "@/lib/odk/admin-schemas";
import { createCoachSuggestionsFromReleasedExam } from "@/lib/odk/coach-bridge";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import { previewRescoreImpact, previewResultPublication } from "@/lib/odk/result-publication";
import { previewOdkRescore, scoreOdkExam, type RescorePreview } from "@/lib/odk/scoring-service";
import { odkAttemptBand } from "@/lib/odk/telemetry";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

/**
 * DENEME PUANLAMA VE YAYIN KOMUTLARI (K03c) — web `/api/odk/admin/exams/[id]/
 * {score,rescore,release,release/preview}` ve mobil komut ucu AYNI kuralları
 * çağırır (rota gövdelerinden taşındı; yanıt biçimi aynı). `db` mobil
 * `runEducationMutation` transaction'ı olduğunda puan, yayın, koç önerileri,
 * audit ve makbuz birlikte yazılır; ürün olayları ve ürünler arası bildirim
 * commit sonrasıdır.
 */
type Db = PrismaClient;
type Actor = { userId: string; role: UserRole };
const RELEASE_CANDIDATE_STATUSES = ["SUBMITTED", "AUTO_SUBMITTED", "REVIEW_REQUIRED"] as const;

async function releaseCandidates(db: Db, id: string) {
  return db.odkExam.findUnique({
    where: { id },
    select: {
      family: true,
      examFamilyRef: { select: { code: true } },
      status: true,
      attempts: {
        where: { status: { in: [...RELEASE_CANDIDATE_STATUSES] } },
        select: { id: true, status: true, integrityLevel: true, student: { select: { fullName: true } }, score: { select: { attemptId: true } } },
      },
    },
  });
}

type CandidateExam = NonNullable<Awaited<ReturnType<typeof releaseCandidates>>>;
export function releasePreviewFor(attempts: CandidateExam["attempts"], excludeReviewRequired: boolean) {
  return previewResultPublication(
    attempts.map((attempt) => ({
      attemptId: attempt.id,
      studentLabel: attempt.student.fullName || "Öğrenci",
      hasScore: Boolean(attempt.score),
      scoringError: !attempt.score,
      integrityLevel: attempt.integrityLevel,
      reviewRequired: attempt.status === "REVIEW_REQUIRED" || attempt.integrityLevel !== "NORMAL",
    })),
    { excludeReviewRequired },
  );
}

export async function scoreOdkExamCommand(id: string, actor: Actor, db: Db = prisma) {
  const result = await scoreOdkExam(id, actor.userId, {}, db);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  await transactionalAudit(db)({ actorUserId: actor.userId, entityType: "OdkExam", entityId: id, action: "odk.exam_scored", summary: "Teslim edilen denemeler puanlandı", payload: { scoredCount: result.scoredCount, answerKeyHash: result.answerKeyHash } });
  await afterEducationCommit(db, () => recordPanelProductEvent({ name: "odk_exam_scored", properties: { family: result.family, attemptBand: odkAttemptBand(result.scoredCount) } }, actor.role));
  return NextResponse.json({ status: "SCORED", scoredCount: result.scoredCount });
}

export async function rescoreOdkExamCommand(id: string, input: z.output<typeof rescoreSchema> | null, actor: Actor, db: Db = prisma) {
  const exam = await db.odkExam.findUnique({
    where: { id },
    select: { status: true, resultsReleasedAt: true, currentVersionId: true },
  });
  if (!exam?.currentVersionId) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (!["ENDED", "SCORED", "RELEASED"].includes(exam.status)) {
    return NextResponse.json({ error: "Yeniden puanlama yalnız kapalı/puanlanmış/yayınlanmış denemelerde yapılabilir." }, { status: 409 });
  }
  // Gerçek etki (P0-3): saklı anahtar ↔ güncel anahtar farkı ve öğrenci başı net değişimi (kuru çalıştırma).
  const dryRun = await previewOdkRescore(id, undefined, db);
  if (!dryRun.ok) return NextResponse.json({ error: dryRun.error }, { status: 400 });
  const impact = rescoreImpactFrom(dryRun.preview, Boolean(exam.resultsReleasedAt) || exam.status === "RELEASED");
  if (impact.publishedResultsWillChange && !input?.confirmPublishedChange) {
    return NextResponse.json({ error: "Yayınlanmış sonuçlar değişecek. confirmPublishedChange=true ile onaylayın.", preview: { message: `${impact.changedAttemptCount} öğrencinin neti değişecek (${impact.publishedChangedCount} yayınlanmış).`, ...impact } }, { status: 409 });
  }
  // Önceki puanlar audit için saklanır (yeniden puanlama skor satırlarını yeniden yazar).
  const previousScores = await db.odkAttemptScore.findMany({ where: { attempt: { examId: id } }, select: { attemptId: true, totalNet: true, answerKeyHash: true, publicationStatus: true } });
  const result = await scoreOdkExam(id, actor.userId, { rescore: true }, db);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  // Yalnız yayınlanmış neti DEĞİŞEN öğrenci ve veli bilgilendirilir.
  const studentUserIds = [...new Set(dryRun.preview.changedAttempts.filter((row) => row.published).map((row) => row.studentUserId))];
  if (studentUserIds.length) {
    const version = new Date().toISOString();
    await afterEducationCommit(db, () => afterResponse("odk.exam_rescore.notification_failed", async () => {
      const { notifyOdkResultsUpdated } = await import("@/lib/odk/student-notifications");
      await notifyOdkResultsUpdated({ examId: id, studentUserIds, version });
    }, { examId: id }));
  }
  const pending = await db.odkAnswerKeyRevision.findMany({ where: { versionId: exam.currentVersionId, rescoreCompletedAt: null }, select: { id: true } });
  if (pending.length) {
    const completedAt = new Date();
    await db.odkAnswerKeyRevision.updateMany({ where: { id: { in: pending.map((row) => row.id) } }, data: { rescoreCompletedAt: completedAt } });
    await db.odkAnswerKeyRevision.updateMany({ where: { id: { in: pending.map((row) => row.id) }, rescoreRequestedAt: null }, data: { rescoreRequestedAt: completedAt } });
  }
  await transactionalAudit(db)({
    actorUserId: actor.userId,
    entityType: "OdkExam",
    entityId: id,
    action: "odk.exam_rescored",
    summary: "Deneme yeniden puanlandı",
    payload: {
      scoredCount: result.scoredCount,
      reason: input?.reason ?? null,
      answerKeyHash: result.answerKeyHash,
      changedQuestionIds: dryRun.preview.changedQuestionIds,
      cancelledQuestionIds: dryRun.preview.cancelledQuestionIds,
      changedAttemptCount: impact.changedAttemptCount,
      completedRevisionIds: pending.map((row) => row.id),
      previousScores: previousScores.map((row) => ({ attemptId: row.attemptId, totalNet: row.totalNet.toString(), answerKeyHash: row.answerKeyHash, publicationStatus: row.publicationStatus })),
    },
  });
  return NextResponse.json({ ok: true, scoredCount: result.scoredCount, impact });
}

/** Mevcut `impact` sözleşmesi (attemptCount, changedQuestions, publishedResultsWillChange) + ek alanlar. */
export function rescoreImpactFrom(preview: RescorePreview, hasPublishedResults: boolean) {
  const changedQuestionCount = preview.changedQuestionIds.length + preview.cancelledQuestionIds.length + preview.restoredQuestionIds.length;
  return {
    ...previewRescoreImpact({ attemptCount: preview.scoredAttemptCount, changedQuestionCount, hasPublishedResults }),
    publishedResultsWillChange: hasPublishedResults && preview.publishedChangedCount > 0,
    changedQuestionIds: preview.changedQuestionIds,
    cancelledQuestionIds: preview.cancelledQuestionIds,
    changedAttemptCount: preview.changedAttempts.length,
    publishedChangedCount: preview.publishedChangedCount,
  };
}

export async function previewOdkRelease(id: string, excludeReviewRequired: boolean, db: Db = prisma) {
  const exam = await releaseCandidates(db, id);
  if (!exam) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (exam.status !== "SCORED") return NextResponse.json({ error: "Yalnız puanlanmış deneme için yayın önizlemesi alınabilir." }, { status: 409 });
  const preview = releasePreviewFor(exam.attempts, excludeReviewRequired);
  return NextResponse.json({ message: `${preview.publishable} öğrencinin sonucu yayınlanacak.`, ...preview });
}

export async function releaseOdkExam(id: string, input: z.output<typeof releaseCommitSchema> | null, actor: Actor, db: Db = prisma) {
  const excludeReviewRequired = Boolean(input?.excludeReviewRequired);
  const createCoachSuggestions = input?.createCoachSuggestions !== false;
  const exam = await releaseCandidates(db, id);
  if (!exam || exam.status !== "SCORED") return NextResponse.json({ error: "Yalnız puanlanmış bir denemenin sonucu açıklanabilir." }, { status: 409 });
  const preview = releasePreviewFor(exam.attempts, excludeReviewRequired);
  if (!preview.canPublish && !excludeReviewRequired) return NextResponse.json({ error: preview.warnings.join(" ") || "Yayınlanacak sonuç yok.", preview }, { status: 409 });
  if (preview.publishable <= 0) return NextResponse.json({ error: "Yayınlanacak puanlanmış sonuç yok.", preview }, { status: 409 });

  const now = new Date();
  const publishAttemptIds = exam.attempts.filter((attempt) => attempt.score && !preview.excludedAttemptIds.includes(attempt.id)).map((attempt) => attempt.id);
  await db.$transaction([
    db.odkExam.update({ where: { id }, data: { status: "RELEASED", resultsReleasedAt: now, answerKeyReleasedAt: now } }),
    db.odkAttemptScore.updateMany({ where: { attemptId: { in: publishAttemptIds } }, data: { publicationStatus: "PUBLISHED" } }),
  ]);
  const coach = createCoachSuggestions ? await createCoachSuggestionsFromReleasedExam(id, now, db) : { created: 0, attemptCount: 0 };
  const publishedStudents = await db.odkExamAttempt.findMany({ where: { id: { in: publishAttemptIds } }, select: { student: { select: { studentProfile: { select: { id: true } } } } } });
  const studentIds = [...new Set(publishedStudents.map((row) => row.student.studentProfile?.id).filter((sid): sid is string => Boolean(sid)))];
  await transactionalAudit(db)({
    actorUserId: actor.userId,
    entityType: "OdkExam",
    entityId: id,
    action: "odk.exam_results_released",
    summary: "Deneme sonuçları öğrencilere açıklandı",
    payload: { attemptCount: publishAttemptIds.length, excluded: preview.excludedAttemptIds.length, coachSuggestions: coach.created },
  });
  await afterEducationCommit(db, async () => {
    if (studentIds.length) {
      const { onMockExamResultPublished } = await import("@/lib/student-success/server/emit-hooks");
      afterResponse("odk.exam_release.cross_product_emit_failed", () => onMockExamResultPublished({ examId: id, actorUserId: actor.userId, studentIds, attemptCount: publishAttemptIds.length }), { examId: id });
    }
    await recordPanelProductEvent({ name: "odk_results_released", properties: { family: getOdkExamFamilyCode(exam), attemptBand: odkAttemptBand(publishAttemptIds.length) } }, actor.role);
  });
  return NextResponse.json({ status: "RELEASED", resultsReleasedAt: now, published: publishAttemptIds.length, excluded: preview.excludedAttemptIds.length, coach });
}
