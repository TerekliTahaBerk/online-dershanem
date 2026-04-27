import { prisma } from "@/lib/prisma";

/**
 * Returns true if the user has access to the given exam.
 * Access rules:
 *   - Exam with no access tags is open to anyone authenticated.
 *   - Exam with access tags requires the user to hold at least one matching,
 *     non-revoked, non-expired OdkUserAccessTag.
 *   - When the user's tag was granted via an entitlement, that entitlement
 *     must also be active (not expired, not revoked).
 */
export async function userCanAccessOdkExam(userId: string, examId: string): Promise<boolean> {
  const examTags = await prisma.odkExamAccessTag.findMany({
    where: { examId },
    select: { accessTagId: true },
  });

  // Open exam — no tag restriction
  if (examTags.length === 0) return true;

  const requiredTagIds = new Set(examTags.map((t) => t.accessTagId));
  const now = new Date();

  const userTags = await prisma.odkUserAccessTag.findMany({
    where: {
      userId,
      accessTagId: { in: Array.from(requiredTagIds) },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      accessTagId: true,
      entitlementId: true,
      entitlement: { select: { status: true, expiresAt: true } },
    },
  });

  return userTags.some((ut) => {
    if (!ut.entitlementId) return true;
    const ent = ut.entitlement;
    if (!ent) return false;
    if (ent.status !== "ACTIVE") return false;
    if (ent.expiresAt && ent.expiresAt <= now) return false;
    return true;
  });
}

/**
 * Throws if the user doesn't have access. Used inside server actions where we
 * want a fast failure that the client can catch.
 */
export async function requireOdkExamAccess(userId: string, examId: string): Promise<void> {
  const ok = await userCanAccessOdkExam(userId, examId);
  if (!ok) throw new Error("Bu sınava erişim izniniz yok.");
}
