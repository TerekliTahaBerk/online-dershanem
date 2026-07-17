import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { StudentAssignmentList } from "@/components/panel/student-assignment-list";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage() {
  const session = await requireRole("STUDENT");
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  const assignments = profile ? await prisma.assignment.findMany({ where: { isActive: true, group: { enrollments: { some: { studentId: profile.id, endedAt: null } } } }, orderBy: { dueAt: "asc" }, include: { group: { select: { name: true, subject: true } }, progress: { where: { studentId: profile.id }, take: 1 } } }) : [];
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><header className="mb-7"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><ClipboardCheck size={15} /> Çalışmalarım</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)]">Ne yapacağın hep net.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Çalışmaya başladığında işaretle; bitirdiğinde serini büyüt.</p></header><StudentAssignmentList assignments={assignments.map((item) => ({ id: item.id, title: item.title, description: item.description || "", dueAt: item.dueAt.toISOString(), groupName: item.group.name, subject: item.group.subject, status: item.progress[0]?.status || "TODO" }))} /></PanelShell>;
}
