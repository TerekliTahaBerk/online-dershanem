import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.attempt.heartbeat", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:heartbeat:${auth.session.userId}`, rateLimit: { max: 45, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params; const now = new Date();
  const active = await prisma.odkExamAttempt.updateMany({ where: { id, studentUserId: auth.session.userId, status: "IN_PROGRESS", deadlineAt: { gt: now } }, data: { lastActivityAt: now } });
  if (!active.count) {
    await prisma.odkExamAttempt.updateMany({ where: { id, studentUserId: auth.session.userId, status: "IN_PROGRESS", deadlineAt: { lte: now } }, data: { status: "AUTO_SUBMITTED", submittedAt: now } });
    return NextResponse.json({ error: "Sınav oturumu kapandı.", code: "ATTEMPT_CLOSED" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, serverNow: now });
}
