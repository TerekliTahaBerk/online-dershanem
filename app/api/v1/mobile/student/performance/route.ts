import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const student = await prisma.student.findFirst({
    where: { userId: auth.userId },
    select: { id: true },
  });
  if (!student) return jsonError(404, "STUDENT_NOT_FOUND", "Öğrenci kaydı bulunamadı.");

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [attendance, exams, completed, pending] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: student.id, sessionDate: { gte: weekAgo } },
      select: { status: true },
    }),
    prisma.studentExamResult.findMany({
      where: { studentId: student.id, takenAt: { gte: weekAgo } },
      select: { net: true },
    }),
    prisma.assignmentSubmission.count({
      where: {
        studentId: student.id,
        status: { in: ["SUBMITTED", "GRADED"] },
        submittedAt: { gte: weekAgo },
      },
    }),
    prisma.assignmentSubmission.count({
      where: { studentId: student.id, status: { in: ["PENDING", "LATE"] } },
    }),
  ]);

  const total = attendance.length;
  const present = attendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE",
  ).length;
  const attendancePercent = total > 0 ? Math.round((present / total) * 100) : null;
  const netSum = exams.reduce((acc, e) => acc + (e.net ? Number(e.net) : 0), 0);
  const weeklyNetAvg =
    exams.length > 0 ? Math.round((netSum / exams.length) * 100) / 100 : null;

  return NextResponse.json({
    data: {
      weeklyNetAvg,
      attendancePercent,
      completedAssignments: completed,
      pendingAssignments: pending,
      streakDays: 0, // dashboard'da hesaplanıyor; istersen burada da çağırabilirsin
      weeklyGoal: null,
    },
  });
}
