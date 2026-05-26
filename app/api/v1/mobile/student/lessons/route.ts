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

  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const to = toStr ? new Date(toStr) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const lessons = await prisma.lesson.findMany({
    where: {
      studentId: student.id,
      scheduledAt: { gte: from, lte: to },
    },
    orderBy: { scheduledAt: "asc" },
    take: 100,
    include: {
      teacher: { select: { id: true, fullName: true } },
      classroom: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    data: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      subject: l.subject,
      scheduledAt: l.scheduledAt.toISOString(),
      durationMinutes: l.duration,
      meetLink: l.meetingJoinUrl ?? l.googleMeetLink,
      meetingJoinUrl: l.meetingJoinUrl,
      meetingProvider: l.meetingProvider,
      startedAt: l.startedAt?.toISOString() ?? null,
      endedAt: l.endedAt?.toISOString() ?? null,
      teacher: l.teacher,
      classroom: l.classroom,
      status: l.status,
    })),
  });
}
