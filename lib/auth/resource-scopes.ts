import type { Prisma, UserRole } from "@prisma/client";

/**
 * Nesne düzeyi erişim kuralları tek yerde tutulur. Bu sorgu kapsamları, rota
 * içinde kaydı önce kimlikle bulup sonra yetki kontrolü yapmaktan özellikle
 * kaçınır; yetkisiz ve bulunamayan kayıtlar aynı 404 davranışını üretir.
 */
export function learningMaterialAccessScope(
  role: UserRole,
  userId: string,
): Prisma.LearningMaterialWhereInput {
  switch (role) {
    case "ADMIN":
      return {};
    case "TEACHER":
      return { group: { teacherId: userId } };
    case "STUDENT":
      return {
        group: {
          enrollments: {
            some: { endedAt: null, student: { userId } },
          },
        },
      };
    case "PARENT":
      return {
        group: {
          enrollments: {
            some: {
              endedAt: null,
              student: { parents: { some: { parentId: userId } } },
            },
          },
        },
      };
  }
}

export function activeStudentEnrollmentScope(
  userId: string,
): Prisma.EnrollmentWhereInput {
  return { endedAt: null, student: { userId, user: { status: "ACTIVE" } } };
}

export function activeParentEnrollmentScope(
  parentId: string,
): Prisma.EnrollmentWhereInput {
  return {
    endedAt: null,
    student: {
      user: { status: "ACTIVE" },
      parents: { some: { parentId, parent: { status: "ACTIVE" } } },
    },
  };
}
