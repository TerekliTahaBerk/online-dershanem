import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/odk/admin/attempts/[id]
 * Tek bir attempt'in tam detayı: kullanıcı, sonuç, event timeline, cevaplar.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const attempt = await prisma.odkExamAttempt.findUnique({
    where: { id },
    select: {
      id: true, status: true, startedAt: true, submittedAt: true,
      durationSeconds: true, score: true,
      correctCount: true, wrongCount: true, blankCount: true,
      cheatViolationCount: true, autoSubmitted: true,
      sectionScores: true, resultPayload: true,
      user: { select: { id: true, name: true, email: true } },
      exam: { select: { id: true, title: true, slug: true, cadenceFamily: true } },
      events: {
        orderBy: { occurredAt: "asc" },
        take: 1000,
        select: { id: true, type: true, questionNumber: true, payload: true, occurredAt: true },
      },
      opticalAnswers: {
        select: { sectionId: true, questionNumber: true, selectedOption: true, answeredAt: true },
      },
    },
  });
  if (!attempt) return apiErr("Çözüm bulunamadı.", 404);

  return apiOk({
    attempt: {
      ...attempt,
      score: attempt.score ? Number(attempt.score) : null,
    },
  });
}
