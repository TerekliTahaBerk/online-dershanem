import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { TeacherLessonWorkspace } from "@/components/panel/teacher-lesson-workspace";
import { PanelNav } from "@/components/panel/panel-nav";

export const dynamic = "force-dynamic";

const day = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" });
const time = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

export default async function Page({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  const session = await requireRole("TEACHER");
  const params = await searchParams;
  const from = new Date(Date.now() - 7 * 86400000);
  const to = new Date(Date.now() + 21 * 86400000);
  const lessons = await prisma.lesson.findMany({
    where: { teacherId: session.userId, startsAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true, startsAt: true, group: { select: { name: true, subject: true } } },
  });
  const selectedId = lessons.some((item) => item.id === params.lesson) ? params.lesson : lessons.find((item) => item.startsAt >= new Date())?.id || lessons.at(-1)?.id;
  const selected = selectedId ? await prisma.lesson.findFirst({
    where: { id: selectedId, teacherId: session.userId },
    include: {
      group: { include: { enrollments: { where: { endedAt: null }, include: { student: { include: { user: { select: { fullName: true, email: true } } } } } } } },
      notes: true,
      attendances: true,
    },
  }) : null;

  let previousGoal: string | null = null;
  if (selected) {
    const previous = await prisma.lesson.findFirst({ where: { groupId: selected.groupId, startsAt: { lt: selected.startsAt }, status: "COMPLETED" }, orderBy: { startsAt: "desc" }, include: { notes: { where: { studentId: null }, take: 1 } } });
    previousGoal = previous?.notes[0]?.nextGoal || null;
  }

  const common = selected?.notes.find((note) => note.studentId === null);
  const workspace = selected ? {
    id: selected.id, groupId: selected.groupId, groupName: selected.group.name, subject: selected.group.subject, title: selected.title, status: selected.status,
    timeLabel: `${day.format(selected.startsAt)} · ${time.format(selected.startsAt)}–${time.format(selected.endsAt)}`,
    topic: common?.topic || "", note: common?.note || "", nextGoal: common?.nextGoal || "", homework: common?.homework || "", previousGoal,
    students: selected.group.enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      name: enrollment.student.user.fullName || enrollment.student.user.email,
      note: selected.notes.find((note) => note.studentId === enrollment.student.id)?.note || "",
      attendance: selected.attendances.find((item) => item.studentId === enrollment.student.id)?.status || "PRESENT" as const,
    })),
  } : null;

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
      {lessons.length ? <nav aria-label="Ders seçimi" className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {lessons.map((lesson) => <Link key={lesson.id} href={`/panel/ogretmen?lesson=${lesson.id}`} className={`min-w-fit rounded-2xl border px-4 py-3 transition ${lesson.id === selectedId ? "border-[var(--brand-olive)] bg-[var(--brand-olive)] text-white shadow-md" : "border-[var(--site-line)] bg-white text-[var(--site-body)] hover:border-[var(--brand-olive)]"}`}><span className="block text-[11px] font-bold uppercase tracking-[.05em] opacity-75">{day.format(lesson.startsAt)}</span><span className="mt-0.5 block text-sm font-bold">{time.format(lesson.startsAt)} · {lesson.group.name}</span></Link>)}
      </nav> : null}
      {workspace ? <TeacherLessonWorkspace key={workspace.id} lesson={workspace} /> : <div className="rounded-[28px] border border-[var(--site-line)] bg-white p-3"><div className="mb-2 flex items-center gap-2 px-4 pt-4 text-sm font-bold text-[var(--brand-olive)]"><CalendarDays size={17} /> Bugünün akışı</div><PanelEmptyState title="Bugün dersiniz yok." body="Yeni ders planlandığında burada görünecek. Bu zamanı bir sonraki grup için hazırlık yaparak değerlendirebilirsiniz." /></div>}
    </PanelShell>
  );
}
