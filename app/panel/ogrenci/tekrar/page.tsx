import { notFound } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { dailyReviewLimit } from "@/lib/review-scheduler";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { StudentReviewQueue } from "@/components/panel/student-review-queue";

export const dynamic = "force-dynamic";
export default async function StudentReviewPage() {
  const session = await requireRole("STUDENT"); if (!getPanelFeatureFlags().reviewQueue) notFound(); const now = new Date();
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><PanelEmptyState title="Tekrar profiliniz hazırlanıyor." body="Öğrenci profiliniz tamamlandığında küçük tekrarlar burada açılır." /></PanelShell>;
  const [items, activeCount, masteredCount] = await Promise.all([prisma.reviewItem.findMany({ where: { studentId: profile.id, status: "ACTIVE", dueAt: { lte: now } }, orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }], take: dailyReviewLimit, select: { id: true, title: true, sourceReference: true, solutionNote: true, stage: true, dueAt: true, sourceType: true } }), prisma.reviewItem.count({ where: { studentId: profile.id, status: "ACTIVE" } }), prisma.reviewItem.count({ where: { studentId: profile.id, status: "MASTERED" } })]);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><RotateCcw size={15} /> Beş–on dakikalık dönüş</p><h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em]">Bugün yalnız birkaç küçük tekrar.</h1><p className="mt-2 text-sm leading-6 text-[var(--site-body)]">En fazla {dailyReviewLimit} çalışma gösterilir. Yanlış veya emin olmamak ilerlemeni silmez; yalnız sonraki dönüşü yaklaştırır.</p></header><div className="mt-7"><StudentReviewQueue initialItems={items.map((item) => ({ ...item, solutionNote: item.solutionNote || "", dueAt: item.dueAt.toISOString() }))} activeCount={activeCount} masteredCount={masteredCount} /></div></PanelShell>;
}
