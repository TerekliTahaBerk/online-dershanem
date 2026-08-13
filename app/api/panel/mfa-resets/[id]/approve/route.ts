import { NextResponse } from "next/server";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.mfa_reset.approve", requireSameOrigin: true, headers: request.headers, rateLimitKey: `mfa-reset-approve:${auth.session.userId}`, rateLimit: { max: 5, windowMs: 60 * 60_000 } });
  if (!guard.ok) return mutationGuardResponse(guard);
  const { id } = await context.params;
  const reset = await prisma.mfaResetRequest.findFirst({ where: { id, status: "PENDING", expiresAt: { gt: new Date() } } });
  if (!reset) return NextResponse.json({ error: "Sıfırlama isteği bulunamadı veya süresi doldu." }, { status: 404 });
  if (reset.requestedById === auth.session.userId || reset.targetUserId === auth.session.userId) return NextResponse.json({ error: "Onay, isteği açan ve hedef yöneticiden farklı bir yönetici tarafından verilmelidir." }, { status: 403 });

  const completed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.mfaResetRequest.updateMany({ where: { id, status: "PENDING", expiresAt: { gt: new Date() } }, data: { status: "APPROVED", approvedById: auth.session.userId, approvedAt: new Date() } });
    if (claimed.count !== 1) return false;
    await Promise.all([
      tx.passkeyCredential.deleteMany({ where: { userId: reset.targetUserId } }),
      tx.mfaRecoveryCode.deleteMany({ where: { userId: reset.targetUserId } }),
      tx.mfaChallenge.deleteMany({ where: { userId: reset.targetUserId } }),
      tx.adminMfa.deleteMany({ where: { userId: reset.targetUserId } }),
      tx.session.updateMany({ where: { userId: reset.targetUserId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await tx.mfaResetRequest.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
    await tx.auditLog.create({ data: { actorUserId: auth.session.userId, actorType: "USER", entityType: "MfaResetRequest", entityId: id, action: "auth.mfa_reset_completed", summary: "Çift kontrollü yönetici MFA sıfırlaması tamamlandı", payload: { targetUserId: reset.targetUserId, requestedById: reset.requestedById, approvedById: auth.session.userId } } });
    return true;
  });
  if (!completed) return NextResponse.json({ error: "İstek daha önce işlendi." }, { status: 409 });
  return NextResponse.json({ status: "COMPLETED" });
}
