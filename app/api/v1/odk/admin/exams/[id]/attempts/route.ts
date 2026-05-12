import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/odk/admin/exams/[id]/attempts
 * Bir denemeye ait tüm attempt'ler — admin panelinde liste/sıralama için.
 * Query: ?status=SUBMITTED|IN_PROGRESS|all (default all), ?sort=score|violations|date
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id: examId } = await ctx.params;

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const sort = url.searchParams.get("sort") ?? "date";

  const where: { examId: string; status?: "SUBMITTED" | "IN_PROGRESS" } = { examId };
  if (statusParam === "SUBMITTED" || statusParam === "IN_PROGRESS") {
    where.status = statusParam;
  }

  const orderBy =
    sort === "score" ? { score: "desc" as const }
    : sort === "violations" ? { cheatViolationCount: "desc" as const }
    : { startedAt: "desc" as const };

  const attempts = await prisma.odkExamAttempt.findMany({
    where,
    orderBy,
    take: 500,
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      durationSeconds: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      cheatViolationCount: true,
      autoSubmitted: true,
      suspiciousScore: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return apiOk({
    attempts: attempts.map((a) => ({
      id: a.id,
      status: a.status,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      durationSeconds: a.durationSeconds,
      score: a.score ? Number(a.score) : null,
      correctCount: a.correctCount,
      wrongCount: a.wrongCount,
      blankCount: a.blankCount,
      cheatViolationCount: a.cheatViolationCount,
      autoSubmitted: a.autoSubmitted,
      suspiciousScore: a.suspiciousScore,
      user: a.user,
    })),
  });
}
