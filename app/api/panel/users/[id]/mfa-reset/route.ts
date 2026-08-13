import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { prisma } from "@/lib/prisma";

const schema = z.object({ reason: z.string().trim().min(10).max(500) });

/**
 * Starts dual-control MFA recovery. The requester cannot reset themselves and
 * this endpoint never removes factors; a second, freshly-authenticated admin
 * must approve the short-lived request.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.mfa_reset.request", requireSameOrigin: true, headers: request.headers, rateLimitKey: `mfa-reset:${auth.session.userId}`, rateLimit: { max: 5, windowMs: 60 * 60_000 } });
  if (!guard.ok) return mutationGuardResponse(guard);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Operasyon gerekçesi en az 10 karakter olmalı." }, { status: 400 });
  const { id } = await context.params;
  if (id === auth.session.userId) return NextResponse.json({ error: "Kendi MFA'nızı sıfırlayamazsınız." }, { status: 400 });
  const target = await prisma.user.findFirst({ where: { id, role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Aktif yönetici bulunamadı." }, { status: 404 });
  const row = await prisma.$transaction(async (tx) => {
    await tx.mfaResetRequest.updateMany({ where: { targetUserId: id, status: "PENDING" }, data: { status: "EXPIRED" } });
    const created = await tx.mfaResetRequest.create({ data: { targetUserId: id, requestedById: auth.session.userId, reason: parsed.data.reason, expiresAt: new Date(Date.now() + 30 * 60_000) } });
    await tx.auditLog.create({ data: { actorUserId: auth.session.userId, actorType: "USER", entityType: "MfaResetRequest", entityId: created.id, action: "auth.mfa_reset_requested", summary: "Yönetici MFA sıfırlaması için çift kontrol istendi", payload: { targetUserId: id } } });
    return created;
  });
  return NextResponse.json({ id: row.id, status: row.status, expiresAt: row.expiresAt }, { status: 202 });
}
