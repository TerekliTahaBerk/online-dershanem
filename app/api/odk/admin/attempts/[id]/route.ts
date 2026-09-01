import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { integrityReviewSchema } from "@/lib/odk/admin-schemas";
import { assessIntegrity } from "@/lib/odk/integrity";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const attempt = await prisma.odkExamAttempt.findUnique({
    where: { id },
    select: {
      id: true,
      examId: true,
      status: true,
      integrityLevel: true,
      integrityReviewedAt: true,
      startedAt: true,
      submittedAt: true,
      deadlineAt: true,
      bookletCode: true,
      ipHash: true,
      clientMeta: true,
      student: { select: { id: true, fullName: true, email: true } },
      exam: { select: { title: true, family: true, status: true } },
      answers: { orderBy: { answeredAt: "asc" }, select: { questionId: true, selectedOption: true, answeredAt: true, changedCount: true, firstAnsweredAt: true, lastChangedAt: true } },
      events: { orderBy: { sequence: "asc" }, take: 500, select: { id: true, type: true, sequence: true, questionId: true, clientOccurredAt: true, serverOccurredAt: true, metadata: true } },
      timings: { select: { questionId: true, activeDurationMs: true, visitCount: true, firstEnteredAt: true, lastLeftAt: true } },
      score: {
        select: {
          correctCount: true, wrongCount: true, blankCount: true, totalNet: true, publicationStatus: true, sectionBreakdown: true,
          questionResults: { select: { questionId: true, selectedOption: true, correctOption: true, result: true } },
          outcomeScores: { select: { outcomeId: true, questionCount: true, correctCount: true, wrongCount: true, accuracyRate: true, outcome: { select: { code: true, title: true } } } },
        },
      },
    },
  });
  if (!attempt) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 404 });

  const assessment = assessIntegrity(
    attempt.events.map((event) => ({
      type: event.type,
      metadata: (event.metadata as Record<string, unknown> | null) || null,
      durationMs: Number((event.metadata as { durationMs?: number } | null)?.durationMs) || 0,
    })),
  );

  return NextResponse.json({
    attempt: {
      ...attempt,
      totalNet: attempt.score ? Number(attempt.score.totalNet) : null,
      assessment,
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.attempt.integrity_review", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:integrity:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = integrityReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "İnceleme işlemi geçersiz." }, { status: 400 });

  const attempt = await prisma.odkExamAttempt.findUnique({ where: { id }, select: { id: true, examId: true, status: true, integrityLevel: true } });
  if (!attempt) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 404 });

  const data =
    parsed.data.action === "MARK_REVIEWED"
      ? { integrityReviewedAt: new Date(), status: attempt.status === "REVIEW_REQUIRED" ? ("SUBMITTED" as const) : undefined }
      : parsed.data.action === "REQUIRE_REVIEW"
        ? { status: "REVIEW_REQUIRED" as const, integrityReviewedAt: null }
        : { integrityReviewedAt: null };

  const updated = await prisma.odkExamAttempt.update({
    where: { id },
    data: {
      integrityReviewedAt: data.integrityReviewedAt === undefined ? undefined : data.integrityReviewedAt,
      ...(data.status ? { status: data.status } : {}),
    },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "OdkExamAttempt",
    entityId: id,
    action: "odk.attempt_integrity_reviewed",
    summary: `Integrity incelemesi: ${parsed.data.action}`,
    payload: { examId: attempt.examId, note: parsed.data.note || null, previousLevel: attempt.integrityLevel },
  });

  return NextResponse.json({ attempt: { id: updated.id, status: updated.status, integrityReviewedAt: updated.integrityReviewedAt } });
}
