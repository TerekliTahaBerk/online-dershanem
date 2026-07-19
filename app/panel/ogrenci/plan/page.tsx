import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { StudentAdaptivePlan } from "@/components/panel/student-adaptive-plan";

export const dynamic = "force-dynamic";
export default async function StudentPlanPage() {
  const session = await requireRole("STUDENT"); if (!getPanelFeatureFlags().adaptivePlan) notFound();
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, include: { planPreference: true, weeklyPlans: { where: { weekStart: planningWeekStart() }, take: 1, include: { tasks: { where: { status: { not: "SKIPPED" } }, orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } } } } });
  if (!profile) return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><PanelEmptyState title="Plan profiliniz hazırlanıyor." body="Öğrenci profiliniz tamamlandığında uygun günlerinizi seçebilirsiniz." /></PanelShell>;
  const preference = profile.planPreference;
  const plan = profile.weeklyPlans[0] || null;
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><ListChecks size={15} /> Kapasitene göre küçük adımlar</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Bugün en fazla üç iş.</h1><p className="mt-2 text-sm leading-6 text-[var(--site-body)]">Plan kaçan işleri borç gibi biriktirmez. Uygun günlerine yeniden yerleştirir ve öğretmenin onayından sonra kesinleşir.</p></header><div className="mt-7"><StudentAdaptivePlan initialPreference={{ availableDays: Array.isArray(preference?.availableDays) ? preference.availableDays.filter((day): day is number => typeof day === "number") : [1, 3, 5], minutesPerDay: preference?.minutesPerDay || 45, nextExamAt: preference?.nextExamAt?.toISOString() || null, examLabel: preference?.examLabel || null, planningEnabled: preference?.planningEnabled ?? true, overwhelmPulse: preference?.overwhelmPulse || null }} initialPlan={plan ? { id: plan.id, status: plan.status, version: plan.version, capacityMinutes: plan.capacityMinutes, tasks: plan.tasks.map((task) => ({ id: task.id, title: task.title, scheduledFor: task.scheduledFor.toISOString(), durationMinutes: task.durationMinutes, sourceType: task.sourceType, reasonCode: task.reasonCode, status: task.status })) } : null} /></div></PanelShell>;
}
