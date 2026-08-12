import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { RATE_LIMIT_POLICIES } from "@/lib/security/rate-limit-policies";
import { getRateLimitKeyFromUser } from "@/lib/security/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  const policy = RATE_LIMIT_POLICIES.odkHeartbeat;
  const guard = await guardMutation({ action: policy.action, requireSameOrigin: true, headers: request.headers, rateLimitKey: getRateLimitKeyFromUser(auth.session.userId, policy.action), rateLimit: policy.limit });
  if (!guard.ok) return mutationGuardResponse(guard);
  const { id } = await context.params; const now = new Date();
  const active = await prisma.odkExamAttempt.updateMany({ where: { id, studentUserId: auth.session.userId, status: "IN_PROGRESS", deadlineAt: { gt: now } }, data: { lastActivityAt: now } });
  if (!active.count) {
    await prisma.odkExamAttempt.updateMany({ where: { id, studentUserId: auth.session.userId, status: "IN_PROGRESS", deadlineAt: { lte: now } }, data: { status: "AUTO_SUBMITTED", submittedAt: now } });
    return NextResponse.json({ error: "Sınav oturumu kapandı.", code: "ATTEMPT_CLOSED" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, serverNow: now });
}
