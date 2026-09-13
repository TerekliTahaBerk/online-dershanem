import "server-only";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productLabel } from "@/lib/auth/roles";
import {
  GROUP_360_TABS,
  attendanceRate,
  daysBetween,
  deriveGroup360Issues,
  deriveMemberRisk,
  group360TabHref,
  parseGroup360Tab,
  summarizeGroup360Ops,
  visibleGroup360Actions,
  weeklyLessonCount,
  type Group360Action,
  type Group360MemberRisk,
  type Group360OpsSummary,
  type Group360Tab,
  type ScheduleConflictSignal,
} from "@/lib/panel/group-360";
import { findOpenGroupScheduleConflicts } from "@/lib/panel/lesson-lifecycle";

export type Group360Summary = {
  id: string;
  name: string;
  subject: string;
  level: string | null;
  isActive: boolean;
  capacity: number;
  activeStudentCount: number;
  teacher: { id: string; name: string; email: string; active: boolean };
  weeklyLessonCount: number;
  nextLesson: { id: string; title: string; startsAt: Date } | null;
  ops: Group360OpsSummary;
};

export type Group360OverviewTab = {
  upcomingLessons: Array<{
    id: string;
    title: string;
    startsAt: Date;
    status: string;
    teacherName: string;
  }>;
  capacity: { active: number; capacity: number; available: number };
  issues: Group360OpsSummary["issues"];
  seriesCount: number;
  assignmentCount: number;
};

export type Group360MemberRow = {
  studentId: string;
  userId: string;
  name: string;
  email: string;
  packages: string[];
  attendanceRate: number | null;
  risk: Group360MemberRisk;
  riskLabel: string;
  lastActivityAt: Date | null;
  enrolledAt: Date;
};

export type Group360StudentsTab = {
  members: Group360MemberRow[];
};

export type Group360ProgramTab = {
  weekly: Array<{
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    teacherName: string;
    seriesId: string | null;
    durationMinutes: number;
  }>;
  series: Array<{
    id: string;
    title: string;
    teacherName: string;
    isActive: boolean;
    upcomingCount: number;
  }>;
  conflicts: ScheduleConflictSignal[];
};

export type Group360HistoryTab = {
  completed: Array<{
    id: string;
    title: string;
    startsAt: Date;
    attendancePresent: number;
    attendanceTotal: number;
  }>;
  cancelled: Array<{ id: string; title: string; startsAt: Date }>;
  rescheduledHintCount: number;
  attendanceRate: number | null;
};

export type Group360OpsTab = {
  issues: Group360OpsSummary["issues"];
  unresolvedConflicts: ScheduleConflictSignal[];
  teachers: Array<{ id: string; name: string }>;
  meta: {
    name: string;
    subject: string;
    level: string;
    teacherId: string;
    isActive: boolean;
  };
};

export type Group360Bundle = {
  basePath: string;
  tab: Group360Tab;
  tabs: readonly Group360Tab[];
  actions: Group360Action[];
  summary: Group360Summary;
  targetGroups: Array<{
    id: string;
    name: string;
    subject: string;
    filled: number;
    capacity: number;
  }>;
  overview: Group360OverviewTab | null;
  students: Group360StudentsTab | null;
  program: Group360ProgramTab | null;
  history: Group360HistoryTab | null;
  opsTab: Group360OpsTab | null;
};

function displayName(user: { fullName: string | null; email: string }) {
  return user.fullName || user.email;
}

