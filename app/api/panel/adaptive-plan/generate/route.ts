import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { ADAPTIVE_PLAN_RULE_VERSION, buildAdaptiveWeek, planningWeekStart } from "@/lib/adaptive-plan";
import { collectPlanCandidates } from "@/lib/adaptive-plan-server";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

export async function POST(request: Request) {
  const auth = await requireApiRole("STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.adaptive_plan.generate", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:plan-generate:${auth.session.userId}`, rateLimit: { max: 12, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, include: { planPreference: true } });
  if (!profile) return NextResponse.json({ error: "Öğrenci profili bulunamadı." }, { status: 404 });
  const preference = profile.planPreference;
  if (!preference) return NextResponse.json({ error: "Önce uygun gün ve çalışma sürenizi seçin." }, { status: 400 });
  if (!preference.planningEnabled) return NextResponse.json({ error: "Haftalık plan tercihiniz kapalı." }, { status: 400 });
  const weekStart = planningWeekStart();
  const existing = await prisma.weeklyPlan.findUnique({ where: { studentId_weekStart: { studentId: profile.id, weekStart } }, include: { tasks: true } });
  if (existing?.status === "APPROVED") return NextResponse.json({ error: "Onaylı plan kilitli. Önce değişiklik isteyin." }, { status: 409 });
  const completedSources = new Set(existing?.tasks.filter((task) => task.status === "DONE").map((task) => `${task.sourceType}:${task.sourceReferenceId || task.title}`) || []);
  const candidates = (await collectPlanCandidates(profile.id, preference)).filter((item) => !completedSources.has(`${item.sourceType}:${item.sourceReferenceId || item.title}`));
  const availableDays = Array.isArray(preference.availableDays) ? preference.availableDays.filter((day): day is number => typeof day === "number") : [];
  const tasks = buildAdaptiveWeek({ now: new Date(), availableDays, minutesPerDay: preference.minutesPerDay, maxTasksPerDay: Math.min(3, preference.maxTasksPerDay), candidates });
  const plan = await prisma.$transaction(async (tx) => {
    const row = existing ? await tx.weeklyPlan.update({ where: { id: existing.id }, data: { status: "DRAFT", ruleVersion: ADAPTIVE_PLAN_RULE_VERSION, capacityMinutes: availableDays.length * preference.minutesPerDay, createdById: auth.session.userId, approvedById: null, approvedAt: null, changeRequestCategory: null, version: { increment: 1 }, generatedAt: new Date() } }) : await tx.weeklyPlan.create({ data: { studentId: profile.id, weekStart, ruleVersion: ADAPTIVE_PLAN_RULE_VERSION, capacityMinutes: availableDays.length * preference.minutesPerDay, createdById: auth.session.userId } });
    if (existing) await tx.weeklyPlanTask.updateMany({ where: { planId: row.id, status: "PLANNED" }, data: { status: "SKIPPED" } });
    if (tasks.length) await tx.weeklyPlanTask.createMany({ data: tasks.map((task) => ({ planId: row.id, ...task })) });
    return row;
  });
  await recordPanelProductEvent({ name: "plan_generated", properties: { ruleVersion: ADAPTIVE_PLAN_RULE_VERSION, taskCount: tasks.length, capacityMinutes: plan.capacityMinutes, reasonCount: new Set(tasks.map((task) => task.reasonCode)).size, rebalanced: Boolean(existing) } }, auth.session.role);
  return NextResponse.json({ id: plan.id, taskCount: tasks.length, rebalanced: Boolean(existing) });
}
