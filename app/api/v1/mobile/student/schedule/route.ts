import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Önümüzdeki 14 günün ders programı (gün gün gruplu). */
export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const student = await prisma.student.findFirst({
    where: { userId: auth.userId },
    select: { id: true },
  });
  if (!student) return jsonError(404, "STUDENT_NOT_FOUND", "Öğrenci kaydı yok.");

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);

  const lessons = await prisma.lesson.findMany({
    where: { studentId: student.id, scheduledAt: { gte: start, lt: end } },
    orderBy: { scheduledAt: "asc" },
    include: {
      teacher: { select: { id: true, fullName: true } },
      classroom: { select: { id: true, name: true } },
    },
  });

  const groups = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const key = l.scheduledAt.toISOString().slice(0, 10);
    const arr = groups.get(key) ?? [];
    arr.push(l);
    groups.set(key, arr);
  }

  return NextResponse.json({
    data: Array.from(groups.entries()).map(([date, items]) => ({
      date,
      lessons: items.map((l) => ({
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
    })),
  });
}
