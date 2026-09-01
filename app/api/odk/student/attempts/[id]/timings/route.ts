import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { getRateLimitKeyFromUser } from "@/lib/security/rate-limit";
import { questionTimingBatchSchema } from "@/lib/odk/admin-schemas";
import { mergeVisitDuration } from "@/lib/odk/time-analysis";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "odk.attempt.timings",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: getRateLimitKeyFromUser(auth.session.userId, "odk.attempt.timings"),
    rateLimit: { max: 120, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  const parsed = questionTimingBatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Timing batch geçersiz." }, { status: 400 });
  const { id } = await context.params;
  const attempt = await prisma.odkExamAttempt.findFirst({
    where: { id, studentUserId: auth.session.userId },
    select: {
      id: true,
      status: true,
      version: { select: { sections: { select: { questions: { where: { isActive: true }, select: { id: true } } } } } },
    },
  });
  if (!attempt) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ accepted: 0 });

  const allowed = new Set(attempt.version.sections.flatMap((section) => section.questions.map((question) => question.id)));
  let accepted = 0;
  for (const timing of parsed.data.timings) {
    if (!allowed.has(timing.questionId)) continue;
    const existing = await prisma.odkAttemptQuestionTiming.findUnique({
      where: { attemptId_questionId: { attemptId: id, questionId: timing.questionId } },
    });
    const enteredAt = timing.enteredAt ? new Date(timing.enteredAt) : new Date();
    const leftAt = timing.leftAt ? new Date(timing.leftAt) : null;
    if (!existing) {
      await prisma.odkAttemptQuestionTiming.create({
        data: {
          attemptId: id,
          questionId: timing.questionId,
          activeDurationMs: Math.max(0, timing.activeDurationMs),
          firstEnteredAt: enteredAt,
          lastLeftAt: leftAt,
          visitCount: 1,
        },
      });
    } else {
      await prisma.odkAttemptQuestionTiming.update({
        where: { id: existing.id },
        data: {
          activeDurationMs: mergeVisitDuration(existing.activeDurationMs, timing.activeDurationMs),
          visitCount: existing.visitCount + 1,
          lastLeftAt: leftAt || existing.lastLeftAt,
        },
      });
    }
    accepted += 1;
  }
  return NextResponse.json({ accepted });
}
