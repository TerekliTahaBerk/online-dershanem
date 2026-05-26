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
    select: { id: true },
  });
  if (!teacher) return jsonError(404, "TEACHER_NOT_FOUND", "Öğretmen kaydı yok.");

  const url = new URL(req.url);
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from") as string)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const to = url.searchParams.get("to")
    ? new Date(url.searchParams.get("to") as string)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const lessons = await prisma.lesson.findMany({
    where: { teacherId: teacher.id, scheduledAt: { gte: from, lte: to } },
    orderBy: { scheduledAt: "asc" },
    take: 200,
    include: {
      student: { select: { id: true, fullName: true } },
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
      meetingHostUrl: l.meetingHostUrl,
      meetingProvider: l.meetingProvider,
      startedAt: l.startedAt?.toISOString() ?? null,
      endedAt: l.endedAt?.toISOString() ?? null,
      student: l.student,
      classroom: l.classroom,
      status: l.status,
    })),
  });
}
