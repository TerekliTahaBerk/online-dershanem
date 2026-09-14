import { BookOpenCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getCurriculumVersionSummaries } from "@/lib/curriculum/catalog-cache";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { CurriculumManager } from "@/components/panel/curriculum-manager";
import {
  LEGACY_CURRICULUM_EXAM_CODES,
  listActiveExamFamilies,
} from "@/lib/products/registry";

export const dynamic = "force-dynamic";

export default async function CurriculumAdminPage() {
  const session = await requireRole("ADMIN");
  const since = new Date(Date.now() - 30 * 86400000);
  const [
    versions,
    completedLessons,
    taggedLessons,
    assignments,
    taggedAssignments,
    examFamilies,
  ] = await Promise.all([
    getCurriculumVersionSummaries(),
    prisma.lesson.count({
      where: { status: "COMPLETED", startsAt: { gte: since } },
    }),
    prisma.lesson.count({
      where: {
        status: "COMPLETED",
        startsAt: { gte: since },
        outcomeLinks: { some: {} },
      },
    }),
    prisma.assignment.count({ where: { createdAt: { gte: since } } }),
    prisma.assignment.count({
      where: { createdAt: { gte: since }, outcomeLinks: { some: {} } },
    }),
    listActiveExamFamilies({ codes: LEGACY_CURRICULUM_EXAM_CODES }),
  ]);
  const lessonCoverage = completedLessons
    ? Math.round((taggedLessons / completedLessons) * 100)
    : 0;
  const assignmentCoverage = assignments
    ? Math.round((taggedAssignments / assignments) * 100)
    : 0;
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <AdminPageHeader
        eyebrow="Akademik omurga"
        title="Kazanımları sürümle, kanıtı ortak dile bağla."
        description="Resmî kaynak sürümünü koruyun; öğretmenlerin ders ve ödevleri aynı kazanım sözlüğüyle etiketlemesini sağlayın."
        icon={BookOpenCheck}
        meta={`${versions.length} sürüm`}
      />
      <section className="my-6 grid gap-3 sm:grid-cols-2">
        <article className="panel-metric-card">
          <p className="text-3xl font-extrabold">%{lessonCoverage}</p>
          <p className="mt-1 text-xs text-[var(--site-muted)]">
            Son 30 gün kazanım etiketli tamamlanmış ders · {taggedLessons}/
            {completedLessons}
          </p>
        </article>
        <article className="panel-metric-card">
          <p className="text-3xl font-extrabold">%{assignmentCoverage}</p>
          <p className="mt-1 text-xs text-[var(--site-muted)]">
            Son 30 gün kazanım etiketli ödev · {taggedAssignments}/{assignments}
          </p>
        </article>
      </section>
      <CurriculumManager
        versions={versions}
        examFamilies={examFamilies.map((item) => item.code) as (typeof LEGACY_CURRICULUM_EXAM_CODES)[number][]}
      />
    </PanelShell>
  );
}