export async function loadGroup360Bundle(input: {
  groupId: string;
  tabRaw: string | string[] | undefined;
}): Promise<Group360Bundle> {
  const tab = parseGroup360Tab(input.tabRaw, GROUP_360_TABS);
  const now = new Date();
  const basePath = `/panel/yonetim/gruplar/${input.groupId}`;

  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
    select: {
      id: true,
      name: true,
      subject: true,
      level: true,
      capacity: true,
      isActive: true,
      teacherId: true,
      teacher: {
        select: { id: true, fullName: true, email: true, status: true },
      },
      enrollments: {
        where: { endedAt: null },
        select: {
          id: true,
          startedAt: true,
          studentId: true,
          student: {
            select: {
              id: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  lastLoginAt: true,
                  productMemberships: {
                    where: {
                      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                    },
                    select: { product: true },
                  },
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          lessonSeries: { where: { isActive: true } },
          assignments: true,
        },
      },
    },
  });
  if (!group) notFound();

  const [upcomingLessons, lastCompleted, plannedWindow, targetGroupsRaw, conflicts] =
    await Promise.all([
      prisma.lesson.findMany({
        where: { groupId: group.id, status: "PLANNED", startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 12,
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
          seriesId: true,
          teacher: { select: { fullName: true, email: true } },
        },
      }),
      prisma.lesson.findFirst({
        where: { groupId: group.id, status: "COMPLETED" },
        orderBy: { startsAt: "desc" },
        select: { startsAt: true },
      }),
      prisma.lesson.findMany({
        where: {
          groupId: group.id,
          status: { in: ["PLANNED", "COMPLETED"] },
          startsAt: {
            gte: new Date(now.getTime() - 7 * 86_400_000),
            lt: new Date(now.getTime() + 7 * 86_400_000),
          },
        },
        select: { startsAt: true },
      }),
      prisma.group.findMany({
        where: { isActive: true, id: { not: group.id } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          subject: true,
          capacity: true,
          enrollments: { where: { endedAt: null }, select: { id: true } },
        },
      }),
      prisma.$transaction((tx) => findOpenGroupScheduleConflicts(tx, group.id, now)),
    ]);

  // Hiç tamamlanan ders yok ama öğrenci varsa "stale" eşiğini aşmış say.
  const daysSinceLastCompleted = lastCompleted
    ? daysBetween(lastCompleted.startsAt, now)
    : group.enrollments.length > 0
      ? 30
      : null;

  const issues = deriveGroup360Issues({
    isActive: group.isActive,
    teacherActive: group.teacher.status === "ACTIVE",
    activeStudentCount: group.enrollments.length,
    capacity: group.capacity,
    upcomingPlannedCount: upcomingLessons.length,
    daysSinceLastCompletedLesson: daysSinceLastCompleted,
    openScheduleConflictCount: conflicts.length,
    now,
  });
  const ops = summarizeGroup360Ops(issues);

  const summary: Group360Summary = {
    id: group.id,
    name: group.name,
    subject: group.subject,
    level: group.level,
    isActive: group.isActive,
    capacity: group.capacity,
    activeStudentCount: group.enrollments.length,
    teacher: {
      id: group.teacher.id,
      name: displayName(group.teacher),
      email: group.teacher.email,
      active: group.teacher.status === "ACTIVE",
    },
    weeklyLessonCount: weeklyLessonCount(plannedWindow, now),
    nextLesson: upcomingLessons[0]
      ? {
          id: upcomingLessons[0].id,
          title: upcomingLessons[0].title,
          startsAt: upcomingLessons[0].startsAt,
        }
      : null,
    ops,
  };

  const actions = visibleGroup360Actions({ groupId: group.id, isActive: group.isActive });
  const targetGroups = targetGroupsRaw.map((item) => ({
    id: item.id,
    name: item.name,
    subject: item.subject,
    filled: item.enrollments.length,
    capacity: item.capacity,
  }));

  let overview: Group360OverviewTab | null = null;
  let students: Group360StudentsTab | null = null;
  let program: Group360ProgramTab | null = null;
  let history: Group360HistoryTab | null = null;
  let opsTab: Group360OpsTab | null = null;

  if (tab === "genel" || tab === "operasyon") {
    overview = {
      upcomingLessons: upcomingLessons.slice(0, 6).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        startsAt: lesson.startsAt,
        status: lesson.status,
        teacherName: displayName(lesson.teacher),
      })),
      capacity: {
        active: group.enrollments.length,
        capacity: group.capacity,
        available: Math.max(0, group.capacity - group.enrollments.length),
      },
      issues: ops.issues,
      seriesCount: group._count.lessonSeries,
      assignmentCount: group._count.assignments,
    };
  }

  if (tab === "ogrenciler") {
    students = await loadStudentsTab(group.enrollments, now);
  }

  if (tab === "program") {
    const series = await prisma.lessonSeries.findMany({
      where: { groupId: group.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        isActive: true,
        teacher: { select: { fullName: true, email: true } },
        lessons: {
          where: { status: "PLANNED", startsAt: { gte: now } },
          select: { id: true },
        },
      },
    });
    program = {
      weekly: upcomingLessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        startsAt: lesson.startsAt,
        endsAt: lesson.endsAt,
        teacherName: displayName(lesson.teacher),
        seriesId: lesson.seriesId,
        durationMinutes: Math.max(
          15,
          Math.round((lesson.endsAt.getTime() - lesson.startsAt.getTime()) / 60_000),
        ),
      })),
      series: series.map((item) => ({
        id: item.id,
        title: item.title,
        teacherName: displayName(item.teacher),
        isActive: item.isActive,
        upcomingCount: item.lessons.length,
      })),
      conflicts,
    };
  }

  if (tab === "gecmis") {
    const [completed, cancelled, attendanceAgg] = await Promise.all([
      prisma.lesson.findMany({
        where: { groupId: group.id, status: "COMPLETED" },
        orderBy: { startsAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          startsAt: true,
          attendances: { select: { status: true } },
        },
      }),
      prisma.lesson.findMany({
        where: { groupId: group.id, status: "CANCELLED" },
        orderBy: { startsAt: "desc" },
        take: 12,
        select: { id: true, title: true, startsAt: true },
      }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: {
          lesson: { groupId: group.id, status: "COMPLETED" },
        },
        _count: { _all: true },
      }),
    ]);
    const presentLike = attendanceAgg
      .filter((row) => row.status === "PRESENT" || row.status === "LATE" || row.status === "EXCUSED")
      .reduce((sum, row) => sum + row._count._all, 0);
    const totalAtt = attendanceAgg.reduce((sum, row) => sum + row._count._all, 0);
    history = {
      completed: completed.map((lesson) => {
        const total = lesson.attendances.length;
        const present = lesson.attendances.filter(
          (row) => row.status === "PRESENT" || row.status === "LATE",
        ).length;
        return {
          id: lesson.id,
          title: lesson.title,
          startsAt: lesson.startsAt,
          attendancePresent: present,
          attendanceTotal: total,
        };
      }),
      cancelled,
      rescheduledHintCount: 0,
      attendanceRate: attendanceRate(presentLike, totalAtt),
    };
  }

  if (tab === "operasyon") {
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    });
    opsTab = {
      issues: ops.issues,
      unresolvedConflicts: conflicts,
      teachers: teachers.map((teacher) => ({
        id: teacher.id,
        name: displayName(teacher),
      })),
      meta: {
        name: group.name,
        subject: group.subject,
        level: group.level || "",
        teacherId: group.teacherId,
        isActive: group.isActive,
      },
    };
  }

  return {
    basePath,
    tab,
    tabs: GROUP_360_TABS,
    actions,
    summary,
    targetGroups,
    overview,
    students,
    program,
    history,
    opsTab,
  };
}

