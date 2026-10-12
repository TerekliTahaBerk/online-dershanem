import { notFound } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { loadTeacherReview } from "@/lib/panel/teacher-review-server";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherReviewMonitor } from "@/components/panel/teacher-review-monitor";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function TeacherReviewPage() {
  const session = await requireRole("TEACHER");
  if (!getPanelFeatureFlags().reviewQueue) notFound();
  const rows = await loadTeacherReview(session.userId);
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <RotateCcw size={15} /> Kalıcılık gözetimi
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Kuyruk büyürse insan bakışı devreye girsin.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Öğrencileri sıralamadan yalnız biriken çalışma ve üç kez tekrarlayan
          zorlanma sinyalini görün.
        </p>
      </header>
      <div className="mt-7">
        <TeacherReviewMonitor students={rows} />
      </div>
    </PanelShell>
  );
}
