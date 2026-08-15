import { BookOpenCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { CurriculumManager } from "@/components/panel/curriculum-manager";

export const dynamic = "force-dynamic";

export default async function CurriculumAdminPage() {
  const session = await requireRole("ADMIN");
  const since = new Date(Date.now() - 30 * 86400000);
  const [versions, completedLessons, taggedLessons, assignments, taggedAssignments] = await Promise.all([
    prisma.curriculumVersion.findMany({ orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }], include: { subjects: { include: { units: { include: { _count: { select: { outcomes: true } } } } } } } }),
    prisma.lesson.count({ where: { status: "COMPLETED", startsAt: { gte: since } } }),
    prisma.lesson.count({ where: { status: "COMPLETED", startsAt: { gte: since }, outcomeLinks: { some: {} } } }),
    prisma.assignment.count({ where: { createdAt: { gte: since } } }),
    prisma.assignment.count({ where: { createdAt: { gte: since }, outcomeLinks: { some: {} } } }),
  ]);
  const lessonCoverage = completedLessons ? Math.round((taggedLessons / completedLessons) * 100) : 0;
  const assignmentCoverage = assignments ? Math.round((taggedAssignments / assignments) * 100) : 0;
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><AdminPageHeader eyebrow="Akademik omurga" title="Kazanımları sürümle, kanıtı ortak dile bağla." description="Resmî kaynak sürümünü koruyun; öğretmenlerin ders ve ödevleri aynı kazanım sözlüğüyle etiketlemesini sağlayın." icon={BookOpenCheck} meta={`${versions.length} sürüm`} /><section className="my-6 grid gap-3 sm:grid-cols-2"><article className="panel-metric-card"><p className="text-3xl font-extrabold">%{lessonCoverage}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Son 30 gün kazanım etiketli tamamlanmış ders · {taggedLessons}/{completedLessons}</p></article><article className="panel-metric-card"><p className="text-3xl font-extrabold">%{assignmentCoverage}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Son 30 gün kazanım etiketli ödev · {taggedAssignments}/{assignments}</p></article></section><CurriculumManager versions={versions.map((version) => ({ id: version.id, code: version.code, title: version.title, exam: version.exam, academicYear: version.academicYear, status: version.status, subjectCount: version.subjects.length, outcomeCount: version.subjects.reduce((sum, subject) => sum + subject.units.reduce((unitSum, unit) => unitSum + unit._count.outcomes, 0), 0) }))} /></PanelShell>;
}