async function loadStudentsTab(
  enrollments: Array<{
    startedAt: Date;
    studentId: string;
    student: {
      id: string;
      userId: string;
      user: {
        id: string;
        fullName: string | null;
        email: string;
        lastLoginAt: Date | null;
        productMemberships: Array<{ product: "OD" | "OK" | "ODK" }>;
      };
    };
  }>,
  now: Date,
): Promise<Group360StudentsTab> {
  if (!enrollments.length) return { members: [] };

  const studentIds = enrollments.map((row) => row.studentId);
  const since = new Date(now.getTime() - 14 * 86_400_000);

  const [attendanceRows, helpRows] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["studentId", "status"],
      where: {
        studentId: { in: studentIds },
        createdAt: { gte: since },
      },
      _count: { _all: true },
    }),
    prisma.studentHelpRequest.groupBy({
      by: ["studentId"],
      where: {
        studentId: { in: studentIds },
        status: { in: ["OPEN", "RESPONDED"] },
      },
      _count: { _all: true },
    }),
  ]);

  const attendanceMap = new Map<string, { absent: number; total: number; present: number }>();
  for (const row of attendanceRows) {
    const current = attendanceMap.get(row.studentId) || { absent: 0, total: 0, present: 0 };
    current.total += row._count._all;
    if (row.status === "ABSENT") current.absent += row._count._all;
    if (row.status === "PRESENT" || row.status === "LATE") current.present += row._count._all;
    attendanceMap.set(row.studentId, current);
  }
  const helpMap = new Map(helpRows.map((row) => [row.studentId, row._count._all]));

  return {
    members: enrollments.map((enrollment) => {
      const att = attendanceMap.get(enrollment.studentId) || {
        absent: 0,
        total: 0,
        present: 0,
      };
      const daysSinceLogin = enrollment.student.user.lastLoginAt
        ? daysBetween(enrollment.student.user.lastLoginAt, now)
        : null;
      const risk = deriveMemberRisk({
        attendanceAbsentCount14d: att.absent,
        attendanceTotalCount14d: att.total,
        daysSinceLastLogin: daysSinceLogin,
        openHelpRequestCount: helpMap.get(enrollment.studentId) || 0,
      });
      return {
        studentId: enrollment.student.id,
        userId: enrollment.student.userId,
        name: displayName(enrollment.student.user),
        email: enrollment.student.user.email,
        packages: enrollment.student.user.productMemberships.map((row) =>
          productLabel(row.product),
        ),
        attendanceRate: attendanceRate(att.present, att.total),
        risk: risk.level,
        riskLabel: risk.label,
        lastActivityAt: enrollment.student.user.lastLoginAt,
        enrolledAt: enrollment.startedAt,
      };
    }),
  };
}

export function group360Href(groupId: string, tab?: Group360Tab) {
  const base = `/panel/yonetim/gruplar/${groupId}`;
  return tab ? group360TabHref(base, tab) : base;
}
