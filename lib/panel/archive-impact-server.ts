import "server-only";

import { prisma } from "@/lib/prisma";
import {
  summarizeArchiveImpact,
  type ArchiveImpactBucket,
  type ArchiveImpactSummary,
} from "@/lib/panel/archive-impact";

export async function buildUserArchiveImpact(userId: string): Promise<ArchiveImpactSummary | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      studentProfile: { select: { id: true } },
      teacherProfile: { select: { id: true } },
    },
  });
  if (!user) return null;

  const now = new Date();
  const buckets: ArchiveImpactBucket[] = [];

  if (user.role === "STUDENT" && user.studentProfile) {
    const studentId = user.studentProfile.id;
    const [
      upcomingLessons,
      assignments,
      parents,
      teachers,
      memberships,
      odkEntitlements,
      odOrders,
    ] = await Promise.all([
      prisma.lesson.count({
        where: {
          status: "PLANNED",
          startsAt: { gte: now },
          group: { enrollments: { some: { studentId, endedAt: null } } },
        },
      }),
      prisma.assignmentProgress.count({
        where: { studentId, status: { in: ["TODO", "IN_PROGRESS"] } },
      }),
      prisma.parentStudent.count({ where: { studentId, active: true } }),
      prisma.studentTeacherAssignment.count({ where: { studentId, active: true } }),
      prisma.productMembership.count({
        where: { userId, revokedAt: null },
      }),
      prisma.odkEntitlement.count({ where: { userId } }),
      prisma.odOrder.count({ where: { userId } }),
    ]);

    buckets.push(
      { key: "upcoming_lessons", label: "Yaklaşan dersler", count: upcomingLessons, severity: upcomingLessons ? "blocking" : "info" },
      { key: "open_assignments", label: "Açık ödevler", count: assignments, severity: assignments ? "warning" : "info" },
      { key: "parents", label: "Veli ilişkileri", count: parents, severity: parents ? "warning" : "info" },
      { key: "teachers", label: "Öğretmen ilişkileri", count: teachers, severity: teachers ? "warning" : "info" },
      { key: "packages", label: "Ürün / paketler", count: memberships + odkEntitlements, severity: memberships || odkEntitlements ? "blocking" : "info" },
      { key: "finance", label: "Finans kayıtları", count: odOrders, severity: odOrders ? "blocking" : "info" },
    );
  }

  if (user.role === "TEACHER") {
    const [students, groups, futureLessons, openAssignments] = await Promise.all([
      prisma.studentTeacherAssignment.count({ where: { teacherId: userId, active: true } }),
      prisma.group.count({ where: { teacherId: userId, isActive: true } }),
      prisma.lesson.count({
        where: { teacherId: userId, status: "PLANNED", startsAt: { gte: now } },
      }),
      prisma.assignment.count({
        where: { createdById: userId, isActive: true, dueAt: { gte: now } },
      }),
    ]);
    buckets.push(
      { key: "active_students", label: "Aktif öğrenciler", count: students, severity: students ? "blocking" : "info" },
      { key: "groups", label: "Gruplar", count: groups, severity: groups ? "blocking" : "info" },
      { key: "future_lessons", label: "Gelecekteki dersler", count: futureLessons, severity: futureLessons ? "blocking" : "info" },
      { key: "open_assignments", label: "Açık ödevler", count: openAssignments, severity: openAssignments ? "warning" : "info" },
    );
  }

  if (user.role === "PARENT") {
    const linked = await prisma.parentStudent.count({ where: { parentId: userId, active: true } });
    buckets.push({
      key: "children",
      label: "Bağlı öğrenciler",
      count: linked,
      severity: linked ? "blocking" : "info",
    });
  }

  return summarizeArchiveImpact({
    userId: user.id,
    role: user.role,
    buckets,
  });
}
