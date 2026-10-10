import { notFound } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { CalmDigestCard } from "@/components/panel/calm-digest-card";
import { loadStudentWeeklyDigest, recordWeeklyDigestViewed } from "@/lib/panel/student-review-recovery-server";
import { PAGE_DESCRIPTION_CLASS, PAGE_EYEBROW_CLASS, PAGE_TITLE_CLASS } from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function StudentWeeklyDigestPage() {
  const session = await requireRole("STUDENT");
  if (!getPanelFeatureFlags().parentWeeklyDigest) notFound();
  const digest = await loadStudentWeeklyDigest({ studentUserId: session.userId });
  if (!digest)
    return (
      <PanelShell
        role={session.role}
        fullName={session.fullName}
        email={session.email}
      >
        <PanelEmptyState
          title="Bu haftanın özeti henüz hazır değil."
          body="Öğretmenin özeti tamamladığında sen ve ailen aynı anda göreceksiniz."
        />
      </PanelShell>
    );
  await recordWeeklyDigestViewed(digest, session.role);
  const feedback = digest.feedback;
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <HeartHandshake size={15} /> Seninle aynı anda
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Ailenin de gördüğü haftalık özetin.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Öğretmeninin sana özel notları buraya eklenmez.
        </p>
      </header>
      <div className="mt-7">
        <CalmDigestCard
          viewerRole="STUDENT"
          digest={{
            id: digest.id,
            goodThingOne: digest.goodThingOne,
            goodThingTwo: digest.goodThingTwo,
            supportArea: digest.supportArea,
            homeQuestion: digest.homeQuestion,
            dataThrough: digest.dataThrough.toISOString(),
            trendBand: digest.trendBand,
            feedback: feedback
              ? {
                  helpful: feedback.helpful,
                  anxietyPulse: feedback.anxietyPulse,
                }
              : null,
          }}
        />
      </div>
    </PanelShell>
  );
}
