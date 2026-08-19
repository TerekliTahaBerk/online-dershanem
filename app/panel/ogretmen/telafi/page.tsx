import { notFound } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherRecoveryManager } from "@/components/panel/teacher-recovery-manager";

export const dynamic = "force-dynamic";
export default async function TeacherRecoveryPage() {
  const session = await requireRole("TEACHER"); if (!getPanelFeatureFlags().recoveryPackage) notFound(); const since = new Date(Date.now() - 30 * 86400000);
  const [attendances, packages] = await Promise.all([
    prisma.attendance.findMany({ where: { status: { in: ["ABSENT", "EXCUSED"] }, lesson: { teacherId: session.userId, status: "COMPLETED", endsAt: { gte: since }, group: { isActive: true } } }, orderBy: { lesson: { endsAt: "desc" } }, include: { lesson: { select: { id: true, groupId: true, title: true, endsAt: true } }, student: { include: { user: { select: { fullName: true, email: true } }, enrollments: { where: { endedAt: null }, select: { groupId: true } } } } } }),
    prisma.recoveryPackage.findMany({ where: { lesson: { teacherId: session.userId }, createdAt: { gte: since } }, include: { items: { orderBy: { position: "asc" } } } }),
  ]);
  const packageMap = new Map(packages.map((item) => [`${item.lessonId}:${item.studentId}`, item]));
  const rows = attendances.filter((item) => item.student.enrollments.some((enrollment) => enrollment.groupId === item.lesson.groupId)).map((item) => { const recovery = packageMap.get(`${item.lessonId}:${item.studentId}`); return { attendanceId: item.id, studentName: item.student.user.fullName || item.student.user.email, lessonTitle: item.lesson.title, lessonDate: item.lesson.endsAt.toISOString(), status: item.status as "ABSENT" | "EXCUSED", package: recovery ? { id: recovery.id, status: recovery.status, version: recovery.version, summaryTopic: recovery.summaryTopic, summaryNextStep: recovery.summaryNextStep, checkpointPrompt: recovery.checkpointPrompt, dueAt: recovery.dueAt.toISOString(), items: recovery.items.map((row) => ({ id: row.id, kind: row.kind, title: row.title })) } : null }; });
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><PackageCheck size={15} /> 72 saatlik telafi</p><h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em]">Kaçırılan dersi tek onayla küçük bir sıraya koy.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--site-body)]">Ortak özet, aktif kaynak, çalışma ve mini kontrol. Öğrenciye özel notlar taslağa hiçbir zaman girmez.</p></header><div className="mt-7"><TeacherRecoveryManager rows={rows} /></div></PanelShell>;
}
