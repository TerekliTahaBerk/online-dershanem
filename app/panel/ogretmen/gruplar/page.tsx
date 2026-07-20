import Link from "next/link";
import { CalendarClock, ClipboardCheck, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { academicSupportLabels } from "@/lib/accessibility-preferences";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";

export const dynamic = "force-dynamic";

export default async function TeacherGroupsPage() {
  const session = await requireRole("TEACHER");
  const accessibilityEnabled = getPanelFeatureFlags().accessibilityProfile;
  const groups = await prisma.group.findMany({
    where: { teacherId: session.userId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      enrollments: { where: { endedAt: null }, include: { student: { include: { user: { select: { fullName: true, email: true, accessibilityPreference: true } } } } } },
      lessons: { where: { startsAt: { gte: new Date() }, status: "PLANNED" }, orderBy: { startsAt: "asc" }, take: 1 },
      assignments: { where: { isActive: true }, include: { progress: true } },
    },
  });
  const date = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
    <header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><UsersRound size={15} /> Gruplarım</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)]">Her grubun nabzı burada.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Öğrenci kadrosu, işlevsel destek, sıradaki ders ve ödev ilerlemesini birlikte görün.</p></header>
    <div className="mt-7 grid gap-4 lg:grid-cols-2">{groups.map((group) => {
      const progress = group.assignments.flatMap((item) => item.progress); const done = progress.filter((item) => item.status === "DONE").length;
      return <article key={group.id} className={`rounded-[26px] border border-[var(--site-line)] bg-white p-5 shadow-[var(--panel-card-shadow)] ${group.isActive ? "" : "opacity-60"}`}>
        <div className="flex items-start justify-between"><div><span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-[9.5px] font-bold text-[var(--brand-olive)]">{group.subject} · {group.level || "Seviye yok"}</span><h2 className="mt-3 text-xl font-semibold tracking-[-.03em] text-[var(--site-ink)]">{group.name}</h2></div><span className="text-xs font-extrabold text-[var(--brand-olive)]">{group.enrollments.length}/4</span></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">{group.enrollments.map((item) => { const preference = item.student.user.accessibilityPreference; const supports = accessibilityEnabled && preference ? academicSupportLabels(preference) : []; return <div key={item.id} className="rounded-xl bg-[var(--site-bg-warm)] px-3 py-2 text-xs font-bold text-[var(--site-body)]"><span>{item.student.user.fullName || item.student.user.email}</span>{supports.length ? <ul aria-label="İşlevsel destekler" className="mt-2 space-y-1 text-[10px] font-semibold text-[var(--brand-olive)]">{supports.map((support) => <li key={support}>• {support}</li>)}</ul> : null}</div>; })}</div>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[var(--site-line)] p-3"><CalendarClock size={15} className="text-[var(--brand-olive)]" /><p className="mt-2 text-[10px] font-bold uppercase text-[var(--site-muted)]">Sıradaki ders</p><p className="mt-1 text-xs font-bold text-[var(--site-ink)]">{group.lessons[0] ? date.format(group.lessons[0].startsAt) : "Planlanmadı"}</p></div><div className="rounded-2xl border border-[var(--site-line)] p-3"><ClipboardCheck size={15} className="text-violet-700" /><p className="mt-2 text-[10px] font-bold uppercase text-[var(--site-muted)]">Ödev ilerleme</p><p className="mt-1 text-xs font-bold text-[var(--site-ink)]">{progress.length ? `%${Math.round((done / progress.length) * 100)}` : "—"}</p></div></div>
        <div className="mt-4 flex gap-2"><Link href={`/panel/ogretmen?lesson=${group.lessons[0]?.id || ""}`} className="panel-quick-action">Ders ekranı</Link><Link href="/panel/ogretmen/odevler" className="panel-quick-action panel-quick-action-primary">Ödev ver</Link></div>
      </article>;
    })}{!groups.length ? <p className="rounded-[24px] border border-dashed border-[var(--site-line)] p-10 text-center text-sm text-[var(--site-muted)] lg:col-span-2">Henüz sorumlu olduğunuz grup yok.</p> : null}</div>
  </PanelShell>;
}
