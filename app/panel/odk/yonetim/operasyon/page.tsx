import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Search, UsersRound, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelPageHeader } from "@/components/panel/panel-page-header";
import { OdkPanelNav } from "@/components/odk/odk-panel-nav";
import { OdkStatusBadge } from "@/components/odk/odk-status-badge";
import { OdkOperationsRefresh } from "@/components/odk/odk-operations-refresh";
import { attemptStatusPresentation } from "@/lib/odk/presentation";

export const dynamic = "force-dynamic";
const time = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const views = ["all", "live", "attention"] as const;

export default async function OdkOperationsPage({ searchParams }: { searchParams: Promise<{ q?: string; gorunum?: string }> }) {
  const session = await requireProductRole("ODK", "ADMIN");
  const params = await searchParams;
  const query = params.q?.trim().toLocaleLowerCase("tr-TR").slice(0, 80) || "";
  const view = views.includes(params.gorunum as typeof views[number]) ? params.gorunum as typeof views[number] : "all";
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 2 * 60_000);
  const exams = await prisma.odkExam.findMany({
    where: { status: { in: ["SCHEDULED", "LIVE"] }, endsAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000) } }, orderBy: { startsAt: "asc" }, take: 30,
    select: { id: true, title: true, family: true, status: true, startsAt: true, endsAt: true, meetRequired: true, attempts: { where: { status: { not: "VOID" } }, orderBy: { startedAt: "asc" }, select: { id: true, status: true, meetAcknowledgedAt: true, startedAt: true, deadlineAt: true, lastActivityAt: true, student: { select: { fullName: true, email: true } }, _count: { select: { answers: true } } } } },
  });
  const attempts = exams.flatMap((exam) => exam.attempts);
  const active = attempts.filter((attempt) => attempt.status === "IN_PROGRESS" && attempt.deadlineAt > now);
  const stale = active.filter((attempt) => attempt.lastActivityAt < staleBefore);
  const submitted = attempts.filter((attempt) => attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED");
  const displayed = exams.filter((exam) => {
    const isLive = Boolean(exam.startsAt && exam.startsAt <= now && exam.endsAt && exam.endsAt > now);
    const hasStale = exam.attempts.some((attempt) => attempt.status === "IN_PROGRESS" && attempt.lastActivityAt < staleBefore);
    const matchesView = view === "all" || (view === "live" && isLive) || (view === "attention" && hasStale);
    const matchesQuery = !query || exam.title.toLocaleLowerCase("tr-TR").includes(query) || exam.attempts.some((attempt) => (attempt.student.fullName || attempt.student.email).toLocaleLowerCase("tr-TR").includes(query));
    return matchesView && matchesQuery;
  });

  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" nav={<OdkPanelNav role={session.role} />}>
    <PanelPageHeader eyebrow="Canlı operasyon" title="Sınav akışını tek ekrandan izleyin." description="Kalp atışı tarayıcı bağlantısını gösterir; Google Meet katılımının teknik kanıtı değildir. Gecikme durumunda öğrenciyle doğrudan iletişim kurun." icon={Activity} action={<OdkOperationsRefresh renderedAt={now.toISOString()} />} />

    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Aktif sınav", exams.filter((exam) => exam.startsAt && exam.startsAt <= now && exam.endsAt && exam.endsAt > now).length, Activity, "panel-tone-sky"], ["Aktif öğrenci", active.length, UsersRound, "panel-tone-mint"], ["Teslim", submitted.length, CheckCircle2, "panel-tone-lavender"], ["Bağlantısı geciken", stale.length, AlertTriangle, stale.length ? "panel-attention-amber" : "panel-tone-yellow"]].map(([label, value, Icon, tone]) => { const MetricIcon = Icon as typeof Activity; return <article key={String(label)} className="panel-metric-card"><span className={`panel-metric-icon ${tone}`}><MetricIcon size={18} /></span><p className="mt-4 text-2xl font-black text-[var(--site-ink)]">{String(value)}</p><p className="mt-1 text-xs text-[var(--site-muted)]">{String(label)}</p></article>; })}</section>

    <form className="mt-6 grid gap-2 rounded-2xl border border-[var(--site-line)] bg-white p-3 sm:grid-cols-[minmax(220px,1fr)_180px_auto]" method="get"><label className="panel-field"><span className="sr-only">Sınav veya öğrenci ara</span><span className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--site-muted)]" /><input name="q" defaultValue={params.q || ""} placeholder="Sınav veya öğrenci ara" className="panel-input pl-9" /></span></label><label className="panel-field"><span className="sr-only">Operasyon görünümü</span><select name="gorunum" defaultValue={view}><option value="all">Tüm planlı ve canlı</option><option value="live">Yalnız canlı</option><option value="attention">İlgi gerekenler</option></select></label><button className="panel-secondary-button">Uygula</button></form>

    <section className="mt-5 space-y-4">{displayed.map((exam) => { const isLive = Boolean(exam.startsAt && exam.startsAt <= now && exam.endsAt && exam.endsAt > now); const rows = [...exam.attempts].sort((a, b) => Number(b.status === "IN_PROGRESS" && b.lastActivityAt < staleBefore) - Number(a.status === "IN_PROGRESS" && a.lastActivityAt < staleBefore)); return <article key={exam.id} className="panel-surface p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><OdkStatusBadge label={isLive ? "Canlı" : "Planlandı"} tone={isLive ? "danger" : "info"} pulse={isLive} /><span className="text-[10px] font-extrabold text-[var(--brand-olive)]">{exam.family}</span></div><h2 className="mt-2 text-lg font-extrabold text-[var(--site-ink)]">{exam.title}</h2><p className="mt-1 text-xs text-[var(--site-muted)]">{exam.startsAt ? time.format(exam.startsAt) : "—"} – {exam.endsAt ? time.format(exam.endsAt) : "—"}</p></div><Link href={`/panel/odk/yonetim/sinavlar/${exam.id}`} className="panel-quick-action">Deneme yönetimi</Link></div>
      <div className="mt-4 space-y-2">{rows.map((attempt) => { const isStale = attempt.status === "IN_PROGRESS" && attempt.lastActivityAt < staleBefore; const status = attemptStatusPresentation[attempt.status]; return <article key={attempt.id} className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[minmax(180px,1.4fr)_1fr_.7fr_1.2fr_1fr] md:items-center ${isStale ? "border-amber-300 bg-[var(--pd-pastel-yellow-soft)]" : "border-[var(--site-line)] bg-white"}`}><div><p className="text-sm font-bold text-[var(--site-ink)]">{attempt.student.fullName || attempt.student.email}</p>{isStale ? <p className="mt-1 flex items-center gap-1 text-[10px] font-extrabold text-amber-800"><AlertTriangle size={11} /> Bağlantıyı kontrol edin</p> : null}</div><div><span className="mb-1 block text-[9px] font-bold uppercase text-[var(--site-muted)] md:hidden">Oturum</span><OdkStatusBadge label={status.label} tone={status.tone} /></div><div><span className="mb-1 block text-[9px] font-bold uppercase text-[var(--site-muted)] md:hidden">Cevap</span><strong className="text-xs">{attempt._count.answers}</strong></div><div><span className="mb-1 block text-[9px] font-bold uppercase text-[var(--site-muted)] md:hidden">Tarayıcı bağlantısı</span><p className={`text-xs ${isStale ? "font-bold text-amber-800" : "text-[var(--site-body)]"}`}>{isStale ? "Gecikiyor · " : ""}{time.format(attempt.lastActivityAt)}</p></div><div><span className="mb-1 block text-[9px] font-bold uppercase text-[var(--site-muted)] md:hidden">Meet beyanı</span><p className="flex items-center gap-1.5 text-xs text-[var(--site-body)]"><Video size={13} />{!exam.meetRequired ? "Gerekmiyor" : attempt.meetAcknowledgedAt ? "Katıldığını onayladı" : "Onay eksik"}</p></div></article>; })}{!rows.length ? <p className="rounded-2xl border border-dashed border-[var(--site-line)] p-6 text-center text-sm text-[var(--site-muted)]">Henüz sınava giren öğrenci yok.</p> : null}</div>
    </article>; })}{!displayed.length ? <div className="rounded-3xl border border-dashed border-[var(--site-line)] bg-white p-8 text-center"><Clock3 size={22} className="mx-auto text-[var(--site-muted)]" /><p className="mt-3 text-sm text-[var(--site-muted)]">Bu görünümde izlenecek deneme bulunmuyor.</p></div> : null}</section>
  </PanelShell>;
}
