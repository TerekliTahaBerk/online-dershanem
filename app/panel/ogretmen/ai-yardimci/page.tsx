import { notFound } from "next/navigation";
import { Bot } from "lucide-react";
import { requireTeacherStaffPermission } from "@/lib/auth/guards";
import { loadTeacherAiDrafts } from "@/lib/panel/teacher-ai-drafts-server";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherAiDrafts } from "@/components/panel/teacher-ai-drafts";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

export default async function TeacherAiAssistantPage() {
  const session = await requireTeacherStaffPermission("od:lesson:teach");
  if (!getPanelFeatureFlags().teacherAiDrafts) notFound();
  const { lessons, drafts } = await loadTeacherAiDrafts(session.userId);
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <Bot size={15} /> İnsan denetimli yardımcı
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Kaynağı görün, taslağı siz onaylayın.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Açık sohbet değil: yalnız ödev ve mini kontrol taslağı. Model yanlış
          olabilir; hiçbir çıktı kendiliğinden öğrenciye veya veliye gitmez.
        </p>
      </header>
      <div className="mt-7">
        <TeacherAiDrafts
          lessons={lessons}
          drafts={drafts}
        />
      </div>
    </PanelShell>
  );
}
