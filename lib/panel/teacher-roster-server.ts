import "server-only";

import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { addIstanbulCalendarDays } from "@/lib/istanbul-time";
import { netScore } from "@/lib/goals";
import { planCompletionPercent } from "@/lib/panel/student-360";
import {
  buildTeacherRosterRows,
  filterTeacherRosterRows,
  parseTeacherRosterFilter,
  visibleTeacherRosterFilters,
  type TeacherRosterFilter,
  type TeacherRosterFlags,
  type TeacherRosterRow,
  type TeacherRosterSourceStudent,
} from "@/lib/panel/teacher-roster";

const DAY_MS = 24 * 60 * 60 * 1000;

function examTotalNet(sections: Array<{ correctCount: number; incorrectCount: number }>): number {
  return sections.reduce((sum, section) => sum + netScore(section.correctCount, section.incorrectCount), 0);
}

export async function getTeacherRoster(input: {
  teacherId: string;
  filterRaw?: string | string[];
  now?: Date;
}): Promise<{
  filter: TeacherRosterFilter;
  filters: TeacherRosterFilter[];
  rows: TeacherRosterRow[];
  totalCount: number;
  flags: TeacherRosterFlags;
}> {
  const now = input.now ?? new Date();
  const panelFlags = getPanelFeatureFlags();
  const flags: TeacherRosterFlags = {
    adaptivePlan: panelFlags.adaptivePlan,
    mockExamAnalysis: panelFlags.mockExamAnalysis,
    studentCheckIn: panelFlags.studentCheckIn,
  };
  const filter = parseTeacherRosterFilter(input.filterRaw);
  const since = new Date(now.getTime() - 14 * DAY_MS);
  const weekStart = planningWeekStart(now);
  const weekEnd = addIstanbulCalendarDays(weekStart, 7);
  const upcomingEnd = addIstanbulCalendarDays(now, 7);

  const groups = await prisma.group.findMany({
    where: { teacherId: input.teacherId, isActive: true },
    orderBy: { name: "asc" },
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

  const base = groups.flatMap((group) =>
    group.enrollments.map((enrollment) => ({
      studentId: enrollment.student.id,
      name: enrollment.student.user.fullName || enrollment.student.user.email,
      groupName: group.name,
    })),
  );
  const studentIds = [...new Set(base.map((row) => row.studentId))];

  if (!studentIds.length) {
    return {
      filter,
      filters: visibleTeacherRosterFilters(flags),
      rows: [],
      totalCount: 0,
      flags,
    };
  }

  const [lastLessons, absences, overdue, helpCounts, plans, exams, nextLessons] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        lesson: { teacherId: input.teacherId, status: { not: "CANCELLED" }, startsAt: { lte: now } },
      },
      orderBy: { lesson: { startsAt: "desc" } },
      distinct: ["studentId"],
      select: {
        studentId: true,
        lesson: { select: { startsAt: true, title: true } },
      },
    }),
    prisma.attendance.groupBy({
      by: ["studentId"],
      where: {
        studentId: { in: studentIds },
        status: "ABSENT",
        createdAt: { gte: since },
        lesson: { teacherId: input.teacherId },
      },
      _count: { _all: true },
    }),
    prisma.assignmentProgress.groupBy({
      by: ["studentId"],
      where: {
        studentId: { in: studentIds },
        status: { not: "DONE" },
        assignment: {
          isActive: true,
          dueAt: { lt: now },
          group: { teacherId: input.teacherId, isActive: true },
        },
      },
      _count: { _all: true },
    }),
    flags.studentCheckIn
      ? prisma.studentHelpRequest.groupBy({
          by: ["studentId"],
          where: {
            studentId: { in: studentIds },
            status: "OPEN",
            group: { teacherId: input.teacherId, isActive: true },
            checkIn: { shareWithTeacher: true },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    flags.adaptivePlan
      ? prisma.weeklyPlan.findMany({
          where: {
            studentId: { in: studentIds },
            weekStart: { gte: weekStart, lt: weekEnd },
            status: { in: ["DRAFT", "CHANGE_REQUESTED", "APPROVED"] },
          },
          select: {
            studentId: true,
            status: true,
            tasks: { where: { status: { not: "SKIPPED" } }, select: { status: true } },
          },
        })
      : Promise.resolve([]),
    flags.mockExamAnalysis
      ? prisma.mockExam.findMany({
          where: {
            studentId: { in: studentIds },
            takenAt: { gte: new Date(now.getTime() - 90 * DAY_MS) },
          },
          orderBy: { takenAt: "desc" },
          select: {
            studentId: true,
            takenAt: true,
            sections: { select: { correctCount: true, incorrectCount: true } },
          },
        })
      : Promise.resolve([]),
    prisma.lesson.findMany({
      where: {
        teacherId: input.teacherId,
        status: { not: "CANCELLED" },
        startsAt: { gte: now, lte: upcomingEnd },
        group: {
          isActive: true,
          enrollments: { some: { endedAt: null, studentId: { in: studentIds } } },
        },
      },
      orderBy: { startsAt: "asc" },
      select: {
        startsAt: true,
        group: {
          select: {
            enrollments: {
              where: { endedAt: null, studentId: { in: studentIds } },
              select: { studentId: true },
            },
          },
        },
      },
    }),
  ]);

  const lastByStudent = new Map(lastLessons.map((row) => [row.studentId, row]));
  const absenceByStudent = new Map(absences.map((row) => [row.studentId, row._count._all]));
  const overdueByStudent = new Map(overdue.map((row) => [row.studentId, row._count._all]));
  const helpByStudent = new Map(helpCounts.map((row) => [row.studentId, row._count._all]));
  const planByStudent = new Map(plans.map((row) => [row.studentId, row]));

  const examDeltaByStudent = new Map<string, number>();
  const examsByStudent = new Map<string, typeof exams>();
  for (const exam of exams) {
    const list = examsByStudent.get(exam.studentId) ?? [];
    list.push(exam);
    examsByStudent.set(exam.studentId, list);
  }
  for (const [studentId, list] of examsByStudent) {
    const ordered = [...list].sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    if (ordered.length < 2) continue;
    const latest = examTotalNet(ordered[0].sections);
    const previous = examTotalNet(ordered[1].sections);
    examDeltaByStudent.set(studentId, Math.round((previous - latest) * 10) / 10);
  }

  const nextByStudent = new Map<string, Date>();
  for (const lesson of nextLessons) {
    for (const enrollment of lesson.group.enrollments) {
      if (!nextByStudent.has(enrollment.studentId)) {
        nextByStudent.set(enrollment.studentId, lesson.startsAt);
      }
    }
  }

  const source: TeacherRosterSourceStudent[] = base.map((row) => {
    const plan = planByStudent.get(row.studentId);
    const done = plan?.tasks.filter((task) => task.status === "DONE").length ?? 0;
    const total = plan?.tasks.length ?? 0;
    const last = lastByStudent.get(row.studentId);
    return {
      studentId: row.studentId,
      name: row.name,
      groupName: row.groupName,
      lastLessonAt: last?.lesson.startsAt ?? null,
      lastLessonTitle: last?.lesson.title ?? null,
      absenceCount14d: absenceByStudent.get(row.studentId) ?? 0,
      overdueAssignmentCount: overdueByStudent.get(row.studentId) ?? 0,
      openHelpCount: helpByStudent.get(row.studentId) ?? 0,
      planStatus: plan?.status ?? null,
      planCompletionPercent: planCompletionPercent(done, total),
      planTaskTotal: total,
      examDelta: examDeltaByStudent.get(row.studentId) ?? null,
      nextLessonAt: nextByStudent.get(row.studentId) ?? null,
    };
  });

  const allRows = buildTeacherRosterRows(source, flags);
  return {
    filter,
    filters: visibleTeacherRosterFilters(flags),
    rows: filterTeacherRosterRows(allRows, filter),
    totalCount: allRows.length,
    flags,
  };
}
