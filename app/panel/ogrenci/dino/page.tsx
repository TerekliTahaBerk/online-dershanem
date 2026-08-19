import { notFound } from "next/navigation";
import { requirePanelRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { dinoQuestionsFor } from "@/lib/dino";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelHeading } from "@/components/panel/ui";
import { DinoChat } from "@/components/panel/dino-chat";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · DINO AI — onaylı tasarım (Panel.dc.html → sDino).
 *
 * Dino yalnız ÖĞRENCİNİN KENDİ kayıtlarıyla çalışır; hangi verinin toplanacağı
 * sunucuda oturumdan türetilir (`app/api/panel/dino/route.ts`), bu sayfadan
 * gelen bir kimlikle değil.
 */
export default async function StudentDinoPage() {
  const session = await requirePanelRole("STUDENT");
  if (!getPanelFeatureFlags().dinoAi) notFound();

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Dino AI"
    >
      <div className="max-w-[880px]">
        <PanelHeading
          title="Dino AI"
          description="Panelindeki kendi kayıtlarını sade bir dille özetler."
        />
        <div className="mt-6">
          <DinoChat audience="STUDENT" questions={[...dinoQuestionsFor("STUDENT")]} />
        </div>
      </div>
    </PanelShell>
  );
}
