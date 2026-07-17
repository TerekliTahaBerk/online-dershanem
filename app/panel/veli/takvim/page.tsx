import Link from "next/link";
import { CalendarDays, ExternalLink, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { PanelEmptyState } from "@/components/panel/empty-state";

export const dynamic = "force-dynamic";

export default async function ParentCalendarPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireRole("PARENT");
  const { studentId } = await searchParams;
  const links = await prisma.parentStudent.findMany({ where: { parentId: session.userId }, include: { student: { include: { user: { select: { fullName: true, email: true } } } } }, orderBy: { student: { user: { fullName: "asc" } } } });
  if (!links.length) return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><PanelEmptyState title="Öğrenci bağlantınız hazırlanıyor." body="Bağlantı kurulduğunda ders takvimi burada görünür." /></PanelShell>;
  const selected = studentId ? links.find((item) => item.studentId === studentId) : links[0];
  if (!selected) notFound();
  const enrollments = await prisma.enrollment.findMany({ where: { studentId: selected.studentId, endedAt: null }, select: { groupId: true } });
  const lessons = await prisma.lesson.findMany({ where: { groupId: { in: enrollments.map((item) => item.groupId) }, startsAt: { gte: new Date(Date.now() - 86400000) }, status: { not: "CANCELLED" } }, orderBy: { startsAt: "asc" }, take: 30, include: { group: true, teacher: { select: { fullName: true, email: true } } } });
  const name = selected.student.user.fullName || selected.student.user.email;
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.07em] text-[var(--brand-olive)]"><ShieldCheck size={15} /> Güvenli veli görünümü</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)]">{name} · Ders takvimi</h1></div>{links.length > 1 ? <nav className="flex gap-2" aria-label="Öğrenci seçimi">{links.map((link) => <Link key={link.studentId} href={`/panel/veli/takvim?studentId=${link.studentId}`} className={`rounded-full px-3 py-2 text-xs font-bold ${link.studentId === selected.studentId ? "bg-[var(--brand-olive)] text-white" : "border border-[var(--site-line)] bg-white"}`}>{link.student.user.fullName || link.student.user.email}</Link>)}</nav> : null}</header>
    <section className="panel-surface mt-6 overflow-hidden"><div className="border-b border-[var(--site-line)] p-5"><h2 className="flex items-center gap-2 text-sm font-extrabold text-[var(--site-ink)]"><CalendarDays size={17} /> Yaklaşan dersler</h2></div><div className="divide-y divide-[var(--site-line)]">{lessons.map((lesson) => <article key={lesson.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><time className="text-xs font-extrabold text-[var(--brand-olive)]">{new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(lesson.startsAt)}</time><h3 className="mt-1 text-sm font-bold text-[var(--site-ink)]">{lesson.title}</h3><p className="mt-1 text-xs text-[var(--site-muted)]">{lesson.group.name} · {lesson.teacher.fullName || lesson.teacher.email}</p></div>{lesson.meetingUrl && lesson.startsAt.getTime() < Date.now() + 86400000 ? <a href={lesson.meetingUrl} target="_blank" rel="noreferrer" className="panel-quick-action panel-quick-action-primary"><ExternalLink size={14} /> Ders bağlantısı</a> : null}</article>)}{!lessons.length ? <p className="p-8 text-center text-sm text-[var(--site-muted)]">Planlanmış ders bulunmuyor.</p> : null}</div></section>
  </PanelShell>;
}
