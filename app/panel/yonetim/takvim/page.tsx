import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Download, SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";

export const dynamic = "force-dynamic";

function weekBounds(offset: number) {
  const tr = new Date(Date.now() + 3 * 3600000);
  const dayFromMonday = (tr.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate() - dayFromMonday + offset * 7) - 3 * 3600000);
  return { start, end: new Date(start.getTime() + 7 * 86400000) };
}

const dayTitle = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", weekday: "short", day: "numeric", month: "short" });
const time = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
const rangeDate = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long" });

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string; teacher?: string; group?: string }> }) {
  const session = await requireRole("ADMIN");
  const params = await searchParams;
  const week = Math.max(-52, Math.min(52, Number(params.week) || 0));
  const { start, end } = weekBounds(week);
  const [lessons, teachers, groups] = await Promise.all([
    prisma.lesson.findMany({ where: { startsAt: { gte: start, lt: end }, ...(params.teacher ? { teacherId: params.teacher } : {}), ...(params.group ? { groupId: params.group } : {}) }, orderBy: { startsAt: "asc" }, include: { group: { select: { id: true, name: true, subject: true } }, teacher: { select: { fullName: true, email: true } } } }),
    prisma.user.findMany({ where: { role: "TEACHER", status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    prisma.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const days = Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * 86400000));
  const query = (nextWeek: number) => { const qs = new URLSearchParams({ week: String(nextWeek) }); if (params.teacher) qs.set("teacher", params.teacher); if (params.group) qs.set("group", params.group); return `/panel/yonetim/takvim?${qs}`; };

  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
    <AdminPageHeader eyebrow="Haftalık plan" title="Ders takvimi" description="Tüm grupların derslerini gün gün görün; öğretmen veya gruba göre odağınızı daraltın." icon={CalendarDays} meta={`${lessons.length} ders`} />
    <div className="mt-4 flex justify-end"><a href="/api/panel/calendar/export" download className="panel-quick-action panel-quick-action-primary"><Download size={14} /> Tüm programı indir (.ics)</a></div>
    <div className="mt-6 flex flex-col gap-3 rounded-[14px] border border-[var(--site-line)] bg-white p-3 shadow-[var(--panel-card-shadow)] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center justify-between gap-2"><Link href={query(week - 1)} className="panel-quick-action" aria-label="Önceki hafta"><ChevronLeft size={16} /></Link><div className="min-w-[190px] text-center"><p className="text-[12.5px] font-extrabold text-[var(--site-ink)]">{rangeDate.format(start)} – {rangeDate.format(new Date(end.getTime() - 1))}</p><p className="mt-0.5 text-[10.5px] text-[var(--site-muted)]">{week === 0 ? "Bu hafta" : week > 0 ? `${week} hafta sonrası` : `${Math.abs(week)} hafta önce`}</p></div><Link href={query(week + 1)} className="panel-quick-action" aria-label="Sonraki hafta"><ChevronRight size={16} /></Link>{week !== 0 ? <Link href={query(0)} className="panel-quick-action">Bugün</Link> : null}</div>
      <form className="flex flex-col gap-2 sm:flex-row" action="/panel/yonetim/takvim"><input type="hidden" name="week" value={week} /><select name="teacher" defaultValue={params.teacher || ""} className="panel-input min-w-[170px] py-2 text-xs"><option value="">Tüm öğretmenler</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName || teacher.email}</option>)}</select><select name="group" defaultValue={params.group || ""} className="panel-input min-w-[150px] py-2 text-xs"><option value="">Tüm gruplar</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><button className="panel-quick-action panel-quick-action-primary"><SlidersHorizontal size={14} /> Uygula</button></form>
    </div>

    <div className="panel-nav-scroll mt-4 overflow-x-auto pb-2"><div className="grid min-w-[1120px] grid-cols-7 gap-2">{days.map((day) => {
      const dayStart = day.getTime(); const dayEnd = dayStart + 86400000; const items = lessons.filter((lesson) => lesson.startsAt.getTime() >= dayStart && lesson.startsAt.getTime() < dayEnd); const today = new Date().getTime() >= dayStart && new Date().getTime() < dayEnd;
      return <section key={day.toISOString()} className={`min-h-[480px] rounded-[14px] border bg-white p-2.5 shadow-[var(--panel-card-shadow)] ${today ? "border-[var(--brand-olive)]" : "border-[var(--site-line)]"}`}><div className={`rounded-xl px-2.5 py-2 ${today ? "bg-[var(--brand-olive)] text-white" : "bg-[var(--site-bg-warm)] text-[var(--site-ink)]"}`}><p className="text-[11px] font-extrabold capitalize">{dayTitle.format(day)}</p></div><div className="mt-2 space-y-2">{items.map((lesson) => <Link key={lesson.id} href={`/panel/yonetim/gruplar/${lesson.group.id}`} className={`block rounded-[14px] border p-2.5 transition hover:-translate-y-0.5 hover:shadow-md ${lesson.status === "CANCELLED" ? "border-rose-100 bg-rose-50/70 opacity-65" : lesson.status === "COMPLETED" ? "border-emerald-100 bg-emerald-50/70" : "border-[var(--site-line)] bg-white"}`}><div className="flex items-center justify-between gap-2"><span className="text-[10.5px] font-extrabold tabular-nums text-[var(--brand-olive)]">{time.format(lesson.startsAt)}</span><span className="text-[8.5px] font-bold uppercase text-[var(--site-muted)]">{lesson.status === "CANCELLED" ? "İptal" : lesson.status === "COMPLETED" ? "Bitti" : "Planlı"}</span></div><p className="mt-2 text-[11.5px] font-bold leading-4 text-[var(--site-ink)]">{lesson.title}</p><p className="mt-1 text-[9.5px] leading-4 text-[var(--site-muted)]">{lesson.group.name}<br />{lesson.teacher.fullName || lesson.teacher.email}</p></Link>)}{!items.length ? <p className="px-2 py-8 text-center text-[10.5px] text-[var(--site-muted)]">Ders yok</p> : null}</div></section>;
    })}</div></div>
  </PanelShell>;
}
