import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { AdminLearningForms } from "@/components/panel/admin-learning-forms";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { BookOpenCheck } from "lucide-react";
import { EducationManagement } from "@/components/panel/education-management";
import { TeacherAssignmentManager } from "@/components/panel/teacher-assignment-manager";

export const dynamic = "force-dynamic";

export default async function EducationAdminPage() {
  const session = await requireRole("ADMIN");
  const [teachersRaw, studentsRaw, parentsRaw, groupsRaw, lessons, assignments] = await Promise.all([
    prisma.user.findMany({ where: { role: "TEACHER", status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    prisma.studentProfile.findMany({ where: { user: { status: "ACTIVE" } }, orderBy: { user: { fullName: "asc" } }, include: { user: { select: { fullName: true, email: true } } } }),
    prisma.user.findMany({ where: { role: "PARENT", status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    prisma.group.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { teacher: { select: { id: true, fullName: true, email: true } }, enrollments: { where: { endedAt: null }, include: { student: { include: { user: { select: { fullName: true, email: true } } } } } } } }),
    prisma.lesson.findMany({ where: { startsAt: { gte: new Date(Date.now() - 7 * 86400000) } }, orderBy: { startsAt: "asc" }, take: 24, include: { group: { select: { name: true } }, teacher: { select: { fullName: true, email: true } } } }),
    prisma.assignment.findMany({ orderBy: { dueAt: "desc" }, take: 40, include: { group: { select: { name: true } }, progress: true } }),
  ]);
  const name = (item: { fullName: string | null; email: string }) => item.fullName || item.email;
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
    <AdminPageHeader eyebrow="Eğitim operasyonu" title="Grubu kur, dersi planla." description="Tek akıştan öğretmen ekranını, öğrenci özetini ve veli görünümünü birlikte besleyin." icon={BookOpenCheck} meta={`${groupsRaw.filter((group) => group.isActive).length} aktif grup`} />
    <div className="mt-7"><AdminLearningForms teachers={teachersRaw.map((item) => ({ id: item.id, name: name(item) }))} students={studentsRaw.map((item) => ({ id: item.id, name: name(item.user) }))} parents={parentsRaw.map((item) => ({ id: item.id, name: name(item) }))} groups={groupsRaw.filter((item) => item.isActive).map((item) => ({ id: item.id, name: item.name, subject: item.subject }))} /></div>
    <EducationManagement
      teachers={teachersRaw.map((item) => ({ id: item.id, name: name(item) }))}
      students={studentsRaw.map((item) => ({ id: item.id, name: name(item.user) }))}
      groups={groupsRaw.map((group) => ({ id: group.id, name: group.name, subject: group.subject, level: group.level || "", teacherId: group.teacher.id, teacherName: name(group.teacher), isActive: group.isActive, students: group.enrollments.map((item) => ({ id: item.student.id, name: name(item.student.user) })) }))}
      lessons={lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, startsAt: lesson.startsAt.toISOString(), status: lesson.status, groupName: lesson.group.name, teacherName: name(lesson.teacher) }))}
    />
    <section className="mt-9"><div className="mb-4"><h2 className="text-lg font-extrabold text-[var(--site-ink)]">Ödev merkezi</h2><p className="mt-1 text-xs text-[var(--site-muted)]">Admin tarafından verilen ödevler öğretmen, öğrenci ve veli ekranlarına aynı anda yansır.</p></div><TeacherAssignmentManager groups={groupsRaw.filter((group) => group.isActive).map((group) => ({ id: group.id, name: group.name, subject: group.subject }))} lessons={lessons.map((lesson) => ({ id: lesson.id, groupId: lesson.groupId, title: lesson.title, startsAt: lesson.startsAt.toISOString() }))} assignments={assignments.map((assignment) => ({ id: assignment.id, groupId: assignment.groupId, groupName: assignment.group.name, title: assignment.title, description: assignment.description || "", dueAt: assignment.dueAt.toISOString(), isActive: assignment.isActive, done: assignment.progress.filter((item) => item.status === "DONE").length, total: assignment.progress.length }))} /></section>
  </PanelShell>;
}
