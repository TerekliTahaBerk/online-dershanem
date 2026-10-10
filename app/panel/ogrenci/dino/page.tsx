import { notFound } from "next/navigation";
import { requirePanelRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { dinoQuestionsForProducts } from "@/lib/dino";
import { getAccessibleProductCodes } from "@/lib/auth/products";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelHeading, PanelEmpty } from "@/components/panel/ui";
import { DinoChat } from "@/components/panel/dino-chat";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · DINO AI — onaylı tasarım (Panel.dc.html → sDino).
 *
 * Dino yalnız ÖĞRENCİNİN KENDİ kayıtlarıyla çalışır; hangi verinin toplanacağı
 * sunucuda oturumdan türetilir (`app/api/panel/dino/route.ts`), bu sayfadan
 * gelen bir kimlikle değil.
 *
 * SORU MENÜSÜ ÜRÜN-BAZLIDIR: yalnız KPSS üyeliği olan öğrenciye yoklama/koç
 * kökenli K-12 soruları hiç gösterilmez. Aynı kural API'de de uygulanır —
 * burada daraltmak görünürlüktür, güvenlik sınırı değildir.
 */
export default async function StudentDinoPage() {
  const session = await requirePanelRole("STUDENT");
  if (!getPanelFeatureFlags().dinoAi) notFound();

  const products = await getAccessibleProductCodes(session.userId, session.role);
  const questions = dinoQuestionsForProducts("STUDENT", products);

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
          description="Dino, panelindeki bilgileri sana sade bir dille anlatır. Uydurmaz; neye dayandığını hep gösterir."
        />
        {questions.length ? (
          <div className="mt-6">
            <DinoChat audience="STUDENT" questions={questions} />
          </div>
        ) : (
          <PanelEmpty
            title="Dino'ya sorabileceğin bir şey henüz yok."
            body="Derslerin, planın ya da denemelerin başladığında Dino'nun sana anlatabileceği sorular burada belirecek."
          />
        )}
      </div>
    </PanelShell>
  );
}
