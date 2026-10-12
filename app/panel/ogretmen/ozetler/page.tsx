import { notFound } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { loadTeacherDigests } from "@/lib/panel/teacher-digests-server";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherDigestReview } from "@/components/panel/teacher-digest-review";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function TeacherDigestsPage() {
  const session = await requireRole("TEACHER");
  if (!getPanelFeatureFlags().parentWeeklyDigest) notFound();
  const rows = await loadTeacherDigests(session.userId);
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <HeartHandshake size={15} /> Sakin aile iletişimi
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Taslağı görün, aynı anda paylaşın.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Özel öğrenci notu, görev listesi ve tekil kötü günler özete alınmaz.
          Öğrenci ve veli aynı yayınlanmış metni görür.
        </p>
      </header>
      <div className="mt-7">
        <TeacherDigestReview
          initialRows={rows}
        />
      </div>
    </PanelShell>
  );
}
