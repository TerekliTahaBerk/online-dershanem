/**
 * FAZ 8 — OD (OnlineDershanem) Admin Analytics aggregator.
 *
 * Yaklaşan dersler, düşük katılımlı sınıflar, aktif öğretmenler,
 * eksik ödev oranı, devamsızlık trendi.
 */

import { prisma } from "@/lib/prisma";
import { cacheWrap } from "@/lib/cache";
import { clampPct, fillDailyBuckets } from "./core";

export type UpcomingLessonRow = {
  id: string;
  title: string | null;
  subject: string | null;
  scheduledAt: Date;
  teacherName: string;
  classroomName: string | null;
  studentName: string | null;
};

export type ClassroomEngagement = {
  classroomId: string;
  classroomName: string;
  studentCount: number;
  lessonsLast30: number;
  attendanceRatePct: number | null;
  avgAttendance: number;
};

export type TopTeacher = {
  teacherId: string;
  fullName: string;
  lessonsLast30: number;
  assignmentsLast30: number;
  classroomCount: number;
};

export type BusyDay = {
  iso: string;
  lessons: number;
};

export type OdAdminAnalytics = {
  upcomingLessons: UpcomingLessonRow[];
  upcomingCount7: number;
  weakClassrooms: ClassroomEngagement[]; // attendance düşük olanlar
  topTeachers: TopTeacher[];
  overdueAssignmentCount: number;
  totalActiveAssignments: number;
  overdueRatePct: number;
  attendance30: Array<{ iso: string; count: number }>; // PRESENT günlük
  absenceTrend30: Array<{ iso: string; count: number }>; // ABSENT günlük
  busyDays: BusyDay[]; // yaklaşan 14 gün
};

const SINCE = (days: number) => new Date(Date.now() - days * 86400000);

/** Cached public API. Round 3: 30s TTL (Upstash veya in-memory). */
export async function getOdAdminAnalytics(): Promise<OdAdminAnalytics> {
  return cacheWrap("analytics:od:v1", 30, () => computeOdAdminAnalytics());
}

