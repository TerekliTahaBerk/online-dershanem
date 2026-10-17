import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CommandError } from "@/lib/panel/command-receipt";
import { reviewAttemptIntegrity } from "@/lib/odk/integrity-review-service";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { integrityReviewSchema } from "@/lib/odk/admin-schemas";
import { assessIntegrity } from "@/lib/odk/integrity";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:integrity:review"); if (!auth.ok) return auth.response;
  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data;
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
  if (!attempt) return NextResponse.json({ error: "Oturumu bulamadık." }, { status: 404 });

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
  const auth = await requireApiStaffPermission("odk:integrity:review"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.attempt.integrity_review", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:integrity:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data;
  const parsed = integrityReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "İnceleme işlemi geçerli görünmüyor." }, { status: 400 });

  try {
    const { result } = await reviewAttemptIntegrity(auth.session.userId, id, parsed.data);
    return NextResponse.json({ attempt: { id: result.id, status: result.status, integrityReviewedAt: result.integrityReviewedAt } });
  } catch (error) {
    if (error instanceof CommandError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
