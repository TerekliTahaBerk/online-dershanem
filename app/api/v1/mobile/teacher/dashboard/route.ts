import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "TEACHER" && auth.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Yetkisiz.");
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId: auth.userId },
    select: { id: true, fullName: true },
  });
  if (!teacher) return jsonError(404, "TEACHER_NOT_FOUND", "Öğretmen kaydı yok.");

  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [todayLessons, pendingGrading, classroomCount, recentSubmissions] = await Promise.all([
    prisma.lesson.findMany({
      where: { teacherId: teacher.id, scheduledAt: { gte: startToday, lt: endToday } },
      orderBy: { scheduledAt: "asc" },
      include: {
        student: { select: { id: true, fullName: true } },
        classroom: { select: { id: true, name: true } },
      },
    }),
    prisma.assignmentSubmission.count({
      where: {
        assignment: { teacherId: teacher.id },
        status: { in: ["SUBMITTED", "LATE"] },
      },
    }),
    prisma.classroomTeacher.count({ where: { teacherId: teacher.id } }),
    prisma.assignmentSubmission.findMany({
      where: {
        assignment: { teacherId: teacher.id },
        submittedAt: { gte: weekAgo },
      },
      orderBy: { submittedAt: "desc" },
      take: 10,
      include: {
        student: { select: { id: true, fullName: true } },
        assignment: { select: { id: true, title: true } },
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      teacher: { id: teacher.id, fullName: teacher.fullName },
      todayLessons: todayLessons.map((l) => ({
        id: l.id,
        title: l.title,
        subject: l.subject,
        scheduledAt: l.scheduledAt.toISOString(),
        durationMinutes: l.duration,
        meetLink: l.googleMeetLink,
        student: l.student,
        classroom: l.classroom,
        status: l.status,
      })),
      stats: { pendingGrading, classroomCount },
      recentSubmissions: recentSubmissions.map((s) => ({
        id: s.id,
        student: s.student,
        assignment: s.assignment,
        status: s.status,
        submittedAt: s.submittedAt?.toISOString() ?? null,
      })),
    },
  });
}
