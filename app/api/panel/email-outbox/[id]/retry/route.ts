import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.email_outbox.retry", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:email-retry:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });

  const { id } = await context.params;
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.emailOutbox.updateMany({
      where: { id, status: { in: ["FAILED", "ABANDONED"] } },
      data: { status: "PENDING", attempts: 0, lastError: null, nextRetryAt: null },
    });
    if (updated.count) await tx.auditLog.create({ data: { actorUserId: auth.session.userId, entityType: "EmailOutbox", entityId: id, action: "email.retry_queued", summary: "E-posta yeniden gönderim kuyruğuna alındı" } });
    return updated;
  });
  if (!result.count) return NextResponse.json({ error: "Yeniden denenebilir e-posta bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
