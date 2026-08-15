import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherPlanReview } from "@/components/panel/teacher-plan-review";

export const dynamic = "force-dynamic";
export default async function TeacherPlanPage() {
  const session = await requireRole("TEACHER"); if (!getPanelFeatureFlags().adaptivePlan) notFound();
  const plans = await prisma.weeklyPlan.findMany({ where: { weekStart: planningWeekStart(), status: { in: ["DRAFT", "CHANGE_REQUESTED", "APPROVED"] }, student: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: session.userId } } } } }, orderBy: { updatedAt: "desc" }, include: { student: { include: { user: { select: { fullName: true, email: true } } } }, tasks: { where: { status: { not: "SKIPPED" } }, orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } } });
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><ListChecks size={15} /> İnsan onaylı plan</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Öneriyi görün, sonra kilitleyin.</h1><p className="mt-2 text-sm leading-6 text-[var(--site-body)]">Sistem yalnız mevcut kanıtları ve kapasiteyi sıralar. Son eğitim kararı sizindir; öğrenci sıralaması üretilmez.</p></header><div className="mt-7"><TeacherPlanReview plans={plans.map((plan) => ({ id: plan.id, studentName: plan.student.user.fullName || plan.student.user.email, status: plan.status, version: plan.version, capacityMinutes: plan.capacityMinutes, changeRequestCategory: plan.changeRequestCategory, tasks: plan.tasks.map((task) => ({ id: task.id, title: task.title, scheduledFor: task.scheduledFor.toISOString(), durationMinutes: task.durationMinutes, reasonCode: task.reasonCode })) }))} /></div></PanelShell>;
}
