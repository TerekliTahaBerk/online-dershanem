import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { assertCoachOrTeacherAccess, loadPlanTaskForStaffMutation } from "@/lib/kocum/access-server";
import { appendTimelineEvent, recordPlanRevision } from "@/lib/kocum/server";
import { buildRevisionChangeSummary } from "@/lib/kocum";
import { istanbulDayStart } from "@/lib/istanbul-time";

const bodySchema = z.object({
  scheduledFor: z.string().datetime(),
  expectedPlanVersion: z.number().int().positive().optional(),
});

/**
 * Erişilebilir "Tarihi Değiştir" — drag & drop alternatifi.
 * Mutation sunucu tarafında yetki ve tarih doğrular.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("OK", "ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) {
    return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.kocum.task_reschedule",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-reschedule:${auth.session.userId}`,
    rateLimit: { max: 120, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz tarih." }, { status: 400 });
  }

  const task = await loadPlanTaskForStaffMutation(id);
  if (!task) return NextResponse.json({ error: "Görev bulunamadı." }, { status: 404 });

  const allowed = await assertCoachOrTeacherAccess({
    role: auth.session.role as "ADMIN" | "TEACHER",
    userId: auth.session.userId,
    studentProfileId: task.plan.studentId,
  });
  if (!allowed) return NextResponse.json({ error: "Bu öğrenci için yetkiniz yok." }, { status: 403 });

  if (
    parsed.data.expectedPlanVersion != null &&
    parsed.data.expectedPlanVersion !== task.plan.version
  ) {
    return NextResponse.json({ error: "Plan güncellenmiş. Sayfayı yenileyin." }, { status: 409 });
  }

  const scheduledFor = istanbulDayStart(new Date(parsed.data.scheduledFor));
  const nextVersion = task.plan.version + 1;

  await prisma.$transaction(async (tx) => {
    await tx.weeklyPlanTask.update({
      where: { id: task.id },
      data: { scheduledFor },
    });
    await tx.weeklyPlan.update({
      where: { id: task.planId },
      data: { version: nextVersion },
    });
  });

  await recordPlanRevision({
    planId: task.planId,
    version: nextVersion,
    changedById: auth.session.userId,
    changeSummary: buildRevisionChangeSummary({
      previousVersion: task.plan.version,
      nextVersion,
      actorLabel: auth.session.fullName || "Koç",
    }),
  });

  if (task.plan.status === "APPROVED") {
    await appendTimelineEvent({
      studentId: task.plan.studentId,
      kind: "PLAN_REVISED",
      title: "Plan güncellendi",
      summary: "Bir görevin tarihi öğretmen/koç tarafından değiştirildi.",
      visibility: "STUDENT",
    });
  }

  return NextResponse.json({ ok: true, scheduledFor: scheduledFor.toISOString(), version: nextVersion });
}
