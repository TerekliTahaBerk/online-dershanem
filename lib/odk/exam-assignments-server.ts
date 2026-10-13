import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Deneme atamaları + atama kaynak seçenekleri — web
 * `GET /api/odk/admin/exams/[id]/assignments` ve mobil K03b katılımcılar
 * sekmesi AYNI okuma (rotadan taşındı).
 */
export async function loadOdkExamAssignments(id: string) {
  const [assignments, groups, classLevels, packages, pilotRuns] = await Promise.all([
    prisma.odkExamAssignment.findMany({
      where: { examId: id },
      orderBy: { assignedAt: "desc" },
      include: { student: { select: { id: true, fullName: true, email: true } } },
      take: 2000,
    }),
    prisma.group.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, subject: true, _count: { select: { enrollments: { where: { endedAt: null } } } } },
      take: 200,
    }),
    prisma.studentProfile.findMany({
      where: { classLevel: { not: null }, user: { role: "STUDENT", status: "ACTIVE" } },
      select: { classLevel: true },
      distinct: ["classLevel"],
      take: 100,
    }),
    prisma.odkPackage.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
      take: 100,
    }),
    prisma.odkPilotRun.findMany({
      where: { status: { in: ["ACTIVE", "DRAFT"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, status: true },
      take: 50,
    }),
  ]);

  return {
    assignments: assignments.map((item) => ({
      id: item.id,
      studentUserId: item.studentUserId,
      studentName: item.student.fullName,
      studentEmail: item.student.email,
      source: item.source,
      sourceRefId: item.sourceRefId,
      snapshot: item.snapshot,
      isActive: item.isActive,
      assignedAt: item.assignedAt,
    })),
    options: {
      groups: groups.map((group) => ({ id: group.id, label: `${group.name} · ${group.subject}`, memberCount: group._count.enrollments })),
      classLevels: classLevels.map((row) => row.classLevel).filter(Boolean),
      packages,
      cohorts: pilotRuns,
    },
  };
}
