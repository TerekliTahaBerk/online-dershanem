import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "PARENT" && auth.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Yetkisiz.");
  }

  const parent = await prisma.parent.findFirst({
    where: { userId: auth.userId },
    select: { id: true },
  });
  if (!parent && auth.role !== "ADMIN") {
    return jsonError(404, "PARENT_NOT_FOUND", "Veli kaydı yok.");
  }

  const { id } = await params;

  if (parent) {
    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: parent.id, studentId: id } },
    });
    if (!link && auth.role !== "ADMIN") {
      return jsonError(403, "FORBIDDEN", "Bu öğrenciye erişim yok.");
    }
  }

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, classLevel: true, status: true, email: true, phone: true,
    },
  });
  if (!student) return jsonError(404, "NOT_FOUND", "Öğrenci bulunamadı.");

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [attendance, exams, upcomingLessons, pendingAssignments] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: id, sessionDate: { gte: monthAgo } },
      select: { status: true, sessionDate: true },
    }),
    prisma.studentExamResult.findMany({
      where: { studentId: id, takenAt: { gte: monthAgo } },
      orderBy: { takenAt: "desc" },
      take: 10,
    }),
    prisma.lesson.findMany({
      where: { studentId: id, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { teacher: { select: { fullName: true } } },
    }),
    prisma.assignmentSubmission.count({
      where: { studentId: id, status: { in: ["PENDING", "LATE"] } },
    }),
  ]);

  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const recentWeek = attendance.filter((a) => a.sessionDate >= weekAgo);
  const recentPresent = recentWeek.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;

  return NextResponse.json({
    data: {
      student,
      stats: {
        attendancePercentMonth: total > 0 ? Math.round((present / total) * 100) : null,
        attendancePercentWeek:
          recentWeek.length > 0 ? Math.round((recentPresent / recentWeek.length) * 100) : null,
        pendingAssignments,
      },
      recentExams: exams.map((e) => ({
        id: e.id,
        title: e.title,
        net: e.net != null ? Number(e.net) : null,
        takenAt: e.takenAt.toISOString(),
      })),
      upcomingLessons: upcomingLessons.map((l) => ({
        id: l.id,
        title: l.title,
        scheduledAt: l.scheduledAt.toISOString(),
        teacher: l.teacher.fullName,
      })),
    },
  });
}
