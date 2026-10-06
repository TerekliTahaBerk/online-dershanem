import { WifiOff } from "lucide-react";
import { requireActiveUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { NetworkPreferencesForm } from "@/components/panel/network-preferences-form";
import { notFound } from "next/navigation";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

export default async function NetworkPreferencesPage() {
  const session = await requireActiveUser();
  if (!getPanelFeatureFlags().offlineMode) notFound();
  const preference = await prisma.networkPreference.findUnique({
    where: { userId: session.userId },
  });
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <WifiOff size={15} /> Bağlantıya dayanıklı panel
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Az veriyle çalışın; kayıt kaybolmasın.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Düşük veri görünümünü ve bu cihazdaki sınırlı çevrimdışı yazma iznini
          siz yönetirsiniz.
        </p>
      </header>
      <div className="mt-7">
        <NetworkPreferencesForm
          initial={
            preference
              ? {
                  version: preference.version,
                  lowDataMode: preference.lowDataMode,
                  offlineWritesEnabled: preference.offlineWritesEnabled,
                }
              : { version: 0, lowDataMode: false, offlineWritesEnabled: false }
          }
        />
      </div>
    </PanelShell>
  );
}
