import "server-only";

import { prisma } from "@/lib/prisma";
import { decryptMfaSecret, generateRecoveryCodes, hashMfaValue, matchTotpCounter, normalizeRecoveryCode } from "@/lib/auth/mfa-crypto";

export async function adminHasMfa(userId: string): Promise<boolean> {
  const [config, passkeys] = await Promise.all([
    prisma.adminMfa.findUnique({ where: { userId }, select: { totpEnabledAt: true } }),
    prisma.passkeyCredential.count({ where: { userId, revokedAt: null } }),
  ]);
  return Boolean(config?.totpEnabledAt || passkeys > 0);
}

export async function replaceRecoveryCodes(userId: string): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await prisma.$transaction([
    prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
    prisma.mfaRecoveryCode.createMany({ data: codes.map((code) => ({ userId, codeHash: hashMfaValue(normalizeRecoveryCode(code)) })) }),
    prisma.adminMfa.upsert({ where: { userId }, create: { userId, recoveryGeneratedAt: new Date(), enrolledAt: new Date() }, update: { recoveryGeneratedAt: new Date(), enrolledAt: new Date() } }),
  ]);
  return codes;
}

export async function verifyTotpOnce(userId: string, code: string, now = Date.now()): Promise<boolean> {
  const config = await prisma.adminMfa.findUnique({ where: { userId } });
  if (!config?.totpEnabledAt || !config.totpSecretEncrypted) return false;
  const counter = matchTotpCounter(decryptMfaSecret(config.totpSecretEncrypted), code, now);
  if (counter === null) return false;
  const updated = await prisma.adminMfa.updateMany({
    where: { userId, OR: [{ totpLastCounter: null }, { totpLastCounter: { lt: counter } }] },
    data: { totpLastCounter: counter },
  });
  return updated.count === 1;
}

export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const codeHash = hashMfaValue(normalizeRecoveryCode(code));
  const consumed = await prisma.mfaRecoveryCode.updateMany({ where: { userId, codeHash, usedAt: null }, data: { usedAt: new Date() } });
  return consumed.count === 1;
}

export async function markSessionMfaVerified(sessionId: string): Promise<void> {
  const now = new Date();
  await prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { mfaVerifiedAt: now, stepUpAt: now } });
}

export async function markSessionStepUp(sessionId: string): Promise<void> {
  await prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { stepUpAt: new Date() } });
}
