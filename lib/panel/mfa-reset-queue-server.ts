import "server-only";

import { prisma } from "@/lib/prisma";

/** Bekleyen, süresi dolmamış MFA sıfırlama istekleri (web kuyruğu ve mobil yönetim aynı liste). */
export function listPendingMfaResets() {
  return prisma.mfaResetRequest.findMany({
    where: { status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    include: {
      target: { select: { id: true, fullName: true, email: true } },
      requestedBy: { select: { id: true, fullName: true, email: true } },
    },
  });
}
