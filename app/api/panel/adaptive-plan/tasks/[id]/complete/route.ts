import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { appendTimelineEvent } from "@/lib/kocum/server";
import { istanbulDayStart } from "@/lib/istanbul-time";

/**
 * Tek adımlı tamamlama — yalnız `PLANNED` görevi `DONE` yapar.
 *
 * Zengin tamamlama (gerçekleşen soru/süre, kısmi tamamlama, düzeltme)
 * `/api/panel/kocum/tasks/[id]/complete` ucundadır ve durum makinesini orada
 * uygular. Buradaki `status: "PLANNED"` koşulu aynı makinenin daha dar bir
 * dilimidir: tamamlanmış görev 404 döner, dolayısıyla çift tamamlama olmaz.
 * Zaman çizelgesi kaydı İKİ uçta da yazılır — yoksa hangi ucun kullanıldığına
 * göre öğrencinin geçmişi eksik kalıyordu.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("OK", "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.adaptive_plan.task_complete", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:plan-task:${auth.session.userId}`, rateLimit: { max: 120, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const task = await prisma.weeklyPlanTask.findFirst({ where: { id, status: "PLANNED", plan: { status: "APPROVED", student: { userId: auth.session.userId } } }, select: { id: true, sourceType: true, sourceReferenceId: true, reasonCode: true, plan: { select: { studentId: true } } } });
  if (!task) return NextResponse.json({ error: "Plan görevi bulunamadı." }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.weeklyPlanTask.update({ where: { id: task.id }, data: { status: "DONE", completedAt: new Date() } });
    if (task.sourceType === "ASSIGNMENT" && task.sourceReferenceId) await tx.assignmentProgress.updateMany({ where: { assignmentId: task.sourceReferenceId, studentId: task.plan.studentId }, data: { status: "DONE", completedAt: new Date() } });
  });
  await appendTimelineEvent({
    studentId: task.plan.studentId,
    kind: "PLAN_COMPLETION",
    title: "Görev tamamlandı",
    visibility: "STAFF",
    metadata: { taskId: task.id, status: "DONE" },
    occurredAt: istanbulDayStart(new Date()),
  });
  await recordPanelProductEvent({ name: "plan_task_completed", properties: { sourceType: task.sourceType, reasonCode: task.reasonCode } }, auth.session.role);
  await recordPanelProductEvent({
    name: "student_next_action_completed",
    properties: {
      product: "OK",
      actionKind: "COMPLETE_PLAN_TASK",
      reasonCode: task.reasonCode,
      ageBand: "NA",
      evidenceBand: "NA",
      role: "STUDENT",
    },
  }, auth.session.role);
  return NextResponse.json({ completed: true });
}
