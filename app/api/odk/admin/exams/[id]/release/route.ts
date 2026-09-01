import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { releaseCommitSchema } from "@/lib/odk/admin-schemas";
import { previewResultPublication } from "@/lib/odk/result-publication";
import { createCoachSuggestionsFromReleasedExam } from "@/lib/odk/coach-bridge";
import { odkAttemptBand } from "@/lib/odk/telemetry";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.release", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:release:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = releaseCommitSchema.safeParse(await request.json().catch(() => ({})));
  const excludeReviewRequired = parsed.success ? Boolean(parsed.data.excludeReviewRequired) : false;
  const createCoachSuggestions = parsed.success ? parsed.data.createCoachSuggestions !== false : true;

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: {
      family: true,
      status: true,
      attempts: {
        where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "REVIEW_REQUIRED"] } },
        select: {
          id: true,
          status: true,
          integrityLevel: true,
          student: { select: { fullName: true } },
          score: { select: { attemptId: true } },
        },
      },
    },
  });
  if (!exam || exam.status !== "SCORED") return NextResponse.json({ error: "Yalnız puanlanmış bir denemenin sonucu açıklanabilir." }, { status: 409 });

  const preview = previewResultPublication(
    exam.attempts.map((attempt) => ({
      attemptId: attempt.id,
      studentLabel: attempt.student.fullName || "Öğrenci",
      hasScore: Boolean(attempt.score),
      scoringError: !attempt.score,
      integrityLevel: attempt.integrityLevel,
      reviewRequired: attempt.status === "REVIEW_REQUIRED" || attempt.integrityLevel !== "NORMAL",
    })),
    { excludeReviewRequired },
  );
  if (!preview.canPublish && !excludeReviewRequired) {
    return NextResponse.json({ error: preview.warnings.join(" ") || "Yayınlanacak sonuç yok.", preview }, { status: 409 });
  }
  if (preview.publishable <= 0) {
    return NextResponse.json({ error: "Yayınlanacak puanlanmış sonuç yok.", preview }, { status: 409 });
  }

  const now = new Date();
  const publishAttemptIds = exam.attempts
    .filter((attempt) => attempt.score && !preview.excludedAttemptIds.includes(attempt.id))
    .map((attempt) => attempt.id);

  await prisma.$transaction([
    prisma.odkExam.update({ where: { id }, data: { status: "RELEASED", resultsReleasedAt: now, answerKeyReleasedAt: now } }),
    prisma.odkAttemptScore.updateMany({
      where: { attemptId: { in: publishAttemptIds } },
      data: { publicationStatus: "PUBLISHED" },
    }),
  ]);

  let coach = { created: 0, attemptCount: 0 };
  if (createCoachSuggestions) {
    coach = await createCoachSuggestionsFromReleasedExam(id, now);
  }

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "OdkExam",
    entityId: id,
    action: "odk.exam_results_released",
    summary: "Deneme sonuçları öğrencilere açıklandı",
    payload: { attemptCount: publishAttemptIds.length, excluded: preview.excludedAttemptIds.length, coachSuggestions: coach.created },
  });
  await recordPanelProductEvent({ name: "odk_results_released", properties: { family: exam.family, attemptBand: odkAttemptBand(publishAttemptIds.length) } }, "ADMIN");
  return NextResponse.json({ status: "RELEASED", resultsReleasedAt: now, published: publishAttemptIds.length, excluded: preview.excludedAttemptIds.length, coach });
}
