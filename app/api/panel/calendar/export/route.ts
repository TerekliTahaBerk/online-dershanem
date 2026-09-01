import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { icalDocument } from "@/lib/ical";
import { getStudentCalendar } from "@/lib/student-success/server/calendar-server";
import { unifiedEventsToIcal, mergeIcalEvents } from "@/lib/student-success/ical-bridge";

export async function GET(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER", "STUDENT", "PARENT");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const now = Date.now();
  const range = { gte: new Date(now - 30 * 86400000), lte: new Date(now + 180 * 86400000) };
  let where: Prisma.LessonWhereInput = { startsAt: range };

  if (auth.session.role === "TEACHER") where = { teacherId: auth.session.userId, startsAt: range };
  let studentProfileId: string | null = null;
  let studentUserId: string | null = null;

  if (auth.session.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true, userId: true } });
    studentProfileId = profile?.id ?? null;
    studentUserId = profile?.userId ?? null;
    where = profile ? { startsAt: range, group: { enrollments: { some: { studentId: profile.id, endedAt: null } } } } : { id: "__missing_student_profile__" };
  }
  if (auth.session.role === "PARENT") {
    const links = await prisma.parentStudent.findMany({ where: { parentId: auth.session.userId }, orderBy: { createdAt: "asc" }, select: { studentId: true, student: { select: { userId: true } } } });
    const requested = url.searchParams.get("studentId");
    const selected = requested ? links.find((item) => item.studentId === requested) : links[0];
    if (!selected) return NextResponse.json({ error: "Bağlı öğrenci bulunamadı." }, { status: 404 });
    studentProfileId = selected.studentId;
    studentUserId = selected.student.userId;
    where = { startsAt: range, group: { enrollments: { some: { studentId: selected.studentId, endedAt: null } } } };
  }

  const lessons = await prisma.lesson.findMany({ where, orderBy: { startsAt: "asc" }, include: { group: { select: { name: true, subject: true } }, teacher: { select: { fullName: true, email: true } } } });
  const includeMeetingUrl = auth.session.role === "ADMIN" || auth.session.role === "TEACHER";
  const lessonEvents = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: `${lesson.group.name} · ${lesson.group.subject} · ${lesson.teacher.fullName || lesson.teacher.email}`,
    startsAt: lesson.startsAt,
    endsAt: lesson.endsAt,
    cancelled: lesson.status === "CANCELLED",
    url: includeMeetingUrl ? lesson.meetingUrl : null,
  }));

  let unifiedEvents: ReturnType<typeof unifiedEventsToIcal> = [];
  if (studentProfileId && studentUserId && (auth.session.role === "STUDENT" || auth.session.role === "PARENT")) {
    const events = await getStudentCalendar({
      studentId: studentProfileId,
      studentUserId,
      from: range.gte,
      to: range.lte,
      include: ["assignments", "coachingTasks", "mockExams"],
    });
    unifiedEvents = unifiedEventsToIcal(events, false);
  }

  const calendar = icalDocument(
    mergeIcalEvents(lessonEvents, unifiedEvents),
    new Date(),
  );

  return new NextResponse(calendar, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": "attachment; filename=online-dershanem-takvim.ics", "Cache-Control": "private, no-store, max-age=0" } });
}
