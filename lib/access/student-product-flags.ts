import { prisma } from "@/lib/prisma";

/**
 * FAZ 6 yardımcı: bir Student listesi için OD/ODK ürün bayraklarını
 * tek sorguyla çıkarır. `User.odkUserAccessTags` join'i ile.
 *
 * - hasOD : user'ın aktif (revokedAt=null, expires>now) OD tagı var mı
 *   YA DA studentPackages enrollment'ı var (legacy OD signal)
 *   YA DA hiç user bağlanmamış (eski lead — OD-only varsayılır).
 * - hasODK: user'ın aktif ODK tagı var mı.
 */
export type StudentProductFlags = {
  studentId: string;
  hasOD: boolean;
  hasODK: boolean;
  odkExpiresAt: Date | null;
};

export async function getStudentProductFlags(
  studentIds: string[],
): Promise<Map<string, StudentProductFlags>> {
  const map = new Map<string, StudentProductFlags>();
  if (studentIds.length === 0) return map;

  const now = new Date();
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      userId: true,
      packages: { select: { studentId: true }, take: 1 },
      user: {
        select: {
          odkUserAccessTags: {
            where: {
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              accessTag: { isActive: true },
            },
            select: {
              expiresAt: true,
              accessTag: { select: { service: true } },
            },
          },
          odkEntitlements: {
            where: { status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            orderBy: { expiresAt: "desc" },
            take: 1,
            select: { expiresAt: true },
          },
        },
      },
    },
  });

  for (const s of students) {
    let hasOD = false;
    let hasODK = false;
    let odkExpiresAt: Date | null = null;
    if (!s.userId) {
      hasOD = true; // legacy lead — assume OD
    } else if (s.user) {
      for (const t of s.user.odkUserAccessTags) {
        if (t.accessTag.service === "OD") hasOD = true;
        else if (t.accessTag.service === "ODK") {
          hasODK = true;
          if (t.expiresAt && (!odkExpiresAt || t.expiresAt > odkExpiresAt)) {
            odkExpiresAt = t.expiresAt;
          }
        }
      }
      const ent = s.user.odkEntitlements[0];
      if (ent?.expiresAt && (!odkExpiresAt || ent.expiresAt > odkExpiresAt)) {
        odkExpiresAt = ent.expiresAt;
      }
    }
    // Legacy OD signal: studentPackage enrollment
    if (s.packages.length > 0) hasOD = true;
    map.set(s.id, { studentId: s.id, hasOD, hasODK, odkExpiresAt });
  }
  return map;
}
