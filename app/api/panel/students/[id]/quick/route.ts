/**
 * Quick endpoint that powers the StudentQuickDrawer.
 *
 *   GET /api/panel/students/:id/quick
 *
 * Permission policy:
 * - ADMIN: full access.
 * - TEACHER: only if the student is in any of their classrooms.
 * - PARENT: only if the student is linked via ParentStudent.
 * - STUDENT: only their own profile.
 *
 * Returns a narrow, drawer-friendly shape — never the full student record.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanelSession } from "@/lib/panel-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePanelSession();
  const { id } = await params;

  // ── Permission gate ─────────────────────────────────────────────────────
  if (ctx.actualRole === "STUDENT") {
    const own = await prisma.student.findFirst({
      where: { id, userId: ctx.userId }, select: { id: true },
    });
    if (!own) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  } else if (ctx.actualRole === "PARENT") {
    const link = await prisma.parentStudent.findFirst({
      where: { studentId: id, parent: { userId: ctx.userId } }, select: { studentId: true },
    });
    if (!link) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  } else if (ctx.actualRole === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: ctx.userId },
      select: { classrooms: { select: { classroomId: true } } },
    });
    const classroomIds = teacher?.classrooms.map((c) => c.classroomId) ?? [];
    const visible = await prisma.classroomStudent.findFirst({
      where: { studentId: id, classroomId: { in: classroomIds } },
      select: { studentId: true },
    });
    // Or 1:1 lessons with this teacher
    const direct = visible
      ? null
      : await prisma.lesson.findFirst({
          where: { studentId: id, teacher: { userId: ctx.userId } },
          select: { id: true },
        });
    if (!visible && !direct) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * 86400000);

  const [student, attendance30d, upcomingLessons, lastLessons, hwAggregates, parents, classrooms, tags] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, phone: true, email: true,
        city: true, district: true, schoolName: true,
        classLevel: true, examType: true, status: true,
        targetGoal: true, targetSchool: true, currentNet: true,
        notes: true, createdAt: true, updatedAt: true,
        userId: true,
      },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { studentId: id, sessionDate: { gte: since30d } },
      _count: { _all: true },
    }),
    prisma.lesson.findMany({
      where: { studentId: id, scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" }, take: 3,
      select: {
        id: true, scheduledAt: true, duration: true, status: true,
        title: true, subject: true,
        teacher: { select: { fullName: true } },
        course: { select: { title: true } },
        classroom: { select: { name: true } },
      },
    }),
    prisma.lesson.findMany({
      where: { studentId: id, scheduledAt: { lt: now } },
      orderBy: { scheduledAt: "desc" }, take: 3,
      select: {
        id: true, scheduledAt: true, status: true, title: true, subject: true,
        teacher: { select: { fullName: true } },
      },
    }),
    prisma.assignmentSubmission.groupBy({
      by: ["status"],
      where: { studentId: id },
      _count: { _all: true },
    }),
    prisma.parentStudent.findMany({
      where: { studentId: id },
      select: {
        relationship: true, isPrimary: true,
        parent: {
          select: {
            id: true, fullName: true, phone: true, email: true,
            user: { select: { id: true, createdAt: true } },
          },
        },
      },
    }),
    prisma.classroomStudent.findMany({
      where: { studentId: id, leftAt: null },
      select: { classroom: { select: { id: true, name: true, branch: true } } },
    }),
    prisma.studentTag.findMany({
      where: { studentId: id },
      select: { tag: { select: { id: true, key: true, label: true, color: true } } },
    }),
  ]);

  if (!student) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Attendance summary
  const att = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } as Record<string, number>;
  for (const r of attendance30d) att[r.status] = r._count._all;
  const attTotal = att.PRESENT + att.ABSENT + att.LATE + att.EXCUSED;
  const attRate = attTotal === 0 ? null : Math.round(((att.PRESENT + att.LATE) / attTotal) * 100);

  // Homework summary
  const hw = { PENDING: 0, SUBMITTED: 0, GRADED: 0, LATE: 0, MISSED: 0 } as Record<string, number>;
  for (const r of hwAggregates) hw[r.status] = r._count._all;

  return NextResponse.json({
    student,
    classrooms: classrooms.map((c) => c.classroom),
    parents: parents.map((p) => ({
      id: p.parent.id,
      fullName: p.parent.fullName,
      phone: p.parent.phone,
      email: p.parent.email,
      relationship: p.relationship,
      isPrimary: p.isPrimary,
      lastLoginAt: null,
      hasUser: !!p.parent.user,
      userCreatedAt: p.parent.user?.createdAt ?? null,
    })),
    tags: tags.map((t) => t.tag),
    attendance: { last30d: att, rate: attRate },
    homework: hw,
    upcomingLessons,
    lastLessons,
  });
}
