import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { TeacherAssignmentManager } from "@/components/panel/teacher-assignment-manager";

export const dynamic = "force-dynamic";

export default async function TeacherAssignmentsPage() {
  const session = await requireRole("TEACHER");
  const [groups, lessons, assignments] = await Promise.all([
    prisma.group.findMany({ where: { teacherId: session.userId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, subject: true } }),
    prisma.lesson.findMany({ where: { teacherId: session.userId, startsAt: { gte: new Date(Date.now() - 30 * 86400000) }, status: { not: "CANCELLED" } }, orderBy: { startsAt: "desc" }, take: 40, select: { id: true, groupId: true, title: true, startsAt: true } }),
    prisma.assignment.findMany({ where: { group: { teacherId: session.userId } }, orderBy: [{ isActive: "desc" }, { dueAt: "asc" }], take: 60, include: { group: { select: { name: true } }, progress: { select: { status: true } } } }),
  ]);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
    <header className="mb-7"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><ClipboardCheck size={15} /> Çalışma döngüsü</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)]">Ödevleri ver, ilerlemeyi gör.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Ödev öğrenciye ulaşır; tamamlanma durumu veli paneline aynı anda yansır.</p></header>
    <TeacherAssignmentManager groups={groups} lessons={lessons.map((item) => ({ ...item, startsAt: item.startsAt.toISOString() }))} assignments={assignments.map((item) => ({ id: item.id, groupId: item.groupId, groupName: item.group.name, title: item.title, description: item.description || "", dueAt: item.dueAt.toISOString(), isActive: item.isActive, done: item.progress.filter((progress) => progress.status === "DONE").length, total: item.progress.length }))} />
  </PanelShell>;
}
