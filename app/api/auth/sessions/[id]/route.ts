import { NextResponse } from "next/server";
import { requireApiActiveUser } from "@/lib/auth/api-guards";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "auth.sessions.revoke",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `auth:sessions:revoke:${auth.session.userId}`,
    rateLimit: { max: 20, windowMs: 15 * 60_000 },
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  const { id } = await context.params;
  if (id === auth.session.sessionId) {
    return NextResponse.json({ error: "Bu cihazdaki oturumu çıkış düğmesiyle kapatın." }, { status: 400 });
  }
  const revokedAt = new Date();
  const result = await prisma.session.updateMany({
    where: { id, userId: auth.session.userId, revokedAt: null },
    data: { revokedAt },
  });
  if (result.count !== 1) return NextResponse.json({ error: "Aktif oturum bulunamadı." }, { status: 404 });

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "Session",
    entityId: id,
    action: "auth.session_revoked_by_user",
    summary: "Oturum kullanıcı tarafından uzaktan kapatıldı",
  });
  return NextResponse.json({ revoked: true }, { headers: { "Cache-Control": "no-store" } });
}
