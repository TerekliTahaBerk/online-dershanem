import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { RATE_LIMIT_POLICIES } from "@/lib/security/rate-limit-policies";
import { getRateLimitKeyFromUser } from "@/lib/security/rate-limit";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { canCloseSession, computeSessionTimeline } from "@/lib/odk/exam-sessions";
import { loadAttemptSessionState } from "@/lib/odk/attempt-sessions-server";

/**
 * Oturumlu sınavda (LGS) açık oturumu öğrencinin ERKEN kapatması: "Oturumu bitir".
 * Kapanan oturumun cevapları kilitlenir, ara hemen başlar ve takvim öne çekilir;
 * denemenin teslim sınırı (`deadlineAt`) yeni son oturum bitişine iner. Son
 * oturum bu uçla kapanmaz (teslim ucu kapatır). Tekrarlanan istek idempotenttir.
 */
const schema = z.object({ sessionKey: z.string().min(1).max(40) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT");
  if (!auth.ok) return auth.response;
  const policy = RATE_LIMIT_POLICIES.odkSubmit;
  const guard = await guardMutation({
    action: "odk.attempt.session_close",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: getRateLimitKeyFromUser(auth.session.userId, "odk.attempt.session_close"),
    rateLimit: policy.limit,
  });
  if (!guard.ok) return mutationGuardResponse(guard);
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidApiInput();
  const { id } = params.data;
  const now = new Date();

  const attempt = await prisma.odkExamAttempt.findFirst({
    where: { id, studentUserId: auth.session.userId },
    select: { id: true, status: true, startedAt: true, deadlineAt: true, version: { select: { settings: true } } },
  });
  if (!attempt) return NextResponse.json({ error: "Sınav oturumu bulunamadı." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS" || now >= attempt.deadlineAt) {
    return NextResponse.json({ error: "Sınav süresi sona erdi.", code: "ATTEMPT_CLOSED" }, { status: 409 });
  }
  const state = await loadAttemptSessionState(
    { id: attempt.id, startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, settings: attempt.version.settings },
    now,
  );
  if (!state) return NextResponse.json({ error: "Bu deneme tek oturumludur.", code: "NO_SESSIONS" }, { status: 409 });

  const decision = canCloseSession(state.timeline, parsed.data.sessionKey);
  if (decision === "ALREADY_CLOSED") {
    return NextResponse.json({ ok: true, idempotent: true, phase: state.timeline.phase, breakEndsAt: state.timeline.breakEndsAt });
  }
  if (decision === "LAST_SESSION") {
    return NextResponse.json({ error: "Son oturum teslim edilerek kapanır.", code: "LAST_SESSION" }, { status: 409 });
  }
  if (decision !== "OK") {
    return NextResponse.json({ error: "Bu oturum şu an açık değil.", code: "SESSION_NOT_ACTIVE" }, { status: 409 });
  }

  const closedAt = now;
  const next = computeSessionTimeline({
    plan: state.plan,
    startedAt: attempt.startedAt,
    hardDeadline: attempt.deadlineAt,
    closures: [
      ...state.timeline.sessions.filter((session) => session.closedAt && session.key !== parsed.data.sessionKey).map((session) => ({ key: session.key, closedAt: session.closedAt! })),
      { key: parsed.data.sessionKey, closedAt },
    ],
    now,
  });
  try {
    await prisma.$transaction([
      prisma.odkAttemptSessionClosure.create({ data: { attemptId: id, sessionKey: parsed.data.sessionKey, closedAt } }),
      prisma.odkExamAttempt.updateMany({
        where: { id, studentUserId: auth.session.userId, status: "IN_PROGRESS", deadlineAt: { gt: next.finalDeadline } },
        data: { deadlineAt: next.finalDeadline, lastActivityAt: now },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: true, idempotent: true });
    }
    throw error;
  }
  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "OdkExamAttempt",
    entityId: id,
    action: "odk.attempt_session_closed",
    summary: "Öğrenci oturumu erken bitirdi",
    payload: { sessionKey: parsed.data.sessionKey, breakEndsAt: next.breakEndsAt?.toISOString() ?? null },
  });
  return NextResponse.json({ ok: true, phase: next.phase, breakEndsAt: next.breakEndsAt });
}