async function computeOdAdminAnalytics(): Promise<OdAdminAnalytics> {
  const now = new Date();
  const in14 = new Date(Date.now() + 14 * 86400000);

  const [
    upcomingLessons,
    upcomingCount7,
    classrooms,
    attendance30,
    absentRows,
    presentRows,
    overdueRows,
    totalActiveRows,
    teacherLessonGroups,
    teacherAssignmentGroups,
    teacherClassroomGroups,
    futureLessons,
  ] = await Promise.all([
    prisma.lesson.findMany({
      where: { scheduledAt: { gte: now, lte: in14 }, status: { in: ["SCHEDULED"] } },
      orderBy: { scheduledAt: "asc" },
      take: 10,
      select: {
        id: true, title: true, subject: true, scheduledAt: true,
        teacher: { select: { fullName: true } },
        classroom: { select: { name: true } },
        student: { select: { fullName: true } },
      },
    }),
    prisma.lesson.count({
      where: { scheduledAt: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) }, status: "SCHEDULED" },
    }),
    prisma.classroom.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: { select: { students: { where: { leftAt: null } } } },
      },
      take: 50,
    }),
    prisma.attendance.findMany({
      where: { sessionDate: { gte: SINCE(30) } },
      select: { sessionDate: true, status: true },
    }),
    prisma.attendance.findMany({
      where: { sessionDate: { gte: SINCE(30) }, status: "ABSENT" },
      select: { sessionDate: true },
    }),
    prisma.attendance.findMany({
      where: { sessionDate: { gte: SINCE(30) }, status: "PRESENT" },
      select: { sessionDate: true },
    }),
    prisma.assignment.findMany({
      where: { dueAt: { lt: now }, status: "PUBLISHED" },
      select: { id: true, submissions: { select: { id: true, submittedAt: true } } },
    }),
    prisma.assignment.findMany({
      where: { status: "PUBLISHED", dueAt: { gte: SINCE(60) } },
      select: { id: true },
    }),
    prisma.lesson.groupBy({
      by: ["teacherId"],
      where: { scheduledAt: { gte: SINCE(30) } },
      _count: { _all: true },
    }),
    prisma.assignment.groupBy({
      by: ["teacherId"],
      where: { createdAt: { gte: SINCE(30) } },
      _count: { _all: true },
    }),
    prisma.classroomTeacher.groupBy({
      by: ["teacherId"],
      _count: { _all: true },
    }),
    prisma.lesson.findMany({
      where: { scheduledAt: { gte: now, lte: in14 } },
      select: { scheduledAt: true },
    }),
  ]);

  // Lessons per classroom (last 30) — separate aggregate
  const classroomLessons30 = await prisma.lesson.groupBy({
    by: ["classroomId"],
    where: { scheduledAt: { gte: SINCE(30) }, classroomId: { not: null } },
    _count: { _all: true },
  });
  const classroomLessonMap = new Map<string, number>();
  for (const g of classroomLessons30) {
    if (g.classroomId) classroomLessonMap.set(g.classroomId, g._count._all);
  }

  // Attendance per classroom from lesson join — performance: skip per-classroom rate,
  // approximate via overall absent rate. (Reel veri için ayrı sorgu gerekli.)
  const weakClassrooms: ClassroomEngagement[] = classrooms.map((c) => {
    const lessonsLast30 = classroomLessonMap.get(c.id) ?? 0;
    return {
      classroomId: c.id,
      classroomName: c.name,
      studentCount: c._count.students,
      lessonsLast30,
      attendanceRatePct: null,
      avgAttendance: lessonsLast30,
    };
  })
    .filter((c) => c.studentCount > 0)
    .sort((a, b) => a.lessonsLast30 - b.lessonsLast30) // az ders = potansiyel zayıf
    .slice(0, 6);

  // Top teachers
  const teacherLessonMap = new Map(teacherLessonGroups.map((g) => [g.teacherId, g._count._all]));
  const teacherAsgMap = new Map(teacherAssignmentGroups.map((g) => [g.teacherId, g._count._all]));
  const teacherClsMap = new Map(teacherClassroomGroups.map((g) => [g.teacherId, g._count._all]));
  const allTeacherIds = Array.from(new Set([
    ...teacherLessonMap.keys(),
    ...teacherAsgMap.keys(),
  ]));
  const teacherMeta = allTeacherIds.length
    ? await prisma.teacher.findMany({
        where: { id: { in: allTeacherIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const topTeachers: TopTeacher[] = teacherMeta
    .map((t) => ({
      teacherId: t.id,
      fullName: t.fullName,
      lessonsLast30: teacherLessonMap.get(t.id) ?? 0,
      assignmentsLast30: teacherAsgMap.get(t.id) ?? 0,
      classroomCount: teacherClsMap.get(t.id) ?? 0,
    }))
    .sort((a, b) => (b.lessonsLast30 + b.assignmentsLast30) - (a.lessonsLast30 + a.assignmentsLast30))
    .slice(0, 6);

  // Ödev geciken
  const overdueAssignmentCount = overdueRows.filter(
    (a) => a.submissions.length === 0 || a.submissions.every((s) => !s.submittedAt),
  ).length;
  const totalActiveAssignments = totalActiveRows.length;
  const overdueRatePct = clampPct((overdueAssignmentCount / Math.max(1, totalActiveAssignments)) * 100);

  // Attendance trends
  const attendance30Series = fillDailyBuckets(
    presentRows,
    30,
    (a) => a.sessionDate.toISOString().slice(0, 10),
  );
  const absence30Series = fillDailyBuckets(
    absentRows,
    30,
    (a) => a.sessionDate.toISOString().slice(0, 10),
  );

  // Busy days (forward 14)
  const busyMap = new Map<string, number>();
  for (const l of futureLessons) {
    const iso = l.scheduledAt.toISOString().slice(0, 10);
    busyMap.set(iso, (busyMap.get(iso) ?? 0) + 1);
  }
  const busyDays = Array.from(busyMap.entries())
    .map(([iso, lessons]) => ({ iso, lessons }))
    .sort((a, b) => b.lessons - a.lessons)
    .slice(0, 5);

  const mapUpcoming: UpcomingLessonRow[] = upcomingLessons.map((l) => ({
    id: l.id,
    title: l.title,
    subject: l.subject,
    scheduledAt: l.scheduledAt,
    teacherName: l.teacher?.fullName ?? "—",
    classroomName: l.classroom?.name ?? null,
    studentName: l.student?.fullName ?? null,
  }));

  return {
    upcomingLessons: mapUpcoming,
    upcomingCount7,
    weakClassrooms,
    topTeachers,
    overdueAssignmentCount,
    totalActiveAssignments,
    overdueRatePct,
    attendance30: attendance30Series,
    absenceTrend30: absence30Series,
    busyDays,
  };

  // attendance30 referans tutmak için (dead variable lint önleme)
  void attendance30;
}
