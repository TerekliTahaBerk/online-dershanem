import { notFound } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { dailyReviewLimit } from "@/lib/review-scheduler";
import { loadStudentReviewQueue } from "@/lib/panel/student-review-recovery-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { StudentReviewQueue } from "@/components/panel/student-review-queue";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";
import { ReviewRecoveryTabs } from "@/components/panel/student/review-recovery-tabs";

export const dynamic = "force-dynamic";
export default async function StudentReviewPage() {
  const session = await requireRole("STUDENT");
  if (!getPanelFeatureFlags().reviewQueue) notFound();
  // Sorgu mobil `GET /api/panel/student/review-queue` ile ortak yükleyicide.
  const queue = await loadStudentReviewQueue({ studentUserId: session.userId });
  if (!queue)
    return (
      <PanelShell
        role={session.role}
        fullName={session.fullName}
        email={session.email}
      >
        <PanelEmptyState
          title="Tekrar profiliniz hazırlanıyor."
          body="Öğrenci profiliniz tamamlandığında küçük tekrarlar burada açılır."
        />
      </PanelShell>
    );
  const { items, activeCount, masteredCount } = queue;
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <RotateCcw size={15} /> Beş–on dakikalık dönüş
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Bugün yalnız birkaç küçük tekrar.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          En fazla {dailyReviewLimit} çalışma gösterilir. Yanlış veya emin
          olmamak ilerlemeni silmez; yalnız sonraki dönüşü yaklaştırır.
        </p>
      </header>
      <ReviewRecoveryTabs active="tekrar" />
      <div className="mt-7">
        <StudentReviewQueue
          initialItems={items.map((item) => ({
            ...item,
            solutionNote: item.solutionNote || "",
            dueAt: item.dueAt.toISOString(),
          }))}
          activeCount={activeCount}
          masteredCount={masteredCount}
        />
      </div>
    </PanelShell>
  );
}
