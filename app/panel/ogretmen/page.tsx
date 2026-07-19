import Link from "next/link";
import { CalendarDays, CheckCircle2, Gauge, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { TeacherLessonWorkspace } from "@/components/panel/teacher-lesson-workspace";
import { PanelNav } from "@/components/panel/panel-nav";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export const dynamic = "force-dynamic";

const day = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" });
const time = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

export default async function Page({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  const session = await requireRole("TEACHER");
  const featureFlags = getPanelFeatureFlags();
  const params = await searchParams;
  const from = new Date(Date.now() - 7 * 86400000);
  const to = new Date(Date.now() + 21 * 86400000);
  const [lessons, activeGroups, assignmentProgress, noteTemplates, outcomes] = await Promise.all([
    prisma.lesson.findMany({
      where: { teacherId: session.userId, startsAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true, status: true, group: { select: { name: true, subject: true } } },
    }),
    prisma.group.count({ where: { teacherId: session.userId, isActive: true } }),
    prisma.assignmentProgress.findMany({
      where: { assignment: { createdById: session.userId, isActive: true, dueAt: { gte: from, lte: to } } },
      select: { status: true },
    }),
    prisma.teacherNoteTemplate.findMany({ where: { teacherId: session.userId }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, title: true, note: true, nextGoal: true, homework: true } }),
    featureFlags.learningOutcomes ? prisma.learningOutcome.findMany({ where: { isActive: true, unit: { subject: { version: { status: "ACTIVE" } } } }, orderBy: { code: "asc" }, take: 300, include: { unit: { include: { subject: { include: { version: { select: { code: true } } } } } }, skills: { include: { skill: { select: { name: true } } } }, favorites: { where: { userId: session.userId }, select: { userId: true } }, lessons: { where: { linkedById: session.userId }, take: 1, select: { lessonId: true } } } }) : Promise.resolve([]),
  ]);
  const selectedId = lessons.some((item) => item.id === params.lesson) ? params.lesson : lessons.find((item) => item.startsAt >= new Date())?.id || lessons.at(-1)?.id;
  const selected = selectedId ? await prisma.lesson.findFirst({
    where: { id: selectedId, teacherId: session.userId },
    include: {
      group: { include: { enrollments: { where: { endedAt: null }, include: { student: { include: { user: { select: { fullName: true, email: true } } } } } } } },
      notes: true,
      attendances: true,
      outcomeLinks: true,
    },
  }) : null;

  let previousContext: { topic: string | null; nextGoal: string | null; homework: string | null } | null = null;
  if (selected) {
    const previous = await prisma.lesson.findFirst({ where: { groupId: selected.groupId, startsAt: { lt: selected.startsAt }, status: "COMPLETED" }, orderBy: { startsAt: "desc" }, include: { notes: { where: { studentId: null }, take: 1 } } });
    previousContext = previous?.notes[0] ? { topic: previous.notes[0].topic, nextGoal: previous.notes[0].nextGoal, homework: previous.notes[0].homework } : null;
  }

  const common = selected?.notes.find((note) => note.studentId === null);
  const recentLessons = lessons.filter((lesson) => lesson.startsAt <= new Date());
  const completedLessons = recentLessons.filter((lesson) => lesson.status === "COMPLETED").length;
  const upcomingLessons = lessons.filter((lesson) => lesson.startsAt > new Date() && lesson.startsAt <= new Date(Date.now() + 7 * 86400000)).length;
  const assignmentDone = assignmentProgress.filter((item) => item.status === "DONE").length;
  const assignmentRate = assignmentProgress.length ? Math.round((assignmentDone / assignmentProgress.length) * 100) : 0;
  const workspace = selected ? {
    id: selected.id, groupId: selected.groupId, groupName: selected.group.name, subject: selected.group.subject, title: selected.title, status: selected.status,
    timeLabel: `${day.format(selected.startsAt)} · ${time.format(selected.startsAt)}–${time.format(selected.endsAt)}`,
    topic: common?.topic || "", note: common?.note || "", nextGoal: common?.nextGoal || "", homework: common?.homework || "", previousGoal: previousContext?.nextGoal || null, previousContext, closeVersion: selected.closeVersion,
    templates: noteTemplates.map((template) => ({ ...template, note: template.note || "", nextGoal: template.nextGoal || "", homework: template.homework || "" })),
    outcomeLinks: selected.outcomeLinks.map((link) => ({ outcomeId: link.outcomeId, evidenceType: link.evidenceType })),
    outcomeSkipReason: selected.outcomeSkipReason as "CATALOG_MISSING" | "COMPLETE_LATER" | "NOT_APPLICABLE" | null,
    students: selected.group.enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      name: enrollment.student.user.fullName || enrollment.student.user.email,
      note: selected.notes.find((note) => note.studentId === enrollment.student.id)?.note || "",
      attendance: selected.attendances.find((item) => item.studentId === enrollment.student.id)?.status || "PRESENT" as const,
    })),
  } : null;

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Haftalık öğretmen özeti">
        <article className="panel-metric-card"><CheckCircle2 size={18} className="text-emerald-700" /><p className="mt-3 text-2xl font-extrabold text-[var(--site-ink)]">{completedLessons}/{recentLessons.length}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Son 7 gün tamamlanan ders</p></article>
        <article className="panel-metric-card"><CalendarDays size={18} className="text-sky-700" /><p className="mt-3 text-2xl font-extrabold text-[var(--site-ink)]">{upcomingLessons}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Önümüzdeki 7 gün</p></article>
        <article className="panel-metric-card"><Gauge size={18} className="text-violet-700" /><p className="mt-3 text-2xl font-extrabold text-[var(--site-ink)]">%{assignmentRate}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Haftalık ödev ilerlemesi</p></article>
        <article className="panel-metric-card"><UsersRound size={18} className="text-amber-700" /><p className="mt-3 text-2xl font-extrabold text-[var(--site-ink)]">{activeGroups}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Aktif grup</p></article>
      </section>
      {lessons.length ? <nav aria-label="Ders seçimi" className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {lessons.map((lesson) => <Link key={lesson.id} href={`/panel/ogretmen?lesson=${lesson.id}`} className={`min-w-fit rounded-2xl border px-4 py-3 transition ${lesson.id === selectedId ? "border-[var(--brand-olive)] bg-[var(--brand-olive)] text-white shadow-md" : "border-[var(--site-line)] bg-white text-[var(--site-body)] hover:border-[var(--brand-olive)]"}`}><span className={`block text-[11px] font-bold uppercase tracking-[.05em] ${lesson.id === selectedId ? "text-white" : "text-[var(--site-body)]"}`}>{day.format(lesson.startsAt)}</span><span className="mt-0.5 block text-sm font-bold">{time.format(lesson.startsAt)} · {lesson.group.name}</span></Link>)}
      </nav> : null}
      {workspace ? <TeacherLessonWorkspace key={workspace.id} lesson={workspace} baselineMetricsEnabled={featureFlags.baselineMetrics} learningOutcomesEnabled={featureFlags.learningOutcomes} quickLessonCloseEnabled={featureFlags.quickLessonClose} outcomes={outcomes.map((outcome) => ({ id: outcome.id, code: outcome.code, title: outcome.title, subject: outcome.unit.subject.name, unit: outcome.unit.name, skills: outcome.skills.map((item) => item.skill.name), favorite: outcome.favorites.length > 0, recent: outcome.lessons.length > 0 }))} /> : <div className="rounded-[28px] border border-[var(--site-line)] bg-white p-3"><div className="mb-2 flex items-center gap-2 px-4 pt-4 text-sm font-bold text-[var(--brand-olive)]"><CalendarDays size={17} /> Bugünün akışı</div><PanelEmptyState title="Bugün dersiniz yok." body="Yeni ders planlandığında burada görünecek. Bu zamanı bir sonraki grup için hazırlık yaparak değerlendirebilirsiniz." /></div>}
    </PanelShell>
  );
}
