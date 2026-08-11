import { AlertTriangle, CheckCircle2, Clock3, Rocket, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { roleCoverage } from "@/lib/pilot-rollout";
import { getOdkPilotReadiness } from "@/lib/odk/pilot-readiness-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelPageHeader } from "@/components/panel/panel-page-header";
import { OdkPanelNav } from "@/components/odk/odk-panel-nav";
import { OdkPilotControl } from "@/components/odk/odk-pilot-control";

export const dynamic = "force-dynamic";

export default async function OdkPilotPage() {
  const session = await requireProductRole("ODK", "ADMIN");
  const now = new Date();
  const [candidates, runs] = await Promise.all([
    prisma.user.findMany({ where: { status: "ACTIVE", OR: [{ role: { in: ["ADMIN", "TEACHER"] } }, { productMemberships: { some: { product: "ODK", startsAt: { lte: now }, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } }] }, select: { id: true, role: true, fullName: true, email: true }, orderBy: [{ role: "asc" }, { fullName: "asc" }, { email: "asc" }] }),
    prisma.odkPilotRun.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { members: { select: { role: true, userId: true } } } }),
  ]);
  const readinessRun = runs.find((run) => run.status === "ACTIVE") || runs[0];
  const readiness = await getOdkPilotReadiness(readinessRun?.members || [{ role: "ADMIN" as const }], readinessRun?.startedAt);
  const groups = [
    { status: "BLOCK" as const, label: "Bloke", description: "Aktivasyondan önce tamamlanmalı", icon: AlertTriangle, className: "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]" },
    { status: "WAIT" as const, label: "Bekliyor", description: "İlk pilotu durdurmaz; genişlemeyi durdurur", icon: Clock3, className: "bg-[var(--pd-pastel-yellow-soft)] text-[var(--pd-pastel-yellow-ink)]" },
    { status: "PASS" as const, label: "Hazır", description: "Kanıtı güncel", icon: CheckCircle2, className: "bg-[var(--pd-pastel-mint-soft)] text-[var(--pd-pastel-mint-ink)]" },
  ].map((group) => ({ ...group, checks: readiness.checks.filter((check) => check.status === group.status) }));

  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" nav={<OdkPanelNav role={session.role} />}>
    <PanelPageHeader eyebrow="Kontrollü yayın" title="Önce tek koşu, sonra kanıtlı genişleme." description="Pilot üyeliği ürün erişiminden ayrıdır. Acil durdurma sınav verisini silmeden erişimi keser; admin kurtarma erişimini korur." icon={Rocket} />

    <section className="mt-7 grid gap-3 sm:grid-cols-3">{groups.map((group) => <article key={group.status} className="panel-metric-card"><span className={`panel-metric-icon ${group.className}`}><group.icon size={18} /></span><p className="mt-4 text-2xl font-black">{group.checks.length}</p><p className="mt-1 text-xs font-bold">{group.label} kapı</p><p className="mt-1 text-[10px] leading-4 text-[var(--site-muted)]">{group.description}</p></article>)}</section>

    <section className="mt-5 panel-surface p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--panel-nav-active)] text-[var(--brand-olive)]"><ShieldCheck size={19} /></span><div><h2 className="text-sm font-extrabold">ODK yayın kapıları</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">{readiness.canActivate ? "Pilot aktivasyonu için bloke kapı kalmadı." : "Bloke kapılar tamamlanmadan pilot erişimi açılamaz."} {readiness.canExpand ? "Genişleme kapıları da hazır." : "Genel yayın için tüm kapıların hazır olması gerekir."}</p></div></div>
      <div className="mt-5 space-y-6">{groups.filter((group) => group.checks.length).map((group) => <section key={group.status}><div className="flex items-center gap-2"><group.icon size={15} className={group.status === "BLOCK" ? "text-rose-700" : group.status === "WAIT" ? "text-amber-700" : "text-emerald-700"} /><h3 className="text-xs font-extrabold">{group.label} · {group.checks.length}</h3></div><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{group.checks.map((check) => <article key={check.key} className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${group.className}`}>{group.label}</span><h4 className="mt-3 text-xs font-extrabold">{check.label}</h4><p className="mt-2 text-[11px] leading-5 text-[var(--site-muted)]">{check.detail}</p></article>)}</div></section>)}</div>
    </section>

    <div className="mt-5"><OdkPilotControl currentAdminId={session.userId} candidates={candidates.map((user) => ({ id: user.id, role: user.role, label: user.fullName || user.email }))} runs={runs.map((run) => ({ id: run.id, name: run.name, status: run.status, version: run.version, memberCount: run.members.length, coverage: roleCoverage(run.members.map((member) => member.role)), createdAt: run.createdAt.toISOString() }))} /></div>
  </PanelShell>;
}
