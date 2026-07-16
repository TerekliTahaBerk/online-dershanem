import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { AdminLearningForms } from "@/components/panel/admin-learning-forms";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { BookOpenCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EducationAdminPage() {
  const session = await requireRole("ADMIN");
  const [teachersRaw, studentsRaw, parentsRaw, groupsRaw, upcoming] = await Promise.all([
    prisma.user.findMany({ where: { role: "TEACHER", status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    prisma.studentProfile.findMany({ where: { user: { status: "ACTIVE" } }, orderBy: { user: { fullName: "asc" } }, include: { user: { select: { fullName: true, email: true } } } }),
    prisma.user.findMany({ where: { role: "PARENT", status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    prisma.group.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { teacher: { select: { fullName: true, email: true } }, enrollments: { where: { endedAt: null }, include: { student: { include: { user: { select: { fullName: true, email: true } } } } } } } }),
    prisma.lesson.findMany({ where: { startsAt: { gte: new Date() }, status: "PLANNED" }, orderBy: { startsAt: "asc" }, take: 8, include: { group: { select: { name: true } }, teacher: { select: { fullName: true, email: true } } } }),
  ]);
  const name = (item: { fullName: string | null; email: string }) => item.fullName || item.email;
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
    <AdminPageHeader eyebrow="Eğitim operasyonu" title="Grubu kur, dersi planla." description="Tek akıştan öğretmen ekranını, öğrenci özetini ve veli görünümünü birlikte besleyin." icon={BookOpenCheck} meta={`${groupsRaw.length} aktif grup`} />
    <div className="mt-7"><AdminLearningForms teachers={teachersRaw.map((item) => ({ id: item.id, name: name(item) }))} students={studentsRaw.map((item) => ({ id: item.id, name: name(item.user) }))} parents={parentsRaw.map((item) => ({ id: item.id, name: name(item) }))} groups={groupsRaw.map((item) => ({ id: item.id, name: item.name, subject: item.subject }))} /></div>
    <div className="mt-8 grid gap-5 lg:grid-cols-2"><section><h2 className="text-sm font-bold text-[var(--site-ink)]">Aktif gruplar <span className="text-[var(--site-muted)]">({groupsRaw.length})</span></h2><div className="mt-3 space-y-2">{groupsRaw.map((group) => <div key={group.id} className="rounded-2xl border border-[var(--site-line)] bg-white p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-[var(--site-ink)]">{group.name}</p><p className="mt-1 text-xs text-[var(--site-body)]">{group.subject} · {name(group.teacher)}</p></div><span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-xs font-bold text-[var(--brand-olive)]">{group.enrollments.length}/4</span></div><p className="mt-3 text-xs text-[var(--site-muted)]">{group.enrollments.map((item) => name(item.student.user)).join(" · ") || "Henüz öğrenci yok"}</p></div>)}</div></section><section><h2 className="text-sm font-bold text-[var(--site-ink)]">Sıradaki dersler</h2><div className="mt-3 space-y-2">{upcoming.map((lesson) => <div key={lesson.id} className="flex items-center justify-between rounded-2xl border border-[var(--site-line)] bg-white p-4"><div><p className="text-sm font-bold text-[var(--site-ink)]">{lesson.title}</p><p className="mt-1 text-xs text-[var(--site-body)]">{lesson.group.name} · {name(lesson.teacher)}</p></div><time className="text-right text-xs font-bold text-[var(--brand-olive)]">{new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(lesson.startsAt)}</time></div>)}</div></section></div>
  </PanelShell>;
}
