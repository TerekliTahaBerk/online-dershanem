import { NextResponse } from "next/server";
import { z } from "zod";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { getRateLimitKeyFromIp } from "@/lib/security/rate-limit";
import { RATE_LIMIT_POLICIES } from "@/lib/security/rate-limit-policies";
import { ACCOUNT_CLAIM_REJECTION_MESSAGES } from "@/lib/od/account-claim";
import { completeAccountClaim, resolveAccountClaim } from "@/lib/od/account-claim-server";

/**
 * HESAP DEVRALMA — kimlik doğrulaması olmayan tek yüzey.
 *
 * `reset-password` ile aynı duruş: token ASLA sorgu dizesinde taşınmaz,
 * istemci fragment'ten okuyup yalnız POST gövdesinde gönderir. Böylece davet
 * bağlantısı HTTP erişim loglarına ve Referer başlığına düşmez.
 *
 * İki eylem tek route'ta: `verify` akışı çizmek için gereken en az bilgiyi
 * döner, `complete` hesabı kurar. Ayrı dosyalara bölmek aynı hız limiti
 * anahtarını ve aynı hata sözlüğünü iki yere kopyalamak olurdu.
 */

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify"), token: z.string().min(20).max(200) }),
  z.object({
    action: z.literal("complete"),
    token: z.string().min(20).max(200),
    password: z.string().min(1).max(200),
    relationshipDecision: z.enum(["CONFIRM", "REJECT"]).optional(),
    preferences: z.object({
      emailEnabled: z.boolean(),
      availableDays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
      minutesPerDay: z.number().int().min(15).max(180).optional(),
    }),
  }),
]);

export async function POST(request: Request) {
  if (!PANEL_ENABLED) return NextResponse.json({ error: "Panel şu anda kapalı." }, { status: 503 });

  const policy = RATE_LIMIT_POLICIES.accountClaim;
  const guard = await guardMutation({
    action: policy.action,
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: getRateLimitKeyFromIp(request.headers, "auth.account-claim"),
    rateLimit: policy.limit,
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: ACCOUNT_CLAIM_REJECTION_MESSAGES.TOKEN_INVALID }, { status: 400 });
  }

  const headers = { "Cache-Control": "no-store" };

  if (parsed.data.action === "verify") {
    const resolved = await resolveAccountClaim(parsed.data.token);
    if (!resolved.ok) {
      return NextResponse.json({ error: ACCOUNT_CLAIM_REJECTION_MESSAGES[resolved.reason], code: resolved.reason }, { status: 400, headers });
    }
    return NextResponse.json({
      audience: resolved.claim.audience,
      email: resolved.claim.email,
      fullName: resolved.claim.fullName,
      expiresAt: resolved.claim.expiresAt.toISOString(),
      pendingRelationship: resolved.claim.pendingRelationship,
    }, { headers });
  }

  const result = await completeAccountClaim({
    token: parsed.data.token,
    password: parsed.data.password,
    relationshipDecision: parsed.data.relationshipDecision,
    preferences: parsed.data.preferences,
  });
  if (!result.ok) {
    if (result.reason === "WEAK_PASSWORD") return NextResponse.json({ error: result.message, code: result.reason }, { status: 400, headers });
    if (result.reason === "RELATIONSHIP_DECISION_REQUIRED") {
      return NextResponse.json({ error: "Öğrenci bağlantısı için bir seçim yapın.", code: result.reason }, { status: 400, headers });
    }
    if (result.reason === "CONFLICT") {
      return NextResponse.json({ error: "Bu davet az önce kullanıldı. Giriş yapmayı deneyin.", code: result.reason }, { status: 409, headers });
    }
    return NextResponse.json({ error: ACCOUNT_CLAIM_REJECTION_MESSAGES[result.reason], code: result.reason }, { status: 400, headers });
  }

  // Oturum AÇILMAZ: kullanıcı yeni parolasıyla girişten geçsin ki parolayı
  // gerçekten hatırladığını hemen doğrulasın ve giriş akışı tek yerde kalsın.
  return NextResponse.json({ ok: true, relationship: result.relationship }, { headers });
}
