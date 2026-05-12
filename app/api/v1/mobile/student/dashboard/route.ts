import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TODAY_LIMIT = 15;
const NOTIF_LIMIT = 5;

/**
 * Öğrenci ana ekranı agregasyonu.
 *  - todayTasks: `StudentDailyTask` (mobil) + `Assignment` (PENDING/dueToday)
 *  - todayLessons: `Lesson` (status=SCHEDULED, today)
 *  - performance: `StudentMetricSnapshot` agregeleri
 *  - notifications: `InboxMessage` (son 5)
 */
export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  // Öğrenci kaydını bul (User → Student).
  const student = await prisma.student.findFirst({
    where: { userId: auth.userId },
    select: { id: true, fullName: true },
  });
  if (!student) return jsonError(404, "STUDENT_NOT_FOUND", "Öğrenci kaydı bulunamadı.");

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    user,
    dailyTasks,
    pendingAssignments,
    completedAssignmentsThisWeek,
    lessons,
    weeklyAttendance,
    weeklyExams,
    notifications,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, role: true },
    }),
    prisma.studentDailyTask.findMany({
      where: {
        studentId: student.id,
        OR: [
          { dueAt: null, isDone: false },
          { dueAt: { gte: startOfDay, lte: endOfDay } },
        ],
      },
      orderBy: [{ isDone: "asc" }, { dueAt: "asc" }],
      take: TODAY_LIMIT,
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        studentId: student.id,
        status: { in: ["PENDING", "LATE"] },
      },
      orderBy: { createdAt: "desc" },
      take: TODAY_LIMIT,
      include: {
        assignment: {
          select: { id: true, title: true, dueAt: true, subject: true },
        },
      },
    }),
    prisma.assignmentSubmission.count({
      where: {
        studentId: student.id,
        status: { in: ["SUBMITTED", "GRADED"] },
        submittedAt: { gte: weekAgo },
      },
    }),
    prisma.lesson.findMany({
      where: {
        studentId: student.id,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: "SCHEDULED",
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        teacher: { select: { id: true, fullName: true } },
        classroom: { select: { id: true, name: true } },
      },
    }),
    prisma.attendance.findMany({
      where: {
        studentId: student.id,
        sessionDate: { gte: weekAgo },
      },
      select: { status: true },
    }),
    prisma.studentExamResult.findMany({
      where: { studentId: student.id, takenAt: { gte: weekAgo } },
      select: { net: true },
    }),
    prisma.inboxMessage.findMany({
      where: { recipientUserId: auth.userId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: NOTIF_LIMIT,
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
        priority: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);

  // ── Performance agregeleri
  const totalAttendance = weeklyAttendance.length;
  const presentCount = weeklyAttendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE",
  ).length;
  const attendancePercent =
    totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null;

  const netSum = weeklyExams.reduce(
    (acc, e) => acc + (e.net ? Number(e.net) : 0),
    0,
  );
  const weeklyNetAvg =
    weeklyExams.length > 0
      ? Math.round((netSum / weeklyExams.length) * 100) / 100
      : null;

  // ── Streak (basit: ardışık gün, app_activity_logs'dan)
  const streakDays = await calcStreak(auth.userId);

  // ── Görev birleştirme: dailyTasks + pending assignments → tek liste
  const mergedTasks = [
    ...dailyTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      sourceType: t.sourceType,
      sourceId: t.sourceId,
      dueAt: t.dueAt?.toISOString() ?? null,
      isDone: t.isDone,
      doneAt: t.doneAt?.toISOString() ?? null,
    })),
    ...pendingAssignments.map((s) => ({
      id: `assign:${s.id}`,
      title: s.assignment.title,
      description: s.assignment.subject,
      sourceType: "ASSIGNMENT" as const,
      sourceId: s.assignment.id,
      dueAt: s.assignment.dueAt?.toISOString() ?? null,
      isDone: false,
      doneAt: null,
    })),
  ].slice(0, TODAY_LIMIT);

  return NextResponse.json({
    data: {
      user: { id: user!.id, name: user!.name ?? "", role: user!.role },
      todayTasks: mergedTasks,
      todayLessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        subject: l.subject,
        scheduledAt: l.scheduledAt.toISOString(),
        durationMinutes: l.duration,
        meetLink: l.googleMeetLink,
        teacher: l.teacher,
        classroom: l.classroom,
        status: l.status,
      })),
      performance: {
        weeklyNetAvg,
        attendancePercent,
        completedAssignments: completedAssignmentsThisWeek,
        pendingAssignments: pendingAssignments.length,
        streakDays,
        weeklyGoal: null,
      },
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        category: n.category,
        priority: n.priority,
        href: n.href,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      motivation: null,
    },
  });
}

/**
 * Basit streak hesabı: bugünden geriye, AppActivityLog "app_open" satırlarına
 * göre ardışık aktif gün sayısını döner.
 */
async function calcStreak(userId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  since.setHours(0, 0, 0, 0);

  const logs = await prisma.appActivityLog.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  if (logs.length === 0) return 0;

  const days = new Set<string>();
  for (const l of logs) {
    days.add(l.createdAt.toISOString().slice(0, 10));
  }

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
