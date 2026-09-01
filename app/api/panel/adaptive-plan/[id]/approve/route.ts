import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { appendTimelineEvent, recordPlanRevision } from "@/lib/kocum/server";
import { buildRevisionChangeSummary } from "@/lib/kocum";

const schema = z.object({ expectedVersion: z.number().int().min(1) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("OK", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) {
    return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  }
  const guard = await guardMutation({
    action: "panel.adaptive_plan.approve",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:plan-approve:${auth.session.userId}`,
    rateLimit: { max: 80, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Plan sürümü geçersiz." }, { status: 400 });
  }
  const { id } = await context.params;
  const plan = await prisma.weeklyPlan.findFirst({
    where: {
      id,
      OR: [
        {
          student: {
            enrollments: {
              some: { endedAt: null, group: { isActive: true, teacherId: auth.session.userId } },
            },
          },
        },
        {
          student: {
            coachAssignments: {
              some: { endedAt: null, coach: { userId: auth.session.userId } },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      status: true,
      version: true,
      studentId: true,
      student: { select: { userId: true } },
      tasks: { where: { status: "PLANNED" }, select: { id: true } },
    },
  });
  if (!plan) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });
  if (plan.status !== "DRAFT") {
    return NextResponse.json({ error: "Yalnız taslak plan onaylanabilir." }, { status: 409 });
  }
  if (!plan.tasks.length) {
    return NextResponse.json({ error: "Görevi olmayan plan onaylanamaz." }, { status: 400 });
  }

  const updated = await prisma.weeklyPlan.updateMany({
    where: { id, version: parsed.data.expectedVersion, status: "DRAFT" },
    data: {
      status: "APPROVED",
      approvedById: auth.session.userId,
      approvedAt: new Date(),
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    return NextResponse.json({ error: "Plan başka bir sekmede değişti. Sayfayı yenileyin." }, { status: 409 });
  }

  const nextVersion = parsed.data.expectedVersion + 1;
  await recordPlanRevision({
    planId: plan.id,
    version: nextVersion,
    changedById: auth.session.userId,
    changeSummary: buildRevisionChangeSummary({
      previousVersion: parsed.data.expectedVersion,
      nextVersion,
      actorLabel: auth.session.fullName || "Koç",
    }),
  });

  await appendTimelineEvent({
    studentId: plan.studentId,
    kind: "PLAN_PUBLISHED",
    title: "Haftalık plan yayınlandı",
    summary: "Koçun haftalık planı onayladı.",
    visibility: "STUDENT",
  });

  const approvedPlan = await prisma.weeklyPlan.findUnique({
    where: { id: plan.id },
    select: { weekStart: true, tasks: { where: { status: "PLANNED" }, select: { id: true } } },
  });
  if (approvedPlan) {
    const { onCoachingPlanPublished } = await import("@/lib/student-success/server/emit-hooks");
    void onCoachingPlanPublished({
      planId: plan.id,
      studentId: plan.studentId,
      weekStart: approvedPlan.weekStart,
      taskCount: approvedPlan.tasks.length,
      actorUserId: auth.session.userId,
    });
  }

  return NextResponse.json({ approved: true });
}
