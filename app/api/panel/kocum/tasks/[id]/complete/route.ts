import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import {
  assignmentProgressStatusFor,
  shouldSyncAssignmentProgress,
  validateTaskCompletion,
  type KocumTaskStatus,
} from "@/lib/kocum";
import { loadPlanTaskForStudentMutation } from "@/lib/kocum/access-server";
import { appendTimelineEvent } from "@/lib/kocum/server";
import { istanbulDayStart } from "@/lib/istanbul-time";

const bodySchema = z.object({
  status: z.enum(["IN_PROGRESS", "DONE", "PARTIAL", "COULD_NOT"]),
  actualQuestions: z.number().int().min(0).max(500).optional().nullable(),
  actualCorrect: z.number().int().min(0).max(500).optional().nullable(),
  actualIncorrect: z.number().int().min(0).max(500).optional().nullable(),
  actualBlank: z.number().int().min(0).max(500).optional().nullable(),
  actualMinutes: z.number().int().min(0).max(720).optional().nullable(),
  studentNote: z.string().trim().max(500).optional().nullable(),
  difficultyFelt: z.number().int().min(1).max(5).optional().nullable(),
  energyFelt: z.number().int().min(1).max(5).optional().nullable(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("OK", "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) {
    return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.kocum.task_complete",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-task:${auth.session.userId}`,
    rateLimit: { max: 120, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const { id } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const validationError = validateTaskCompletion(parsed.data);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const task = await loadPlanTaskForStudentMutation(id, auth.session.userId);
  if (!task) {
    return NextResponse.json({ error: "Plan görevi bulunamadı." }, { status: 404 });
  }
  if (task.status === "SKIPPED") {
    return NextResponse.json({ error: "Bu görev yeniden planlanacak durumda." }, { status: 409 });
  }

  const nextStatus = parsed.data.status as KocumTaskStatus;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.weeklyPlanTask.update({
      where: { id: task.id },
      data: {
        status: nextStatus,
        startedAt: nextStatus === "IN_PROGRESS" || !task.status || task.status === "PLANNED" ? now : undefined,
        completedAt: nextStatus === "DONE" || nextStatus === "PARTIAL" || nextStatus === "COULD_NOT" ? now : null,
        actualQuestions: parsed.data.actualQuestions ?? null,
        actualCorrect: parsed.data.actualCorrect ?? null,
        actualIncorrect: parsed.data.actualIncorrect ?? null,
        actualBlank: parsed.data.actualBlank ?? null,
        actualMinutes: parsed.data.actualMinutes ?? null,
        studentNote: parsed.data.studentNote ?? null,
        difficultyFelt: parsed.data.difficultyFelt ?? null,
        energyFelt: parsed.data.energyFelt ?? null,
      },
    });

    if (
      shouldSyncAssignmentProgress(task.sourceType, task.sourceReferenceId, nextStatus) &&
      task.sourceReferenceId
    ) {
      const progressStatus = assignmentProgressStatusFor(nextStatus);
      if (progressStatus) {
        await tx.assignmentProgress.updateMany({
          where: { assignmentId: task.sourceReferenceId, studentId: task.plan.studentId },
          data: {
            status: progressStatus,
            completedAt: progressStatus === "DONE" ? now : null,
          },
        });
      }
    }
  });

  if (nextStatus === "DONE" || nextStatus === "PARTIAL") {
    await appendTimelineEvent({
      studentId: task.plan.studentId,
      kind: "PLAN_COMPLETION",
      title: nextStatus === "DONE" ? "Görev tamamlandı" : "Görev kısmen tamamlandı",
      visibility: "STAFF",
      metadata: { taskId: task.id, status: nextStatus },
      occurredAt: istanbulDayStart(now),
    });
  }

  await recordPanelProductEvent(
    {
      name: "plan_task_completed",
      properties: { sourceType: task.sourceType, reasonCode: "CAPACITY_BALANCE" },
    },
    auth.session.role,
  );

  return NextResponse.json({ completed: true, status: nextStatus });
}
