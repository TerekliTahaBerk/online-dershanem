import { Rocket, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { roleCoverage } from "@/lib/pilot-rollout";
import { getOdkPilotReadiness } from "@/lib/odk/pilot-readiness-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { OdkPanelNav } from "@/components/odk/odk-panel-nav";
import { OdkPilotControl } from "@/components/odk/odk-pilot-control";

export const dynamic = "force-dynamic";

export default async function OdkPilotPage() {
  const session = await requireProductRole("ODK", "ADMIN"); const now = new Date();
  const [candidates, runs] = await Promise.all([
    prisma.user.findMany({ where: { status: "ACTIVE", OR: [{ role: { in: ["ADMIN", "TEACHER"] } }, { productMemberships: { some: { product: "ODK", startsAt: { lte: now }, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } }] }, select: { id: true, role: true, fullName: true, email: true }, orderBy: [{ role: "asc" }, { fullName: "asc" }, { email: "asc" }] }),
    prisma.odkPilotRun.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { members: { select: { role: true } } } }),
  ]);
  const readinessRoles = runs.find((run) => run.status === "ACTIVE")?.members.map((member) => member.role) || runs[0]?.members.map((member) => member.role) || ["ADMIN" as const];
  const readiness = await getOdkPilotReadiness(readinessRoles);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" nav={<OdkPanelNav role={session.role} />}><header><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]"><Rocket size={15} /> Kontrollü yayın</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Önce tek koşu, sonra kanıtlı genişleme.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Pilot üyeliği ürün erişiminden ayrıdır; acil durdurma sınav verisini silmeden erişimi keser.</p></header><section className="mt-7 panel-surface p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck size={19} /></span><div><h2 className="text-sm font-extrabold">ODK yayın kapıları</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Bloke kapı aktivasyonu durdurur. “Bekliyor” pilotu durdurmaz ancak genişlemeye izin vermez.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{readiness.checks.map((check) => <article key={check.key} className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${check.status === "PASS" ? "bg-emerald-100 text-emerald-800" : check.status === "BLOCK" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{check.status === "PASS" ? "Hazır" : check.status === "BLOCK" ? "Bloke" : "Bekliyor"}</span><h3 className="mt-3 text-xs font-extrabold">{check.label}</h3><p className="mt-2 text-[11px] leading-5 text-[var(--site-muted)]">{check.detail}</p></article>)}</div></section><div className="mt-5"><OdkPilotControl currentAdminId={session.userId} candidates={candidates.map((user) => ({ id: user.id, role: user.role, label: user.fullName || user.email }))} runs={runs.map((run) => ({ id: run.id, name: run.name, status: run.status, version: run.version, memberCount: run.members.length, coverage: roleCoverage(run.members.map((member) => member.role)), createdAt: run.createdAt.toISOString() }))} /></div></PanelShell>;
}
