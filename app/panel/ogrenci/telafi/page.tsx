import { notFound } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentRecoveryPackages } from "@/components/panel/student-recovery-packages";

export const dynamic = "force-dynamic";
export default async function StudentRecoveryPage({ searchParams }: { searchParams: Promise<{ lessonId?: string }> }) {
  const session = await requireRole("STUDENT"); if (!getPanelFeatureFlags().recoveryPackage) notFound();
  const requestedLessonId = (await searchParams).lessonId || null;
  const packages = await prisma.recoveryPackage.findMany({
    where: { student: { userId: session.userId }, status: { in: ["PUBLISHED", "COMPLETED"] } },
    orderBy: { dueAt: "asc" },
    include: {
      lesson: {
        select: {
          title: true,
          endsAt: true,
          notes: { where: { studentId: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { note: true } },
          outcomeLinks: { take: 3, orderBy: { createdAt: "asc" }, select: { outcome: { select: { title: true } } } },
        },
      },
      items: {
        orderBy: { position: "asc" },
        include: { material: { select: { id: true, url: true, blobPathname: true, isActive: true } }, assignment: { select: { id: true, isActive: true } } },
      },
    },
  });
  const firstViews = packages.filter((item) => item.status === "PUBLISHED" && !item.firstViewedAt); if (firstViews.length) { await prisma.recoveryPackage.updateMany({ where: { id: { in: firstViews.map((item) => item.id) }, firstViewedAt: null }, data: { firstViewedAt: new Date() } }); for (const item of firstViews) await recordPanelProductEvent({ name: "recovery_package_viewed", properties: { ageMs: Math.min(365 * 86400000, Math.max(0, Date.now() - item.lesson.endsAt.getTime())), itemCount: item.items.length } }, session.role); }
  const rows = packages.map((item) => ({
    id: item.id,
    lessonId: item.lessonId,
    status: item.status as "PUBLISHED" | "COMPLETED",
    lessonTitle: item.lesson.title,
    lessonDate: item.lesson.endsAt.toISOString(),
    summaryTopic: item.summaryTopic,
    sharedNote: item.lesson.notes[0]?.note || null,
    summaryNextStep: item.summaryNextStep,
    checkpointPrompt: item.checkpointPrompt,
    checkpointResponse: item.checkpointResponse,
    dueAt: item.dueAt.toISOString(),
    outcomeTitles: item.lesson.outcomeLinks.map((row) => row.outcome.title),
    items: item.items.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      completed: Boolean(row.completedAt),
      href: row.kind === "MATERIAL" ? row.material?.isActive ? row.material.blobPathname ? `/api/panel/materials/${row.material.id}/file` : row.material.url : null : row.assignment?.isActive ? "/panel/ogrenci/odevler" : null,
    })),
  }));
  const orderedRows = requestedLessonId ? [...rows].sort((a, b) => a.lessonId === requestedLessonId ? -1 : b.lessonId === requestedLessonId ? 1 : 0) : rows;
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><PackageCheck size={15} /> Kaçırdığım ders</p><h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em]">Bu dersi kaçırdın</h1><p className="mt-2 text-sm leading-6 text-[var(--site-body)]">25 dakikada toparlayabilirsin: konu özeti, materyal ve küçük çalışma tek sırada hazır.</p></header><div className="mt-7"><StudentRecoveryPackages rows={orderedRows} /></div></PanelShell>;
}
