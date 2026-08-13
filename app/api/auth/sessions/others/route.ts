import { NextResponse } from "next/server";
import { requireApiActiveUser } from "@/lib/auth/api-guards";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "auth.sessions.revoke_others",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `auth:sessions:others:${auth.session.userId}`,
    rateLimit: { max: 10, windowMs: 15 * 60_000 },
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  const revoked = await revokeAllUserSessions(auth.session.userId, auth.session.sessionId);
  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: auth.session.userId,
    action: "auth.sessions_others_revoked",
    summary: `${revoked} diğer oturum kullanıcı tarafından kapatıldı`,
  });
  return NextResponse.json({ revoked }, { headers: { "Cache-Control": "no-store" } });
}
