import Link from "next/link";
import { ArrowLeft, CalendarDays, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { GroupManagementDetail } from "@/components/panel/group-management-detail";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("ADMIN");
  const { id } = await params;
  const [group, teachers, otherGroups] = await Promise.all([
    prisma.group.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        enrollments: {
          where: { endedAt: null },
          include: {
            student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
          },
        },
        lessons: {
          orderBy: { startsAt: "desc" },
          take: 12,
          include: { notes: true, attendances: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.group.findMany({
      where: { isActive: true, id: { not: id } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        subject: true,
        capacity: true,
        enrollments: { where: { endedAt: null }, select: { id: true } },
      },
    }),
  ]);
  if (!group) notFound();

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Grup yönetimi">
      <div className="max-w-[1040px]">
        <Link href="/panel/yonetim/egitim" className="panel-text-link">
          <ArrowLeft size={13} /> Eğitime dön
        </Link>

        <header className="mt-5 rounded-[14px] border border-[var(--site-line)] bg-white p-6 shadow-[var(--panel-card-shadow)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[9.5px] font-extrabold ${group.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {group.isActive ? "Aktif grup" : "Kapalı grup"}
                </span>
                <span className="text-[10.5px] text-[var(--site-muted)]">{group.level || "Seviye belirtilmedi"}</span>
              </div>
              <h1 className="mt-3 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em] text-[var(--site-ink)]">{group.name}</h1>
              <p className="mt-2 text-sm text-[var(--site-body)]">
                {group.subject} · {group.teacher.fullName || group.teacher.email}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="panel-quick-action">
                <UsersRound size={15} /> {group.enrollments.length}/{group.capacity} öğrenci
              </span>
              <span className="panel-quick-action">
                <CalendarDays size={15} /> {group.lessons.length} son ders
              </span>
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
          <GroupManagementDetail
            group={{
              id: group.id,
              name: group.name,
              subject: group.subject,
              level: group.level || "",
              teacherId: group.teacherId,
              teacherName: group.teacher.fullName || group.teacher.email,
              isActive: group.isActive,
              capacity: group.capacity,
              activeStudentCount: group.enrollments.length,
            }}
            teachers={teachers.map((teacher) => ({
              id: teacher.id,
              name: teacher.fullName || teacher.email,
            }))}
            members={group.enrollments.map((enrollment) => ({
              id: enrollment.student.id,
              name: enrollment.student.user.fullName || enrollment.student.user.email,
              email: enrollment.student.user.email,
            }))}
            targetGroups={otherGroups.map((item) => ({
              id: item.id,
              name: item.name,
              subject: item.subject,
              filled: item.enrollments.length,
              capacity: item.capacity,
            }))}
          />

          <section className="panel-surface h-fit">
            <div className="border-b border-[var(--site-line)] px-5 py-4">
              <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Son dersler</h2>
            </div>
            <div className="divide-y divide-[var(--site-line)]">
              {group.lessons.map((lesson) => (
                <article key={lesson.id} className="p-4 sm:px-5">
                  <p className="text-xs font-bold text-[var(--site-ink)]">{lesson.title}</p>
                  <p className="mt-1 text-[10.5px] text-[var(--site-muted)]">
                    {dateTime.format(lesson.startsAt)} · {lesson.attendances.length} yoklama · {lesson.notes.length} not
                  </p>
                </article>
              ))}
              {!group.lessons.length ? <p className="p-5 text-xs text-[var(--site-muted)]">Ders geçmişi yok.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </PanelShell>
  );
}
