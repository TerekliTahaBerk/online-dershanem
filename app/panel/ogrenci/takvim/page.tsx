import { CalendarDays, ExternalLink, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";

export const dynamic = "force-dynamic";

export default async function StudentCalendarPage() {
  const session = await requireRole("STUDENT");
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  const lessons = profile ? await prisma.lesson.findMany({ where: { group: { enrollments: { some: { studentId: profile.id, endedAt: null } } }, startsAt: { gte: new Date(Date.now() - 7 * 86400000), lte: new Date(Date.now() + 60 * 86400000) }, status: { not: "CANCELLED" } }, orderBy: { startsAt: "asc" }, include: { group: { select: { name: true, subject: true } }, teacher: { select: { fullName: true, email: true } } } }) : [];
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><CalendarDays size={15} /> Ders takvimim</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)]">Sıradaki adımın hazır.</h1></header><div className="mt-7 space-y-3">{lessons.map((lesson) => <article key={lesson.id} className="flex flex-col gap-4 rounded-[22px] border border-[var(--site-line)] bg-white p-5 shadow-[var(--panel-card-shadow)] sm:flex-row sm:items-center"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><Video size={19} /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-extrabold text-[var(--site-ink)]">{lesson.title}</h2><p className="mt-1 text-xs text-[var(--site-muted)]">{lesson.group.name} · {lesson.group.subject} · {lesson.teacher.fullName || lesson.teacher.email}</p><p className="mt-1 text-xs font-bold capitalize text-[var(--brand-olive)]">{new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(lesson.startsAt)}</p></div>{lesson.meetingUrl && lesson.startsAt > new Date(Date.now() - 2 * 3600000) ? <a href={lesson.meetingUrl} target="_blank" rel="noopener noreferrer" className="panel-quick-action panel-quick-action-primary"><ExternalLink size={14} /> Derse katıl</a> : null}</article>)}{!lessons.length ? <p className="rounded-[24px] border border-dashed border-[var(--site-line)] p-10 text-center text-sm text-[var(--site-muted)]">Takvimde ders görünmüyor.</p> : null}</div></PanelShell>;
}
