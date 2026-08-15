import { Rocket, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPilotReadiness } from "@/lib/pilot-readiness-server";
import { roleCoverage } from "@/lib/pilot-rollout";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { PilotRolloutControl } from "@/components/panel/pilot-rollout-control";

export const dynamic = "force-dynamic";

export default async function PilotRolloutPage() {
  const session = await requireRole("ADMIN");
  const [groups, cohorts] = await Promise.all([
    prisma.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, teacher: { select: { fullName: true, email: true } }, enrollments: { where: { endedAt: null }, select: { student: { select: { parents: { select: { parentId: true } } } } } } } }),
    prisma.pilotCohort.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { members: { select: { role: true } } } }),
  ]);
  const readinessRoles = cohorts.find((cohort) => cohort.status === "ACTIVE")?.members.map((member) => member.role) || cohorts[0]?.members.map((member) => member.role) || ["ADMIN" as const];
  const readiness = await getPilotReadiness(readinessRoles);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><AdminPageHeader eyebrow="Aşama 17 · kontrollü yayın" title="Önce küçük kohort, sonra kanıtlı genişleme." description="Dört rolü aynı grup bağlamında pilotlayın; güvenlik, restore, bayrak eşliği ve çekirdek SLO kapıları tamamlanmadan erişimi açmayın." icon={Rocket} meta={readiness.canExpand ? "Genişlemeye hazır" : readiness.canActivate ? "Pilot başlatılabilir" : "Kapılar tamamlanmalı"} /><section className="mt-7 panel-surface p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck size={19} /></span><div><h2 className="text-sm font-extrabold">Yayın readiness kapıları</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">`Bekliyor` pilotu başlatmaya engel değildir; ancak kohortu genişletmeden önce gerçek örneklemle hedefe dönüşmelidir.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{readiness.checks.map((check) => <article key={check.key} className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${check.status === "PASS" ? "bg-emerald-100 text-emerald-800" : check.status === "BLOCK" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{check.status === "PASS" ? "Hazır" : check.status === "BLOCK" ? "Bloke" : "Veri bekliyor"}</span><h3 className="mt-3 text-xs font-extrabold">{check.label}</h3><p className="mt-2 text-[11px] leading-5 text-[var(--site-muted)]">{check.detail}</p></article>)}</div></section><div className="mt-5"><PilotRolloutControl groups={groups.map((group) => ({ id: group.id, name: group.name, detail: `${group.teacher.fullName || group.teacher.email} · ${group.enrollments.length} öğrenci · ${new Set(group.enrollments.flatMap((item) => item.student.parents.map((link) => link.parentId))).size} veli` }))} cohorts={cohorts.map((cohort) => ({ id: cohort.id, groupName: cohort.groupNameSnapshot, status: cohort.status, version: cohort.version, memberCount: cohort.members.length, coverage: roleCoverage(cohort.members.map((member) => member.role)), createdAt: cohort.createdAt.toISOString() }))} /></div></PanelShell>;
}
