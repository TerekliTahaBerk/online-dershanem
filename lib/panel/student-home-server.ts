import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAccessibleProducts } from "@/lib/auth/products";
import {
  loadStudentHomeProductData,
  type StudentHomeProductData,
} from "@/lib/panel/student-home-data";

export type StudentHomeData = {
  products: Awaited<ReturnType<typeof getAccessibleProducts>>;
  profile: { id: string } | null;
  productData: StudentHomeProductData;
};

const emptyProductData: StudentHomeProductData = { OD: null, OK: null, ODK: null };

export async function getStudentHomeData(input: {
  userId: string;
  role: UserRole;
  now?: Date;
}): Promise<StudentHomeData> {
  const products = await getAccessibleProducts(input.userId, input.role);
  if (products.length === 0) return { products, profile: null, productData: emptyProductData };

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!profile) return { products, profile: null, productData: emptyProductData };

  const productData = await loadStudentHomeProductData({
    studentId: profile.id,
    products,
    now: input.now ?? new Date(),
    queries: {
      async listEnrollmentGroupIds(studentId) {
        const rows = await prisma.enrollment.findMany({
          where: { studentId, endedAt: null },
          select: { groupId: true },
        });
        return rows.map((row) => row.groupId);
      },
      async listTodayLessons(groupIds, dayStart, dayEnd) {
        const rows = await prisma.lesson.findMany({
          where: {
            groupId: { in: groupIds },
            startsAt: { gte: dayStart, lt: dayEnd },
            status: "PLANNED",
          },
          orderBy: { startsAt: "asc" },
          include: { group: true, teacher: { select: { fullName: true } } },
        });
        return rows.map((row) => ({
          id: row.id,
          startsAt: row.startsAt,
          title: row.title,
          teacherName: row.teacher.fullName,
          groupName: row.group.name,
        }));
      },
      async getNextRecoveryPackage(studentId) {
        const row = await prisma.recoveryPackage.findFirst({
          where: { studentId, status: "PUBLISHED" },
          orderBy: { dueAt: "asc" },
          select: { id: true, dueAt: true, lesson: { select: { title: true } } },
        });
        if (!row) return null;
        return { id: row.id, lessonTitle: row.lesson.title, dueAt: row.dueAt };
      },
      getWeeklyPlan(studentId) {
        return prisma.weeklyPlan.findFirst({
          where: { studentId },
          orderBy: { weekStart: "desc" },
          include: {
            tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] },
          },
        });
      },
      listRecentExams(studentId) {
        return prisma.mockExam.findMany({
          where: { studentId },
          orderBy: { takenAt: "desc" },
          take: 6,
          include: { sections: { orderBy: { position: "asc" } } },
        });
      },
    },
  });

  return { products, profile, productData };
}
