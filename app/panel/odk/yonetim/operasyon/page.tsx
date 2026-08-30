import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Search, UsersRound, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelPageHeader, PanelMetric, PanelCard, PanelEmpty } from "@/components/panel/ui";
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

  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK">
    <PanelPageHeader eyebrow="Canlı operasyon" title="Sınav akışını tek ekrandan izleyin." description="Kalp atışı tarayıcı bağlantısını gösterir; Google Meet katılımının teknik kanıtı değildir. Gecikme durumunda öğrenciyle doğrudan iletişim kurun." icon={Activity} action={<OdkOperationsRefresh renderedAt={now.toISOString()} />} />

    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Aktif sınav", exams.filter((exam) => exam.startsAt && exam.startsAt <= now && exam.endsAt && exam.endsAt > now).length, Activity, "info"],
      ["Aktif öğrenci", active.length, UsersRound, "success"],
      ["Teslim", submitted.length, CheckCircle2, "neutral"],
      ["Bağlantısı geciken", stale.length, AlertTriangle, stale.length ? "warning" : "neutral"],
    ].map(([label, value, Icon, tone]) => {
      const MetricIcon = Icon as typeof Activity;
      return <PanelMetric key={String(label)} label={String(label)} value={String(value)} icon={MetricIcon} tone={tone as "neutral" | "info" | "success" | "warning"} />;
    })}</section>

    <form className="mt-6 grid gap-2 rounded-2xl border border-[var(--site-line)] bg-white p-3 sm:grid-cols-[minmax(220px,1fr)_180px_auto]" method="get"><label className="panel-field"><span className="sr-only">Sınav veya öğrenci ara</span><span className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--site-muted)]" /><input name="q" defaultValue={params.q || ""} placeholder="Sınav veya öğrenci ara" className="panel-input pl-9" /></span></label><label className="panel-field"><span className="sr-only">Operasyon görünümü</span><select name="gorunum" defaultValue={view}><option value="all">Tüm planlı ve canlı</option><option value="live">Yalnız canlı</option><option value="attention">İlgi gerekenler</option></select></label><button className="panel-secondary-button">Uygula</button></form>

    <section className="mt-5 space-y-4">{displayed.map((exam) => { const isLive = Boolean(exam.startsAt && exam.startsAt <= now && exam.endsAt && exam.endsAt > now); const rows = [...exam.attempts].sort((a, b) => Number(b.status === "IN_PROGRESS" && b.lastActivityAt < staleBefore) - Number(a.status === "IN_PROGRESS" && a.lastActivityAt < staleBefore)); return <PanelCard key={exam.id} className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><OdkStatusBadge label={isLive ? "Canlı" : "Planlandı"} tone={isLive ? "danger" : "info"} pulse={isLive} /><span className="text-[10px] font-extrabold text-dc-brand-strong">{exam.family}</span></div><h2 className="mt-2 text-lg font-extrabold text-dc-ink">{exam.title}</h2><p className="mt-1 text-xs text-dc-ink-muted">{exam.startsAt ? time.format(exam.startsAt) : "—"} – {exam.endsAt ? time.format(exam.endsAt) : "—"}</p></div><Link href={`/panel/odk/yonetim/sinavlar/${exam.id}`} className="panel-quick-action">Deneme yönetimi</Link></div>
      <div className="mt-4 space-y-2">{rows.map((attempt) => { const isStale = attempt.status === "IN_PROGRESS" && attempt.lastActivityAt < staleBefore; const status = attemptStatusPresentation[attempt.status]; return <article key={attempt.id} className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[minmax(180px,1.4fr)_1fr_.7fr_1.2fr_1fr] md:items-center ${isStale ? "border-[var(--pd-pastel-yellow-ink)]/35 bg-[var(--pd-pastel-yellow-soft)]" : "border-dc-line bg-white"}`}><div><p className="text-sm font-bold text-dc-ink">{attempt.student.fullName || attempt.student.email}</p>{isStale ? <p className="mt-1 flex items-center gap-1 text-[10px] font-extrabold text-[var(--pd-pastel-yellow-ink)]"><AlertTriangle size={11} /> Bağlantıyı kontrol edin</p> : null}</div><div><span className="mb-1 block text-[9px] font-bold uppercase text-dc-ink-muted md:hidden">Oturum</span><OdkStatusBadge label={status.label} tone={status.tone} /></div><div><span className="mb-1 block text-[9px] font-bold uppercase text-dc-ink-muted md:hidden">Cevap</span><strong className="text-xs text-dc-ink">{attempt._count.answers}</strong></div><div><span className="mb-1 block text-[9px] font-bold uppercase text-dc-ink-muted md:hidden">Tarayıcı bağlantısı</span><p className={`text-xs ${isStale ? "font-bold text-[var(--pd-pastel-yellow-ink)]" : "text-dc-ink-body"}`}>{isStale ? "Gecikiyor · " : ""}{time.format(attempt.lastActivityAt)}</p></div><div><span className="mb-1 block text-[9px] font-bold uppercase text-dc-ink-muted md:hidden">Meet beyanı</span><p className="flex items-center gap-1.5 text-xs text-dc-ink-body"><Video size={13} />{!exam.meetRequired ? "Gerekmiyor" : attempt.meetAcknowledgedAt ? "Katıldığını onayladı" : "Onay eksik"}</p></div></article>; })}{!rows.length ? <p className="rounded-2xl border border-dashed border-dc-line p-6 text-center text-sm text-dc-ink-muted">Henüz sınava giren öğrenci yok.</p> : null}</div>
    </PanelCard>; })}{!displayed.length ? <PanelEmpty className="mt-2 border-dashed p-8 text-center" title="Bu görünümde izlenecek deneme bulunmuyor." body="Filtreleri temizlediğinde uygun sınavlar burada görünür." /> : null}</section>
  </PanelShell>;
}
