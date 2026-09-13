import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { rescoreSchema } from "@/lib/odk/admin-schemas";
import { previewRescoreImpact } from "@/lib/odk/result-publication";
import { scoreOdkExam } from "@/lib/odk/scoring-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.rescore", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:rescore:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = rescoreSchema.safeParse(await request.json().catch(() => ({})));
  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: {
      status: true,
      resultsReleasedAt: true,
      currentVersionId: true,
      attempts: { where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "REVIEW_REQUIRED"] } }, select: { id: true } },
    },
  });
  if (!exam?.currentVersionId) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (!["ENDED", "SCORED", "RELEASED"].includes(exam.status)) {
    return NextResponse.json({ error: "Yeniden puanlama yalnız kapalı/puanlanmış/yayınlanmış denemelerde yapılabilir." }, { status: 409 });
  }

  const impact = previewRescoreImpact({
    attemptCount: exam.attempts.length,
    changedQuestionCount: 1,
    hasPublishedResults: Boolean(exam.resultsReleasedAt) || exam.status === "RELEASED",
  });
  if (impact.publishedResultsWillChange && !(parsed.success && parsed.data.confirmPublishedChange)) {
    return NextResponse.json({
      error: "Yayınlanmış sonuçlar değişecek. confirmPublishedChange=true ile onaylayın.",
      preview: {
        message: `${impact.attemptCount} öğrenci yeniden puanlanacak.`,
        ...impact,
      },
    }, { status: 409 });
  }

  const result = await scoreOdkExam(id, auth.session.userId, { rescore: true });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  if (exam.currentVersionId) {
    const last = await prisma.odkAnswerKeyRevision.findFirst({ where: { versionId: exam.currentVersionId }, orderBy: { revisionNumber: "desc" } });
    if (last && !last.rescoreCompletedAt) {
      await prisma.odkAnswerKeyRevision.update({ where: { id: last.id }, data: { rescoreRequestedAt: new Date(), rescoreCompletedAt: new Date() } });
    }
  }

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "OdkExam",
    entityId: id,
    action: "odk.exam_rescored",
    summary: "Deneme yeniden puanlandı",
    payload: { scoredCount: result.scoredCount, reason: parsed.success ? parsed.data.reason : null },
  });
  return NextResponse.json({ ok: true, scoredCount: result.scoredCount, impact });
}
