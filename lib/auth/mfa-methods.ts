import { credentialIsPlatformBound } from "@/lib/auth/passkey-capabilities";
import { prisma } from "@/lib/prisma";

export async function getAdminPasskeyCapabilities(userId: string) {
  const credentials = await prisma.passkeyCredential.findMany({
    where: { userId, revokedAt: null },
    select: { transports: true, deviceType: true },
  });
  return {
    passkeyCount: credentials.length,
    hasPlatformPasskey: credentials.some(credentialIsPlatformBound),
  };
}
