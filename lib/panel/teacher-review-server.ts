import "server-only";
import { prisma } from "@/lib/prisma";
import { operationDigest } from "./group-mutation-core";

export async function loadTeacherReview(teacherId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 86400000);
  const students = await prisma.studentProfile.findMany({
    where: {
      user: { status: "ACTIVE" },
      enrollments: {
        some: {
          endedAt: null,
          group: { teacherId: teacherId, isActive: true },
        },
      },
    },
    orderBy: { user: { fullName: "asc" } },
    include: {
      user: { select: { fullName: true, email: true } },
      enrollments: { where: { endedAt: null }, orderBy: { id: "asc" } },
      _count: { select: { reviewItems: { where: { status: "ACTIVE" } } } },
      reviewItems: {
        where: { status: "ACTIVE" },
        orderBy: { dueAt: "asc" },
        take: 60,
        include: {
          attempts: {
            where: { reviewedAt: { gte: since } },
            select: { reviewedAt: true, response: true },
          },
        },
      },
    },
  });
  const rows = students.map((student) => {
    const lastReviewed =
      student.reviewItems
        .flatMap((item) => item.attempts.map((attempt) => attempt.reviewedAt))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;
    const profile = { ...student, reviewItems: undefined, _count: undefined, user: undefined, enrollments: undefined };
    return {
      revision: operationDigest({ ...profile, user: student.user, enrollments: student.enrollments }),
      id: student.id,
      name: student.user.fullName || student.user.email,
      activeCount: student._count.reviewItems,
      dueCount: student.reviewItems.filter((item) => item.dueAt <= now).length,
      persistentCount: student.reviewItems.filter(
        (item) =>
          item.attempts.filter(
            (attempt) =>
              attempt.response === "WRONG" || attempt.response === "UNSURE",
          ).length >= 3,
      ).length,
      lastReviewedAt: lastReviewed?.toISOString() || null,
    };
  });
  return rows;
}
