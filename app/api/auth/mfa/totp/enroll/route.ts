import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiPrimaryAdmin } from "@/lib/auth/api-guards";
import { adminHasMfa, markSessionMfaVerified, replaceRecoveryCodes } from "@/lib/auth/mfa";
import { decryptMfaSecret, encryptMfaSecret, matchTotpCounter, randomBase32 } from "@/lib/auth/mfa-crypto";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

const verifySchema = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function PUT(request: Request) {
  const auth = await requireApiPrimaryAdmin();
  if (!auth.ok) return auth.response;
  if ((await adminHasMfa(auth.session.userId)) && !auth.session.mfaVerifiedAt) return NextResponse.json({ error: "TOTP'yi değiştirmek için önce MFA doğrulayın." }, { status: 403 });
  const guard = await guardMutation({ action: "auth.mfa.totp.begin", requireSameOrigin: true, headers: request.headers, rateLimitKey: `mfa:totp-begin:${auth.session.userId}`, rateLimit: { max: 5, windowMs: 15 * 60_000 } });
  if (!guard.ok) return mutationGuardResponse(guard);
  const secret = randomBase32();
  await prisma.adminMfa.upsert({ where: { userId: auth.session.userId }, create: { userId: auth.session.userId, pendingTotpSecretEncrypted: encryptMfaSecret(secret), pendingTotpExpiresAt: new Date(Date.now() + 10 * 60_000) }, update: { pendingTotpSecretEncrypted: encryptMfaSecret(secret), pendingTotpExpiresAt: new Date(Date.now() + 10 * 60_000) } });
  const label = encodeURIComponent(`Online Dershanem:${auth.session.email}`);
  const issuer = encodeURIComponent("Online Dershanem");
  return NextResponse.json({ secret, otpauthUri: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` });
}

export async function POST(request: Request) {
  const auth = await requireApiPrimaryAdmin();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "auth.mfa.totp.confirm", requireSameOrigin: true, headers: request.headers, rateLimitKey: `mfa:totp-confirm:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60_000 } });
  if (!guard.ok) return mutationGuardResponse(guard);
  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Altı haneli kodu girin." }, { status: 400 });
  const config = await prisma.adminMfa.findUnique({ where: { userId: auth.session.userId } });
  if (!config?.pendingTotpSecretEncrypted || !config.pendingTotpExpiresAt || config.pendingTotpExpiresAt <= new Date()) return NextResponse.json({ error: "Kurulum süresi doldu. Yeniden başlayın." }, { status: 410 });
  const counter = matchTotpCounter(decryptMfaSecret(config.pendingTotpSecretEncrypted), parsed.data.code);
  if (counter === null) return NextResponse.json({ error: "Kod doğrulanamadı." }, { status: 400 });
  await prisma.adminMfa.update({ where: { userId: auth.session.userId }, data: { totpSecretEncrypted: config.pendingTotpSecretEncrypted, totpEnabledAt: new Date(), totpLastCounter: counter, pendingTotpSecretEncrypted: null, pendingTotpExpiresAt: null, enrolledAt: new Date() } });
  const recoveryCodes = await replaceRecoveryCodes(auth.session.userId);
  await markSessionMfaVerified(auth.session.sessionId);
  await logAudit({ actorUserId: auth.session.userId, entityType: "User", entityId: auth.session.userId, action: "auth.mfa.totp_enrolled", summary: "Yönetici TOTP ikinci faktörünü kaydetti" });
  return NextResponse.json({ verified: true, recoveryCodes, redirect: "/panel" });
}
