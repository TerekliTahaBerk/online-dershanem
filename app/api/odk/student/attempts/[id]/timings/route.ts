import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { getRateLimitKeyFromUser } from "@/lib/security/rate-limit";
import { questionTimingBatchSchema } from "@/lib/odk/admin-schemas";
import { recordAttemptQuestionTimings } from "@/lib/odk/attempt-timings";

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
  const accepted = await recordAttemptQuestionTimings(prisma, id, parsed.data.timings, allowed);
  return NextResponse.json({ accepted });
}
