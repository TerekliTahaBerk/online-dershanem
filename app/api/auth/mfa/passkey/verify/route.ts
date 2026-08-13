import { NextResponse } from "next/server";
import { verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture, RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { requireApiPrimaryAdmin } from "@/lib/auth/api-guards";
import { consumeChallenge, challengeMatches, loadChallenge, webAuthnConfig } from "@/lib/auth/webauthn";
import { markSessionMfaVerified, markSessionStepUp, replaceRecoveryCodes } from "@/lib/auth/mfa";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

const schema = z.object({ challengeId: z.string().min(1), purpose: z.enum(["ENROLL", "AUTHENTICATE", "STEP_UP"]), response: z.record(z.string(), z.unknown()) });

export async function POST(request: Request) {
  const auth = await requireApiPrimaryAdmin();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "auth.mfa.passkey.verify", requireSameOrigin: true, headers: request.headers, rateLimitKey: `mfa:verify:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60_000 } });
  if (!guard.ok) return mutationGuardResponse(guard);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz geçiş anahtarı yanıtı." }, { status: 400 });
  const purpose = parsed.data.purpose === "ENROLL" ? "PASSKEY_ENROLLMENT" : parsed.data.purpose === "STEP_UP" ? "STEP_UP" : "MFA_AUTHENTICATION";
  const challenge = await loadChallenge({ challengeId: parsed.data.challengeId, userId: auth.session.userId, sessionId: auth.session.sessionId, purpose });
  if (!challenge) return NextResponse.json({ error: "Doğrulama isteği süresi dolmuş veya daha önce kullanılmış." }, { status: 409 });
  const { origin, rpID } = webAuthnConfig();
  try {
    if (parsed.data.purpose === "ENROLL") {
      const verification = await verifyRegistrationResponse({ response: parsed.data.response as unknown as RegistrationResponseJSON, expectedChallenge: challengeMatches(challenge.challengeHash), expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, supportedAlgorithmIDs: [-7, -257] });
      if (!verification.verified || !verification.registrationInfo || !(await consumeChallenge(challenge.id))) return NextResponse.json({ error: "Geçiş anahtarı doğrulanamadı." }, { status: 400 });
      const info = verification.registrationInfo;
      await prisma.passkeyCredential.create({ data: { userId: auth.session.userId, credentialId: info.credential.id, publicKey: Buffer.from(info.credential.publicKey), counter: BigInt(info.credential.counter), transports: (parsed.data.response.response as { transports?: AuthenticatorTransportFuture[] } | undefined)?.transports || [], deviceType: info.credentialDeviceType, backedUp: info.credentialBackedUp } });
      const recoveryCodes = await replaceRecoveryCodes(auth.session.userId);
      await markSessionMfaVerified(auth.session.sessionId);
      await logAudit({ actorUserId: auth.session.userId, entityType: "User", entityId: auth.session.userId, action: "auth.mfa.passkey_enrolled", summary: "Yönetici geçiş anahtarı kaydetti" });
      return NextResponse.json({ verified: true, recoveryCodes, redirect: "/panel" });
    }

    const response = parsed.data.response as unknown as AuthenticationResponseJSON;
    const credential = await prisma.passkeyCredential.findFirst({ where: { credentialId: response.id, userId: auth.session.userId, revokedAt: null } });
    if (!credential) return NextResponse.json({ error: "Geçiş anahtarı bulunamadı." }, { status: 400 });
    const verification = await verifyAuthenticationResponse({ response, expectedChallenge: challengeMatches(challenge.challengeHash), expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, credential: { id: credential.credentialId, publicKey: new Uint8Array(credential.publicKey), counter: Number(credential.counter), transports: credential.transports as AuthenticatorTransportFuture[] } });
    if (!verification.verified || !(await consumeChallenge(challenge.id))) return NextResponse.json({ error: "Geçiş anahtarı doğrulanamadı veya tekrar kullanıldı." }, { status: 409 });
    await prisma.passkeyCredential.update({ where: { id: credential.id }, data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date(), backedUp: verification.authenticationInfo.credentialBackedUp } });
    if (parsed.data.purpose === "STEP_UP") await markSessionStepUp(auth.session.sessionId); else await markSessionMfaVerified(auth.session.sessionId);
    await logAudit({ actorUserId: auth.session.userId, entityType: "Session", entityId: auth.session.sessionId, action: parsed.data.purpose === "STEP_UP" ? "auth.step_up_success" : "auth.mfa.login_success", summary: "Geçiş anahtarı doğrulandı", payload: { method: "PASSKEY" } });
    return NextResponse.json({ verified: true, redirect: "/panel" });
  } catch {
    await logAudit({ actorUserId: auth.session.userId, entityType: "Session", entityId: auth.session.sessionId, action: "auth.mfa.passkey_failed", summary: "Geçiş anahtarı doğrulaması başarısız" });
    return NextResponse.json({ error: "Geçiş anahtarı doğrulanamadı." }, { status: 400 });
  }
}
