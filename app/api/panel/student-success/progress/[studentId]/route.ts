import { NextResponse } from "next/server";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { resolveStudentScopeForViewer } from "@/lib/student-success/server/viewer-scope";
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
import { z } from "zod";
import { studentIdParamsSchema, invalidApiInput } from "@/lib/api/input-validation";

const querySchema = z.object({ view: z.enum(["summary", "outcomes", "timeline"]).default("summary") });

export async function GET(request: Request, context: { params: Promise<{ studentId: string }> }) {
  const auth = await requireApiOdRole("STUDENT", "TEACHER", "ADMIN", "PARENT");
  if (!auth.ok) return auth.response;

  const routeParams = studentIdParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { studentId } = routeParams.data;
  // Kapsam kararı `viewer-scope` ile ORTAK. Buradaki yerel kopya, kardeş takvim
  // uç noktasıyla birlikte güncellenmiyordu.
  const profile = await resolveStudentScopeForViewer(studentId, auth.session.role, auth.session.userId);
  if (!profile) return NextResponse.json({ error: "Erişim reddedildi." }, { status: 404 });

  const url = new URL(request.url);
  const query = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) return invalidApiInput("Geçersiz ilerleme görünümü.");
  const view = query.data.view;
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
