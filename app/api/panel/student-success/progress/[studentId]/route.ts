import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import {
  getStudentProgressSummary,
  getStudentOutcomeProfile,
  getUnifiedActivityTimeline,
  getTeacherLearningSignals,
} from "@/lib/student-success/server/progress-server";
import {
  presentForAdmin,
  presentForParent,
  presentForStudent,
  presentForTeacher,
  presentOutcomeProfile,
} from "@/lib/student-success/presenters";
import type { ViewerRole } from "@/lib/student-success/types";

async function resolveStudentAccess(studentId: string, role: string, viewerUserId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { id: true, userId: true },
  });
  if (!profile) return null;

  if (role === "STUDENT" && profile.userId !== viewerUserId) return null;
  if (role === "PARENT") {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: viewerUserId, studentId, endedAt: null },
      select: { id: true },
    });
    if (!link) return null;
  }
  if (role === "TEACHER") {
    const access = await prisma.enrollment.findFirst({
      where: {
        studentId,
        endedAt: null,
        group: { teacherId: viewerUserId, isActive: true },
      },
      select: { id: true },
    });
    const coach = await prisma.coachAssignment.findFirst({
      where: { studentId, coach: { userId: viewerUserId }, endedAt: null },
      select: { id: true },
    });
    if (!access && !coach) return null;
  }

  return profile;
}

export async function GET(request: Request, context: { params: Promise<{ studentId: string }> }) {
  const auth = await requireApiOdRole("STUDENT", "TEACHER", "ADMIN", "PARENT");
  if (!auth.ok) return auth.response;

  const { studentId } = await context.params;
  const profile = await resolveStudentAccess(studentId, auth.session.role, auth.session.userId);
  if (!profile) return NextResponse.json({ error: "Erişim reddedildi." }, { status: 404 });

  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "summary";
  const role = auth.session.role as ViewerRole;
  const now = new Date();

  if (view === "outcomes") {
    const rows = await getStudentOutcomeProfile(studentId);
    return NextResponse.json({ outcomes: presentOutcomeProfile(rows, role), computedAt: now.toISOString() });
  }

  if (view === "timeline") {
    const timeline = await getUnifiedActivityTimeline(studentId);
    return NextResponse.json({ timeline, computedAt: now.toISOString() });
  }

  const summary = await getStudentProgressSummary({
    studentId,
    studentUserId: profile.userId,
    now,
  });

  if (role === "ADMIN") {
    return NextResponse.json({ summary: presentForAdmin(summary), computedAt: now.toISOString() });
  }
  if (role === "TEACHER") {
    const signals = await getTeacherLearningSignals({ studentId, now });
    return NextResponse.json({
      summary: presentForTeacher(
        summary,
        signals.flatMap((s) => s.signals),
        signals.map((s) => s.suggestion),
      ),
      learningSignals: signals,
      computedAt: now.toISOString(),
    });
  }
  if (role === "PARENT") {
    const focus = summary.risks.slice(0, 2);
    return NextResponse.json({
      summary: presentForParent({ summary, focusAreas: focus, nextWeek: summary.nextActions }),
      computedAt: now.toISOString(),
    });
  }

  return NextResponse.json({
    summary: presentForStudent(summary, 0, summary.nextActions[0] ?? null),
    computedAt: now.toISOString(),
  });
}
