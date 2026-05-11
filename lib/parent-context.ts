import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Verilen userId üzerinden veliyi ve bağlı çocukları getirir.
 * Parent panel sayfalarında ortak helper.
 */
export async function getParentWithChildren(userId: string) {
  const parent = await prisma.parent.findUnique({
    where: { userId },
    include: {
      students: {
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              classLevel: true,
              examType: true,
              status: true,
              schoolName: true,
            },
          },
        },
      },
    },
  });
  if (!parent) return null;
  const childIds = parent.students.map((ps) => ps.studentId);
  return { parent, childIds };
}
