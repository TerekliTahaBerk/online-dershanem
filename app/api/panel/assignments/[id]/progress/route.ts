import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "DONE"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = performance.now();
  const auth = await requireApiRole("STUDENT");
  if (!auth.ok) return auth.response;
  const recordFinished = (outcome: "success" | "validation" | "rejected" | "system_error", targetStatus: "TODO" | "IN_PROGRESS" | "DONE" | "UNKNOWN" = "UNKNOWN") => recordPanelProductEvent({ name: "student_assignment_progress_finished", properties: { durationMs: Math.round(performance.now() - startedAt), outcome, targetStatus } }, auth.session.role);
  const guard = await guardMutation({ action: "panel.assignments.progress", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:assignment-progress:${auth.session.userId}`, rateLimit: { max: 160, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) { await recordFinished("rejected"); return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 }); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) { await recordFinished("validation"); return NextResponse.json({ error: "Ödev durumu geçersiz." }, { status: 400 }); }
  const { id } = await context.params;
  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } });
  if (!profile) { await recordFinished("rejected", parsed.data.status); return NextResponse.json({ error: "Öğrenci profili bulunamadı." }, { status: 404 }); }
  const assignment = await prisma.assignment.findFirst({ where: { id, isActive: true, group: { enrollments: { some: { studentId: profile.id, endedAt: null } } } }, select: { id: true } });
  if (!assignment) { await recordFinished("rejected", parsed.data.status); return NextResponse.json({ error: "Ödev bulunamadı." }, { status: 404 }); }
  try {
    await prisma.assignmentProgress.upsert({
      where: { assignmentId_studentId: { assignmentId: id, studentId: profile.id } },
      create: { assignmentId: id, studentId: profile.id, status: parsed.data.status, completedAt: parsed.data.status === "DONE" ? new Date() : null },
      update: { status: parsed.data.status, completedAt: parsed.data.status === "DONE" ? new Date() : null },
    });
  } catch (error) {
    await recordFinished("system_error", parsed.data.status);
    throw error;
  }
  await recordFinished("success", parsed.data.status);
  return NextResponse.json({ ok: true });
}
