import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "PARENT" && auth.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Yetkisiz.");
  }

  const parent = await prisma.parent.findFirst({
    where: { userId: auth.userId },
    include: {
      students: {
        include: {
          student: {
            select: {
              id: true, fullName: true, classLevel: true, status: true,
            },
          },
        },
      },
    },
  });
  if (!parent) return jsonError(404, "PARENT_NOT_FOUND", "Veli kaydı yok.");

  const studentIds = parent.students.map((s) => s.studentId);
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);

  const [todayLessons, pendingPayments, recentExams] = await Promise.all([
    prisma.lesson.findMany({
      where: { studentId: { in: studentIds }, scheduledAt: { gte: startToday, lt: endToday } },
      orderBy: { scheduledAt: "asc" },
      include: {
        teacher: { select: { fullName: true } },
        student: { select: { id: true, fullName: true } },
      },
    }),
    prisma.odkOrder.count({ where: { userId: auth.userId, status: "PENDING" } }),
    prisma.studentExamResult.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { takenAt: "desc" },
      take: 5,
      include: { student: { select: { id: true, fullName: true } } },
    }),
  ]);

  return NextResponse.json({
    data: {
      parent: { id: parent.id, fullName: parent.fullName },
      children: parent.students.map((s) => ({
        id: s.student.id,
        fullName: s.student.fullName,
        classLevel: s.student.classLevel,
        status: s.student.status,
        relationship: s.relationship,
        isPrimary: s.isPrimary,
      })),
      todayLessons: todayLessons.map((l) => ({
        id: l.id,
        student: l.student,
        teacher: l.teacher.fullName,
        scheduledAt: l.scheduledAt.toISOString(),
        title: l.title,
        subject: l.subject,
        status: l.status,
      })),
      stats: { pendingPayments },
      recentExams: recentExams.map((e) => ({
        id: e.id,
        student: e.student,
        title: e.title,
        net: e.net != null ? Number(e.net) : null,
        takenAt: e.takenAt.toISOString(),
      })),
    },
  });
}
