import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, CalendarPlus, CheckCircle2, CircleAlert, Clock3, CreditCard, Sparkles, UserPlus, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";

export const dynamic = "force-dynamic";

function todayBounds() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const start = new Date(Date.UTC(get("year"), get("month") - 1, get("day"), -3));
  return { start, end: new Date(start.getTime() + 86400000) };
}

const date = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", weekday: "long", day: "numeric", month: "long" });
const time = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });

export default async function AdminHomePage() {
  const session = await requireRole("ADMIN");
  const now = new Date();
  const { start, end } = todayBounds();

  const [activeGroups, activeStudents, todayLessons, openLeads, recentLeads, unlinkedOrders, overdueNotes, pendingPasswords] = await Promise.all([
    prisma.group.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.lesson.findMany({ where: { startsAt: { gte: start, lt: end }, status: { not: "CANCELLED" } }, orderBy: { startsAt: "asc" }, include: { group: { select: { name: true, subject: true } }, teacher: { select: { fullName: true, email: true } } } }),
    prisma.leadSubmission.count({ where: { intakeStatus: { in: ["NEW", "REVIEWING"] } } }),
    prisma.leadSubmission.findMany({ where: { intakeStatus: { in: ["NEW", "REVIEWING"] } }, orderBy: { submittedAt: "desc" }, take: 4 }),
    prisma.odOrder.count({ where: { userId: null } }),
    prisma.lesson.count({ where: { endsAt: { lt: now }, status: "PLANNED" } }),
    prisma.user.count({ where: { mustChangePassword: true, status: "ACTIVE" } }),
  ]);

  const firstName = (session.fullName || "Yönetici").split(" ")[0];
  const completedToday = todayLessons.filter((lesson) => lesson.status === "COMPLETED").length;
  const metrics = [
    { label: "Bugünkü ders", value: todayLessons.length, detail: `${completedToday} tamamlandı`, icon: Clock3, tone: "sky" },
    { label: "Aktif grup", value: activeGroups, detail: `${activeStudents} öğrenci`, icon: UsersRound, tone: "mint" },
    { label: "Açık talep", value: openLeads, detail: "Takip bekliyor", icon: Sparkles, tone: "yellow" },
    { label: "Eşleşmemiş sipariş", value: unlinkedOrders, detail: "Hesaba bağlanacak", icon: CreditCard, tone: "lavender" },
  ];
  const attention = [
    { count: overdueNotes, title: "Ders notu bekleniyor", body: "Süresi geçen fakat tamamlanmayan dersler", href: "/panel/yonetim/egitim", tone: "rose" },
    { count: unlinkedOrders, title: "Sipariş eşleşmemiş", body: "Öğrenci hesabına bağlanması gerekiyor", href: "/panel/yonetim/isler", tone: "amber" },
    { count: pendingPasswords, title: "İlk giriş bekleniyor", body: "Geçici parolasını henüz değiştirmeyen hesaplar", href: "/panel/yonetim/kullanicilar", tone: "blue" },
  ].filter((item) => item.count > 0);

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]"><span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" /> Sistem hazır</p>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,3.15rem)] font-semibold leading-[1.02] tracking-[-.055em] text-[var(--site-ink)]">Günaydın, {firstName}.</h1>
          <p className="mt-3 text-[14px] capitalize text-[var(--site-body)]">{date.format(now)} · Bugünün akışı önünüzde.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/panel/yonetim/kullanicilar#yeni-hesap" className="panel-quick-action"><UserPlus size={16} /> Yeni hesap</Link>
          <Link href="/panel/yonetim/egitim#yeni-grup" className="panel-quick-action"><UsersRound size={16} /> Grup kur</Link>
          <Link href="/panel/yonetim/egitim#ders-planla" className="panel-quick-action panel-quick-action-primary"><CalendarPlus size={16} /> Ders planla</Link>
        </div>
      </header>

      <section aria-label="Günlük özet" className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="panel-metric-card"><div className={`panel-metric-icon panel-tone-${tone}`}><Icon size={18} /></div><div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-[28px] font-semibold leading-none tracking-[-.04em] tabular-nums text-[var(--site-ink)]">{value}</p><p className="mt-2 text-[12.5px] font-bold text-[var(--site-ink)]">{label}</p></div><p className="pb-0.5 text-right text-[10.5px] text-[var(--site-muted)]">{detail}</p></div></article>)}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section className="panel-surface min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--site-line)] px-5 py-4 sm:px-6"><div><h2 className="text-[14px] font-extrabold text-[var(--site-ink)]">Bugünün ders akışı</h2><p className="mt-1 text-[11.5px] text-[var(--site-muted)]">Öğretmen, grup ve anlık durum</p></div><Link href="/panel/yonetim/egitim" className="panel-text-link">Tümünü gör <ArrowUpRight size={13} /></Link></div>
          {todayLessons.length ? <div className="divide-y divide-[var(--site-line)]">{todayLessons.map((lesson, index) => <div key={lesson.id} className="group flex gap-4 px-5 py-4 transition hover:bg-[#fbfaf6] sm:px-6"><div className="w-[54px] shrink-0 pt-0.5 text-[13px] font-extrabold tabular-nums text-[var(--site-ink)]">{time.format(lesson.startsAt)}</div><div className="relative flex w-3 shrink-0 justify-center"><span className={`relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ${lesson.status === "COMPLETED" ? "bg-emerald-500 ring-emerald-50" : "bg-[var(--brand-olive)] ring-[var(--brand-olive-soft)]"}`} />{index < todayLessons.length - 1 ? <span className="absolute bottom-[-17px] top-4 w-px bg-[var(--site-line)]" /> : null}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13px] font-bold text-[var(--site-ink)]">{lesson.title}</p><span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[.04em] ${lesson.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-[#fff4c8] text-amber-800"}`}>{lesson.status === "COMPLETED" ? "Tamamlandı" : "Planlı"}</span></div><p className="mt-1 text-[11.5px] text-[var(--site-muted)]">{lesson.group.name} · {lesson.group.subject} · {lesson.teacher.fullName || lesson.teacher.email}</p></div><span className="hidden self-center text-[11px] font-semibold text-[var(--site-muted)] sm:block">{time.format(lesson.endsAt)}</span></div>)}</div> : <div className="px-6 py-12 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><CheckCircle2 size={20} /></span><p className="mt-4 text-sm font-bold text-[var(--site-ink)]">Bugün planlı ders yok</p><p className="mt-1 text-xs text-[var(--site-muted)]">Takvim sakin; yeni ders planlayabilirsiniz.</p></div>}
        </section>

        <section id="bekleyenler" className="panel-surface scroll-mt-24">
          <div className="border-b border-[var(--site-line)] px-5 py-4"><div className="flex items-center gap-2"><CircleAlert size={16} className="text-amber-700" /><h2 className="text-[14px] font-extrabold text-[var(--site-ink)]">İlginizi bekleyenler</h2></div><p className="mt-1 text-[11.5px] text-[var(--site-muted)]">Önce bunları kapatın</p></div>
          {attention.length ? <div className="space-y-2 p-3">{attention.map((item) => <Link key={item.title} href={item.href} className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-[var(--site-bg-warm)]"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold panel-attention-${item.tone}`}>{item.count}</span><span className="min-w-0 flex-1"><span className="block text-[12.5px] font-bold text-[var(--site-ink)]">{item.title}</span><span className="mt-0.5 block truncate text-[10.5px] text-[var(--site-muted)]">{item.body}</span></span><ArrowUpRight size={14} className="text-[var(--site-muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>)}</div> : <div className="px-6 py-12 text-center"><CheckCircle2 size={25} className="mx-auto text-emerald-600" /><p className="mt-3 text-sm font-bold text-[var(--site-ink)]">Her şey yolunda</p><p className="mt-1 text-xs text-[var(--site-muted)]">Bekleyen kritik iş görünmüyor.</p></div>}
        </section>
      </div>

      <section className="panel-surface mt-5">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--site-line)] px-5 py-4 sm:px-6"><div><h2 className="text-[14px] font-extrabold text-[var(--site-ink)]">Yeni talepler</h2><p className="mt-1 text-[11.5px] text-[var(--site-muted)]">Son başvurular, tek bakışta</p></div><Link href="/panel/yonetim/isler" className="panel-text-link">Operasyona git <ArrowUpRight size={13} /></Link></div>
        {recentLeads.length ? <div className="grid divide-y divide-[var(--site-line)] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">{recentLeads.map((lead) => <article key={lead.id} className="p-5"><div className="flex items-start justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf1e8] text-xs font-extrabold text-[#2f4a2a]">{lead.fullName.charAt(0).toLocaleUpperCase("tr-TR")}</span><span className="rounded-full bg-[var(--brand-olive-soft)] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.04em] text-[var(--brand-olive)]">{lead.intakeStatus === "NEW" ? "Yeni" : "İnceleniyor"}</span></div><p className="mt-4 truncate text-[13px] font-bold text-[var(--site-ink)]">{lead.fullName}</p><p className="mt-1 truncate text-[11px] text-[var(--site-muted)]">{lead.examType} · {lead.classLevel} · {lead.phone}</p><p className="mt-3 line-clamp-2 text-[11px] leading-5 text-[var(--site-body)]">{lead.targetGoal}</p></article>)}</div> : <div className="px-6 py-10 text-center text-sm text-[var(--site-muted)]">Yeni talep bulunmuyor.</div>}
      </section>
    </PanelShell>
  );
}
