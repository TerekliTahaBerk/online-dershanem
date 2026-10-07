import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { odkAnsweredBand, odkDurationBand } from "@/lib/odk/telemetry";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { RATE_LIMIT_POLICIES } from "@/lib/security/rate-limit-policies";
import { getRateLimitKeyFromUser } from "@/lib/security/rate-limit";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import { loadAttemptSessionState } from "@/lib/odk/attempt-sessions-server";
import { canSubmitSessionAttempt } from "@/lib/odk/exam-sessions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  const policy = RATE_LIMIT_POLICIES.odkSubmit;
  const guard = await guardMutation({ action: policy.action, requireSameOrigin: true, headers: request.headers, rateLimitKey: getRateLimitKeyFromUser(auth.session.userId, policy.action), rateLimit: policy.limit });
  if (!guard.ok) return mutationGuardResponse(guard);
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const { id } = params.data;
  const attempt = await prisma.odkExamAttempt.findFirst({ where: { id, studentUserId: auth.session.userId }, select: { id: true, status: true, deadlineAt: true, startedAt: true, version: { select: { settings: true } }, exam: { select: { family: true, examFamilyRef: { select: { code: true } } } }, _count: { select: { answers: { where: { selectedOption: { not: null } } } } } } });
  if (!attempt) return NextResponse.json({ error: "Sınav oturumu bulunamadı." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ ok: true, status: attempt.status, idempotent: true });
  const now = new Date();
  // Oturumlu sınav: teslim yalnız son oturumda (önceki oturum "Oturumu bitir" ile kapanır).
  const sessionState = now < attempt.deadlineAt ? await loadAttemptSessionState({ id: attempt.id, startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, settings: attempt.version.settings }, now) : null;
  if (sessionState && !canSubmitSessionAttempt(sessionState.timeline)) {
    return NextResponse.json({ error: "Teslim son oturumda yapılır. Bu oturumu bitirmek için “Oturumu bitir”i kullan.", code: "SESSION_NOT_LAST" }, { status: 409 });
  }
  const status = now >= attempt.deadlineAt ? "AUTO_SUBMITTED" as const : "SUBMITTED" as const;
  const changed = await prisma.odkExamAttempt.updateMany({ where: { id, studentUserId: auth.session.userId, status: "IN_PROGRESS" }, data: { status, submittedAt: now, lastActivityAt: now } });
  if (!changed.count) { const latest = await prisma.odkExamAttempt.findUnique({ where: { id }, select: { status: true } }); return NextResponse.json({ ok: true, status: latest?.status || status, idempotent: true }); }
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExamAttempt", entityId: id, action: "odk.attempt_submitted", summary: status === "SUBMITTED" ? "Öğrenci denemeyi teslim etti" : "Deneme süresi dolunca otomatik teslim edildi", payload: { status } });
  await recordPanelProductEvent({ name: "odk_attempt_submitted", properties: { family: getOdkExamFamilyCode(attempt.exam), mode: status === "SUBMITTED" ? "MANUAL" : "AUTO", answeredBand: odkAnsweredBand(attempt._count.answers), durationBand: odkDurationBand(attempt.startedAt, now) } }, "STUDENT");
  return NextResponse.json({ ok: true, status });
}
