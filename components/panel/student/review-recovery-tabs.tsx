import { ViewTabs } from "@/components/panel/primitives";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

/**
 * Öğrenci "Tekrar ve telafi" sekmeleri (docs/panel-design-roadmap.md §9.4).
 * İki ayrı rota korunur; yalnız iki özellik de açıkken sekme şeridi çizilir,
 * böylece kapalı bir sayfaya bağlantı üretilmez.
 */
export function ReviewRecoveryTabs({ active }: { active: "tekrar" | "telafi" }) {
  const flags = getPanelFeatureFlags();
  if (!flags.reviewQueue || !flags.recoveryPackage) return null;
  return (
    <div className="mt-5">
      <ViewTabs
        label="Tekrar ve telafi"
        activeId={active}
        tabs={[
          { id: "tekrar", label: "Tekrar", href: "/panel/ogrenci/tekrar" },
          { id: "telafi", label: "Kaçırılan ders telafisi", href: "/panel/ogrenci/telafi" },
        ]}
      />
    </div>
  );
}
