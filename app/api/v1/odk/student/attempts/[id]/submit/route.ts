import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionApi, apiOk, apiErr } from "@/lib/odk/api";
import { scoreAttempt } from "@/lib/odk/scoring";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getRateLimitKeyComposite } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const SubmitSchema = z.object({
  autoSubmitted: z.boolean().optional().default(false),
  reason: z.string().max(200).optional(),
}).optional();

/**
 * POST /api/v1/odk/student/attempts/[id]/submit
 * Çözümü tamamlar; net puan + bölüm bazlı sonuç + perQuestion JSON yazar.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: attemptId } = await ctx.params;
  const auth = await requireSessionApi();
  if (!auth.ok) return auth.response;

  // Phase 2 / Session 17 — abuse hardening: per-user-per-attempt rate-limit
  // + same-origin guard. Idempotency for the legitimate path is already
  // handled below (`status !== IN_PROGRESS` → 409).
  const guard = await guardMutation({
    action: "odk.attempt.submit",
    requireSameOrigin: true,
    headers: req.headers,
    rateLimitKey: getRateLimitKeyComposite(
      auth.userId,
      "odk.attempt.submit",
      attemptId,
    ),
    rateLimit: { max: 5, windowMs: 60_000 },
  });
  if (!guard.ok) {
    return apiErr(guard.message, guard.code === "RATE_LIMIT" ? 429 : 403);
  }

  let body: unknown = undefined;
  try { body = await req.json(); } catch { /* body opsiyonel */ }
  const parsed = SubmitSchema.safeParse(body ?? {});
  const autoSubmitted = parsed.success ? !!parsed.data?.autoSubmitted : false;

  const attempt = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true, userId: true, status: true, startedAt: true, examId: true,
      exam: {
        select: {
          id: true,
          durationMinutes: true,
          sections: {
            orderBy: { orderIndex: "asc" },
            select: { id: true, title: true, questionCount: true },
          },
        },
      },
      opticalAnswers: {
        select: { sectionId: true, questionNumber: true, selectedOption: true },
      },
    },
  });
  if (!attempt) return apiErr("Çözüm bulunamadı.", 404);
  if (attempt.userId !== auth.userId) return apiErr("Bu çözüme erişiminiz yok.", 403);
  if (attempt.status !== "IN_PROGRESS") {
    return apiErr("Çözüm zaten tamamlandı.", 409);
  }

  const officialAnswers = await prisma.odkExamOfficialAnswer.findMany({
    where: { examId: attempt.examId },
    select: { sectionId: true, questionNumber: true, correctOption: true },
  });

  const result = scoreAttempt(
    attempt.exam.sections,
    officialAnswers,
    attempt.opticalAnswers,
  );

  const now = new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000),
  );

  await prisma.odkExamAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: now,
      autoSubmitted,
      durationSeconds,
      score: result.totalNet,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      blankCount: result.blankCount,
      sectionScores: result.sectionScores,
      resultPayload: { perQuestion: result.perQuestion },
    },
  });

  return apiOk({
    attemptId,
    score: result.totalNet,
    correctCount: result.correctCount,
    wrongCount: result.wrongCount,
    blankCount: result.blankCount,
    sectionScores: result.sectionScores,
    durationSeconds,
    autoSubmitted,
  });
}
