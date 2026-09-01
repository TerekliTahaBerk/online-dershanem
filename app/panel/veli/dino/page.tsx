import { notFound } from "next/navigation";
import { requirePanelRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { dinoQuestionsFor } from "@/lib/dino";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelHeading, PanelEmpty } from "@/components/panel/ui";
import { DinoChat } from "@/components/panel/dino-chat";

export const dynamic = "force-dynamic";

/**
 * VELİ · DINO AI — onaylı tasarım (Panel.dc.html → pDino).
 *
 * GİZLİLİK: veli dalında öğretmenin öğrenciye özel notu ve koçun özel görüşme
 * notu Dino'ya HİÇ GİRMEZ (`lib/panel/dino-source.ts`). Model onları
 * özetleyemez çünkü hiç görmez.
 *
 * Seçili öğrenci `resolveParentScope` ile doğrulanır; sunucu tarafı da aynı
 * doğrulamayı bağımsız olarak tekrar yapar.
 */
export default async function ParentDinoPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  if (!getPanelFeatureFlags().dinoAi) notFound();

  const { studentId } = await searchParams;
  const { children, selected } = await resolveParentScope(session.userId, studentId);

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Dino AI"
      topbarSlot={
        <ChildSwitcher
          options={children}
          selectedId={selected?.id ?? null}
          basePath="/panel/veli/dino"
        />
      }
    >
      <div className="max-w-[880px]">
        <PanelHeading
          eyebrow={selected?.name}
          title="Dino AI"
          description="Çocuğunun panelde gördüğün kayıtlarını açıklar. Öğretmen notları ve özel görüşme notları aktarılmaz."
        />
        {selected ? (
          <div className="mt-6">
            <DinoChat
              audience="PARENT"
              questions={[...dinoQuestionsFor("PARENT")]}
              studentId={selected.id}
            />
            <p className="mt-5 text-[12.5px] text-dc-ink-faint">
              Öğretmenin öğrenciye özel notları ve koçun birebir görüşme notları
              Dino'ya aktarılmaz.
            </p>
          </div>
        ) : (
          <PanelEmpty
            title="Öğrenci bağlantın hazırlanıyor."
            body="Bağlantı kurulduğunda Dino özetleri burada açılır."
          />
        )}
      </div>
    </PanelShell>
  );
}
