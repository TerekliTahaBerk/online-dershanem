import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAccessibleProducts } from "@/lib/auth/products";
import {
  loadStudentHomeProductData,
  type StudentHomeProductData,
} from "@/lib/panel/student-home-data";
import { getActionableDinoInsight, type ActionableDinoInsight } from "@/lib/panel/dino-actionable-insight-server";

export type StudentHomeData = {
  products: Awaited<ReturnType<typeof getAccessibleProducts>>;
  profile: { id: string } | null;
  productData: StudentHomeProductData;
  dinoInsight: ActionableDinoInsight | null;
};

const emptyProductData: StudentHomeProductData = { OD: null, OK: null, ODK: null };

export async function getStudentHomeData(input: {
  userId: string;
  role: UserRole;
  now?: Date;
}): Promise<StudentHomeData> {
  const products = await getAccessibleProducts(input.userId, input.role);
  if (products.length === 0) return { products, profile: null, productData: emptyProductData, dinoInsight: null };

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!profile) return { products, profile: null, productData: emptyProductData, dinoInsight: null };

  const now = input.now ?? new Date();
  const [productData, dinoInsight] = await Promise.all([
    loadStudentHomeProductData({
      studentId: profile.id,
      products,
      now,
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
    }),
    getActionableDinoInsight({ studentId: profile.id, audience: "STUDENT", now }),
  ]);

  return { products, profile, productData, dinoInsight };
}
