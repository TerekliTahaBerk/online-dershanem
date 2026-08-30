import "server-only";

import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import {
  loadTeacherAttentionInbox,
  type TeacherAttentionQueries,
} from "./teacher-attention";

export function createPrismaTeacherAttentionQueries(): TeacherAttentionQueries {
  return {
    async listRoster(teacherId) {
      const groups = await prisma.group.findMany({
        where: { teacherId, isActive: true },
        select: {
          name: true,
          enrollments: {
            where: { endedAt: null },
            select: {
              student: {
                select: {
                  id: true,
                  user: { select: { fullName: true, email: true } },
                },
              },
            },
          },
        },
      });
      return groups.flatMap((group) =>
        group.enrollments.map((enrollment) => ({
          id: enrollment.student.id,
          name: enrollment.student.user.fullName || enrollment.student.user.email,
          groupName: group.name,
        })),
      );
    },

    async listOpenHelp(teacherId) {
      const rows = await prisma.studentHelpRequest.findMany({
        where: {
          status: "OPEN",
          group: { teacherId, isActive: true },
          checkIn: { shareWithTeacher: true },
          student: {
            enrollments: {
              some: { endedAt: null, group: { teacherId, isActive: true } },
            },
          },
        },
        select: {
          id: true,
          studentId: true,
          createdAt: true,
          dueAt: true,
          group: { select: { name: true } },
          checkIn: { select: { barrier: true } },
        },
      });
      return rows.map((row) => ({
        id: row.id,
        studentId: row.studentId,
        groupName: row.group.name,
        barrier: row.checkIn.barrier,
        createdAt: row.createdAt,
        dueAt: row.dueAt,
      }));
    },

    async listPendingNotes(teacherId, now, since) {
      const rows = await prisma.lesson.findMany({
        where: {
          teacherId,
          startsAt: { lt: now, gte: since },
          notes: { none: { studentId: null } },
        },
        orderBy: { startsAt: "asc" },
        take: 6,
        select: {
          id: true,
          startsAt: true,
          group: { select: { name: true } },
        },
      });
      return rows.map((row) => ({
        id: row.id,
        groupName: row.group.name,
        startsAt: row.startsAt,
      }));
    },

    async countAbsences(teacherId, studentIds, since) {
      if (!studentIds.length) return [];
      const rows = await prisma.attendance.groupBy({
        by: ["studentId"],
        where: {
          status: "ABSENT",
          createdAt: { gte: since },
          studentId: { in: studentIds },
          lesson: { teacherId },
        },
        _count: { _all: true },
      });
      return rows.map((row) => ({ studentId: row.studentId, count: row._count._all }));
    },

    async countOverdueAssignments(teacherId, studentIds, now) {
      if (!studentIds.length) return [];
      const rows = await prisma.assignmentProgress.groupBy({
        by: ["studentId"],
        where: {
          studentId: { in: studentIds },
          status: { not: "DONE" },
          assignment: {
            isActive: true,
            dueAt: { lt: now },
            group: { teacherId, isActive: true },
          },
        },
        _count: { _all: true },
      });
      return rows.map((row) => ({ studentId: row.studentId, count: row._count._all }));
    },

    async listOpenInterventions(teacherId) {
      const rows = await prisma.interventionCase.findMany({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
          student: {
            enrollments: {
              some: { endedAt: null, group: { isActive: true, teacherId } },
            },
          },
        },
        select: {
          id: true,
          studentId: true,
          explanation: true,
          dueAt: true,
        },
      });
      return rows;
    },

    async listRecentExams(teacherId, studentIds, since) {
      if (!studentIds.length) return [];
      const rows = await prisma.mockExam.findMany({
        where: {
          studentId: { in: studentIds },
          takenAt: { gte: since },
          student: {
            enrollments: {
              some: { endedAt: null, group: { isActive: true, teacherId } },
            },
          },
        },
        select: {
          studentId: true,
          takenAt: true,
          sections: { select: { correctCount: true, incorrectCount: true } },
        },
        orderBy: { takenAt: "desc" },
      });
      return rows;
    },
  };
}

export async function getTeacherAttentionInbox(teacherId: string) {
  const flags = getPanelFeatureFlags();
  return loadTeacherAttentionInbox({
    teacherId,
    flags: {
      studentCheckIn: flags.studentCheckIn,
      interventionInbox: flags.interventionInbox,
      mockExamAnalysis: flags.mockExamAnalysis,
    },
    queries: createPrismaTeacherAttentionQueries(),
  });
}
