import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { odkAnsweredBand, odkDurationBand } from "@/lib/odk/telemetry";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { RATE_LIMIT_POLICIES } from "@/lib/security/rate-limit-policies";
import { getRateLimitKeyFromUser } from "@/lib/security/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  const policy = RATE_LIMIT_POLICIES.odkSubmit;
  const guard = await guardMutation({ action: policy.action, requireSameOrigin: true, headers: request.headers, rateLimitKey: getRateLimitKeyFromUser(auth.session.userId, policy.action), rateLimit: policy.limit });
  if (!guard.ok) return mutationGuardResponse(guard);
  const { id } = await context.params;
  const attempt = await prisma.odkExamAttempt.findFirst({ where: { id, studentUserId: auth.session.userId }, select: { id: true, status: true, deadlineAt: true, startedAt: true, exam: { select: { family: true } }, _count: { select: { answers: { where: { selectedOption: { not: null } } } } } } });
  if (!attempt) return NextResponse.json({ error: "Sınav oturumu bulunamadı." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ ok: true, status: attempt.status, idempotent: true });
  const now = new Date();
  const status = now >= attempt.deadlineAt ? "AUTO_SUBMITTED" as const : "SUBMITTED" as const;
  const changed = await prisma.odkExamAttempt.updateMany({ where: { id, studentUserId: auth.session.userId, status: "IN_PROGRESS" }, data: { status, submittedAt: now, lastActivityAt: now } });
  if (!changed.count) { const latest = await prisma.odkExamAttempt.findUnique({ where: { id }, select: { status: true } }); return NextResponse.json({ ok: true, status: latest?.status || status, idempotent: true }); }
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExamAttempt", entityId: id, action: "odk.attempt_submitted", summary: status === "SUBMITTED" ? "Öğrenci denemeyi teslim etti" : "Deneme süresi dolunca otomatik teslim edildi", payload: { status } });
  await recordPanelProductEvent({ name: "odk_attempt_submitted", properties: { family: attempt.exam.family, mode: status === "SUBMITTED" ? "MANUAL" : "AUTO", answeredBand: odkAnsweredBand(attempt._count.answers), durationBand: odkDurationBand(attempt.startedAt, now) } }, "STUDENT");
  return NextResponse.json({ ok: true, status });
}
