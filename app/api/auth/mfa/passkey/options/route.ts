import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPrimaryAdmin } from "@/lib/auth/api-guards";
import { adminHasMfa } from "@/lib/auth/mfa";
import { authenticationOptions, registrationOptions } from "@/lib/auth/webauthn";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

const schema = z.object({
  purpose: z.enum(["ENROLL", "AUTHENTICATE", "STEP_UP"]),
  preferPlatform: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiPrimaryAdmin();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "auth.mfa.passkey.options", requireSameOrigin: true, headers: request.headers, rateLimitKey: `mfa:options:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60_000 } });
  if (!guard.ok) return mutationGuardResponse(guard);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz MFA amacı." }, { status: 400 });
  if (parsed.data.purpose === "ENROLL") {
    if ((await adminHasMfa(auth.session.userId)) && !auth.session.mfaVerifiedAt) return NextResponse.json({ error: "Yeni geçiş anahtarı eklemek için önce MFA doğrulayın." }, { status: 403 });
    return NextResponse.json(await registrationOptions({ ...auth.session }));
  }
  const enrolled = await adminHasMfa(auth.session.userId);
  if (!enrolled) return NextResponse.json({ error: "Önce ikinci faktör kaydedin.", redirect: "/giris/mfa/enroll" }, { status: 409 });
  const result = await authenticationOptions({
    userId: auth.session.userId,
    sessionId: auth.session.sessionId,
    purpose: parsed.data.purpose === "STEP_UP" ? "STEP_UP" : "MFA_AUTHENTICATION",
    preferPlatform: parsed.data.preferPlatform,
  });
  if (result.platformRequired) {
    return NextResponse.json({
      error: "Bu telefonda kayıtlı geçiş anahtarı yok. Uygulama kodunu veya kurtarma kodunu kullanın.",
      code: "NO_PLATFORM_PASSKEY",
    }, { status: 409 });
  }
  return NextResponse.json(result);
}
