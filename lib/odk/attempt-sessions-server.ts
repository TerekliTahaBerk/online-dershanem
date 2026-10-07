import "server-only";

import { prisma } from "@/lib/prisma";
import { computeSessionTimeline, readSessionPlan, type ExamSessionPlan, type SessionTimeline } from "@/lib/odk/exam-sessions";

/**
 * Oturumlu denemenin sunucu durumu. Plan yoksa null döner ve çağıran eski
 * (tek oturum) akışı sürdürür. `deadlineAt` denemenin sert sınırıdır: başlangıçta
 * planın en uzun hâli (pencereyle sınırlı), erken kapatmadan sonra yeni son
 * oturum bitişi.
 */
export async function loadAttemptSessionState(
  attempt: { id: string; startedAt: Date; deadlineAt: Date; settings: unknown },
  now = new Date(),
): Promise<{ plan: ExamSessionPlan; timeline: SessionTimeline } | null> {
  const plan = readSessionPlan(attempt.settings);
  if (!plan) return null;
  const closures = await prisma.odkAttemptSessionClosure.findMany({
    where: { attemptId: attempt.id },
    select: { sessionKey: true, closedAt: true },
  });
  return {
    plan,
    timeline: computeSessionTimeline({
      plan,
      startedAt: attempt.startedAt,
      hardDeadline: attempt.deadlineAt,
      closures: closures.map((row) => ({ key: row.sessionKey, closedAt: row.closedAt })),
      now,
    }),
  };
}
