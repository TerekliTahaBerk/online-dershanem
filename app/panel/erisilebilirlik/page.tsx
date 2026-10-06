import { notFound } from "next/navigation";
import { Accessibility } from "lucide-react";
import { requireActiveUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { AccessibilityPreferencesForm } from "@/components/panel/accessibility-preferences-form";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function AccessibilityPage() {
  const session = await requireActiveUser();
  if (!getPanelFeatureFlags().accessibilityProfile) notFound();
  const preference = await prisma.accessibilityPreference.findUnique({
    where: { userId: session.userId },
  });
  const initial = preference
    ? {
        version: preference.version,
        reducedMotion: preference.reducedMotion,
        highContrast: preference.highContrast,
        textScale: preference.textScale,
        comfortableSpacing: preference.comfortableSpacing,
        captionsPreferred: preference.captionsPreferred,
        transcriptPreferred: preference.transcriptPreferred,
      }
    : {
        version: 0,
        reducedMotion: false,
        highContrast: false,
        textScale: "DEFAULT" as const,
        comfortableSpacing: false,
        captionsPreferred: false,
        transcriptPreferred: false,
      };
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <Accessibility size={16} /> Erişilebilirlik
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Paneli çalışma biçiminize uyarlayın.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Tercihler hesabınıza bağlıdır ve kullandığınız cihazlar arasında
          uygulanır. Sağlık tanısı veya engel adı istemeyiz.
        </p>
      </header>
      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <AccessibilityPreferencesForm initial={initial} />
        <aside className="panel-surface h-fit p-5">
          <h2 className="text-sm font-extrabold">Akademik düzenlemem</h2>
          {session.role === "STUDENT" ? (
            <>
              {preference &&
              (preference.assessmentExtraPercent > 0 ||
                preference.breaksAllowed) ? (
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    {preference.assessmentExtraPercent > 0
                      ? `%${preference.assessmentExtraPercent} ek değerlendirme süresi`
                      : "Standart değerlendirme süresi"}
                  </li>
                  {preference.breaksAllowed ? <li>Planlı kısa mola</li> : null}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-(--site-body)">
                  Admin tarafından atanmış ek süre veya mola düzenlemesi yok.
                </p>
              )}
              <p className="mt-4 text-xs leading-5 text-(--site-muted)">
                Değişiklik gerekiyorsa yöneticinizle iletişime geçin. Burada
                tanı paylaşmanız gerekmez.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-(--site-body)">
              Ek süre ve mola yalnız öğrenci hesaplarında admin tarafından
              yönetilir.
            </p>
          )}
        </aside>
      </div>
    </PanelShell>
  );
}
