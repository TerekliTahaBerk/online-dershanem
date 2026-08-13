import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPrimaryAdmin } from "@/lib/auth/api-guards";
import { consumeRecoveryCode, markSessionMfaVerified, markSessionStepUp, verifyTotpOnce } from "@/lib/auth/mfa";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

const schema = z.object({ code: z.string().trim().min(6).max(32), purpose: z.enum(["AUTHENTICATE", "STEP_UP"]), method: z.enum(["TOTP", "RECOVERY"]) });

export async function POST(request: Request) {
  const auth = await requireApiPrimaryAdmin();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "auth.mfa.code.verify", requireSameOrigin: true, headers: request.headers, rateLimitKey: `mfa:code:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60_000 } });
  if (!guard.ok) return mutationGuardResponse(guard);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data.method === "RECOVERY" && parsed.data.purpose === "STEP_UP")) return NextResponse.json({ error: "Geçersiz doğrulama isteği." }, { status: 400 });
  const verified = parsed.data.method === "TOTP" ? await verifyTotpOnce(auth.session.userId, parsed.data.code) : await consumeRecoveryCode(auth.session.userId, parsed.data.code);
  if (!verified) {
    await logAudit({ actorUserId: auth.session.userId, entityType: "Session", entityId: auth.session.sessionId, action: "auth.mfa.code_failed", summary: "İkinci faktör kodu reddedildi", payload: { method: parsed.data.method } });
    return NextResponse.json({ error: "Kod geçersiz, kullanılmış veya süresi dolmuş." }, { status: 400 });
  }
  if (parsed.data.purpose === "STEP_UP") await markSessionStepUp(auth.session.sessionId); else await markSessionMfaVerified(auth.session.sessionId);
  await logAudit({ actorUserId: auth.session.userId, entityType: "Session", entityId: auth.session.sessionId, action: parsed.data.purpose === "STEP_UP" ? "auth.step_up_success" : parsed.data.method === "RECOVERY" ? "auth.mfa.recovery_used" : "auth.mfa.login_success", summary: "İkinci faktör doğrulandı", payload: { method: parsed.data.method } });
  return NextResponse.json({ verified: true, redirect: "/panel" });
}
