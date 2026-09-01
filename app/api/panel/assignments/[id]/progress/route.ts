import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "DONE"]), expectedVersion: z.number().int().min(0).optional(), mutationKey: z.string().uuid().optional() }).strict().superRefine((value, context) => {
  if ((value.expectedVersion === undefined) !== (value.mutationKey === undefined)) context.addIssue({ code: "custom", message: "Çevrimdışı sürüm bilgisi eksik." });
});
class AssignmentProgressConflict extends Error {}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = performance.now();
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;
  const recordFinished = (outcome: "success" | "validation" | "rejected" | "system_error", targetStatus: "TODO" | "IN_PROGRESS" | "DONE" | "UNKNOWN" = "UNKNOWN") => recordPanelProductEvent({ name: "student_assignment_progress_finished", properties: { durationMs: Math.round(performance.now() - startedAt), outcome, targetStatus } }, auth.session.role);
  const guard = await guardMutation({ action: "panel.assignments.progress", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:assignment-progress:${auth.session.userId}`, rateLimit: { max: 160, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) { await recordFinished("rejected"); return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 }); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) { await recordFinished("validation"); return NextResponse.json({ error: "Ödev durumu geçersiz." }, { status: 400 }); }
  const { id } = await context.params;
  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } });
  if (!profile) { await recordFinished("rejected", parsed.data.status); return NextResponse.json({ error: "Öğrenci profili bulunamadı." }, { status: 404 }); }
  const assignment = await prisma.assignment.findFirst({ where: { id, isActive: true, group: { enrollments: { some: { studentId: profile.id, endedAt: null } } } }, select: { id: true, evidenceRequired: true } });
  if (!assignment) { await recordFinished("rejected", parsed.data.status); return NextResponse.json({ error: "Ödev bulunamadı." }, { status: 404 }); }
  if (assignment.evidenceRequired && parsed.data.status === "DONE") { await recordFinished("validation", parsed.data.status); return NextResponse.json({ error: "Bu çalışma öğretmen onayından sonra tamamlanır; önce kanıtını gönder." }, { status: 409 }); }
  const existing = await prisma.assignmentProgress.findUnique({ where: { assignmentId_studentId: { assignmentId: id, studentId: profile.id } }, select: { version: true, lastMutationKey: true, status: true } });
  if (parsed.data.mutationKey && existing?.lastMutationKey === parsed.data.mutationKey) {
    await recordFinished("success", existing.status);
    return NextResponse.json({ ok: true, version: existing.version, replayed: true });
  }
  if (parsed.data.expectedVersion !== undefined && (existing?.version || 0) !== parsed.data.expectedVersion) {
    await recordFinished("rejected", parsed.data.status);
    return NextResponse.json({ error: "Ödev durumu başka bir sekmede değişti. Son durumu görüp yeniden seçin.", code: "ASSIGNMENT_PROGRESS_CONFLICT", latestVersion: existing?.version || 0 }, { status: 409 });
  }
  let version = existing?.version || 0;
  try {
    if (existing) {
      const updated = await prisma.assignmentProgress.updateMany({ where: { assignmentId: id, studentId: profile.id, ...(parsed.data.expectedVersion === undefined ? {} : { version: parsed.data.expectedVersion }) }, data: { status: parsed.data.status, completedAt: parsed.data.status === "DONE" ? new Date() : null, version: { increment: 1 }, lastMutationKey: parsed.data.mutationKey || null } });
      if (updated.count !== 1) throw new AssignmentProgressConflict();
      version = existing.version + 1;
    } else {
      const created = await prisma.assignmentProgress.create({ data: { assignmentId: id, studentId: profile.id, status: parsed.data.status, completedAt: parsed.data.status === "DONE" ? new Date() : null, lastMutationKey: parsed.data.mutationKey || null } });
      version = created.version;
    }
  } catch (error) {
    if (error instanceof AssignmentProgressConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      await recordFinished("rejected", parsed.data.status);
      return NextResponse.json({ error: "Ödev durumu başka bir sekmede değişti. Son durumu görüp yeniden seçin.", code: "ASSIGNMENT_PROGRESS_CONFLICT" }, { status: 409 });
    }
    await recordFinished("system_error", parsed.data.status);
    throw error;
  }
  await recordFinished("success", parsed.data.status);
  if (parsed.data.status === "DONE") {
    const progress = await prisma.assignmentProgress.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId: profile.id } },
      select: { id: true },
    });
    if (progress) {
      const { onAssignmentCompleted } = await import("@/lib/student-success/server/emit-hooks");
      void onAssignmentCompleted({
        assignmentId: id,
        progressId: progress.id,
        studentId: profile.id,
        actorUserId: auth.session.userId,
      });
    }
  }
  return NextResponse.json({ ok: true, version, replayed: false });
}
