import { NextResponse } from "next/server";
import { requireApiPrimaryAdmin } from "@/lib/auth/api-guards";
import { prisma } from "@/lib/prisma";
import { hasFreshStepUp } from "@/lib/auth/mfa-policy";

export async function GET() {
  const auth = await requireApiPrimaryAdmin();
  if (!auth.ok) return auth.response;
  const [config, passkeyCount, recoveryCodeCount] = await Promise.all([
    prisma.adminMfa.findUnique({ where: { userId: auth.session.userId }, select: { totpEnabledAt: true, enrolledAt: true } }),
    prisma.passkeyCredential.count({ where: { userId: auth.session.userId, revokedAt: null } }),
    prisma.mfaRecoveryCode.count({ where: { userId: auth.session.userId, usedAt: null } }),
  ]);
  return NextResponse.json({ enrolled: Boolean(config?.totpEnabledAt || passkeyCount), totpEnabled: Boolean(config?.totpEnabledAt), passkeyCount, recoveryCodeCount, mfaVerified: Boolean(auth.session.mfaVerifiedAt), stepUpFresh: hasFreshStepUp(auth.session.stepUpAt) });
}
