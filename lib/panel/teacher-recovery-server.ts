import "server-only";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/prisma";
import { operationDigest } from "./group-mutation-core";

export async function loadTeacherRecovery(teacherId: string, prisma: PrismaClient = defaultDb) {
  const since = new Date(Date.now() - 30 * 86400000);
  const [attendances, packages] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        status: { in: ["ABSENT", "EXCUSED"] },
        lesson: {
          teacherId: teacherId,
          status: "COMPLETED",
          endsAt: { gte: since },
          group: { isActive: true },
        },
      },
      orderBy: { lesson: { endsAt: "desc" } },
      include: {
        lesson: {
          select: { id: true, groupId: true, title: true, endsAt: true,
            notes: { where: { studentId: null }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 1, select: { topic: true, nextGoal: true, homework: true } },
            materials: { where: { isActive: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 3, select: { id: true, title: true } },
            assignments: { where: { isActive: true }, orderBy: [{ dueAt: "asc" }, { id: "asc" }], take: 2, select: { id: true, title: true } },
          },
        },
        student: {
          include: {
            user: { select: { fullName: true, email: true } },
            enrollments: {
              where: { endedAt: null },
              orderBy: { id: "asc" },
              select: { groupId: true },
            },
          },
        },
      },
    }),
    prisma.recoveryPackage.findMany({
      where: {
        lesson: { teacherId: teacherId, endsAt: { gte: since } },
      },
      include: { items: { orderBy: { position: "asc" } } },
    }),
  ]);
  const packageMap = new Map(
    packages.map((item) => [`${item.lessonId}:${item.studentId}`, item]),
  );
  return attendances
    .filter((item) =>
      item.student.enrollments.some(
        (enrollment) => enrollment.groupId === item.lesson.groupId,
      ),
    )
    .map((item) => {
      const recovery = packageMap.get(`${item.lessonId}:${item.studentId}`);
      return {
        attendanceId: item.id,
        revision: operationDigest({ attendance: item, package: recovery ?? null }),
        studentName: item.student.user.fullName || item.student.user.email,
        lessonTitle: item.lesson.title,
        lessonDate: item.lesson.endsAt.toISOString(),
        status: item.status as "ABSENT" | "EXCUSED",
        package: recovery
          ? {
              id: recovery.id,
              status: recovery.status,
              version: recovery.version,
              summaryTopic: recovery.summaryTopic,
              summaryNextStep: recovery.summaryNextStep,
              checkpointPrompt: recovery.checkpointPrompt,
              dueAt: recovery.dueAt.toISOString(),
              items: recovery.items.map((row) => ({
                id: row.id,
                kind: row.kind,
                title: row.title,
              })),
            }
          : null,
      };
    });
}
