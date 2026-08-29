import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { logAudit } from "@/lib/audit";

const schema = z.object({ expectedVersion: z.number().int().min(1), decision: z.enum(["APPROVE", "REQUEST_CHANGES"]), feedback: z.string().trim().min(2).max(1000), interactionDurationMs: z.number().int().min(0).max(30 * 60 * 1000), scores: z.array(z.object({ criterionId: z.string().min(1), level: z.enum(["NEEDS_WORK", "DEVELOPING", "MEETS"]) }).strict()).min(2).max(4) }).strict();
const MAX_AGE = 365 * 24 * 60 * 60 * 1000;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("TEACHER"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().assignmentEvidence) return NextResponse.json({ error: "Kanıtlı teslim henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.assignment-evidence.review", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:assignment-review:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Rubric ve geri bildirim alanlarını kontrol edin." }, { status: 400 }); const { id } = await context.params;
  const submission = await prisma.assignmentSubmission.findFirst({ where: { id, status: "SUBMITTED", assignment: { isActive: true, group: { teacherId: auth.session.userId, isActive: true } } }, include: { assignment: { include: { rubricCriteria: { orderBy: { position: "asc" } } } }, student: { include: { user: { select: { id: true } } } } } });
  if (!submission) return NextResponse.json({ error: "Değerlendirilecek teslim bulunamadı." }, { status: 404 });
  const enrollment = await prisma.enrollment.findFirst({ where: { groupId: submission.assignment.groupId, studentId: submission.studentId, endedAt: null }, select: { id: true } }); if (!enrollment) return NextResponse.json({ error: "Değerlendirilecek teslim bulunamadı." }, { status: 404 });
  const expectedIds = submission.assignment.rubricCriteria.map((item) => item.id).sort(); const scoreIds = [...new Set(parsed.data.scores.map((item) => item.criterionId))].sort();
  if (expectedIds.length !== scoreIds.length || expectedIds.some((value, index) => value !== scoreIds[index])) return NextResponse.json({ error: "Her rubric ölçütü tam bir kez değerlendirilmelidir." }, { status: 400 });
  const status = parsed.data.decision === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED"; const now = new Date();
  const changed = await prisma.$transaction(async (tx) => {
    const updated = await tx.assignmentSubmission.updateMany({ where: { id, status: "SUBMITTED", version: parsed.data.expectedVersion }, data: { status, feedback: parsed.data.feedback, reviewerId: auth.session.userId, reviewedAt: now, version: { increment: 1 } } }); if (updated.count !== 1) return false;
    await tx.assignmentRubricScore.createMany({ data: parsed.data.scores.map((score) => ({ submissionId: id, criterionId: score.criterionId, level: score.level })) });
    if (status === "APPROVED") await tx.assignmentProgress.update({ where: { assignmentId_studentId: { assignmentId: submission.assignmentId, studentId: submission.studentId } }, data: { status: "DONE", completedAt: now } });
    await tx.notification.create({ data: { userId: submission.student.user.id, type: "ASSIGNMENT", title: status === "APPROVED" ? "Çalışman onaylandı" : "Küçük bir yeniden deneme hazır", body: status === "APPROVED" ? "Rubric geri bildirimin hazır." : "Geri bildirimi inceleyip yeni bir deneme gönderebilirsin.", href: "/panel/ogrenci/odevler" } });
    return true;
  });
  if (!changed) return NextResponse.json({ error: "Teslim başka bir sekmede değerlendirildi." }, { status: 409 });
  await logAudit({ actorUserId: auth.session.userId, entityType: "AssignmentSubmission", entityId: id, action: status === "APPROVED" ? "assignment_submission.approved" : "assignment_submission.changes_requested", summary: "Kanıtlı çalışma rubric ile değerlendirildi", payload: { criterionCount: expectedIds.length, attemptNumber: submission.attemptNumber } });
  await recordPanelProductEvent({ name: "assignment_review_completed", properties: { decision: parsed.data.decision, turnaroundMs: Math.min(MAX_AGE, Math.max(0, now.getTime() - submission.submittedAt.getTime())), criterionCount: expectedIds.length, interactionDurationMs: parsed.data.interactionDurationMs, revisedAttempt: submission.attemptNumber > 1 } }, auth.session.role);
  return NextResponse.json({ reviewed: true, status });
}
