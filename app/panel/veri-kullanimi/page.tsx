import { WifiOff } from "lucide-react";
import { requireActiveUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { NetworkPreferencesForm } from "@/components/panel/network-preferences-form";
import { notFound } from "next/navigation";

export default async function NetworkPreferencesPage() {
  const session = await requireActiveUser();
  if (!getPanelFeatureFlags().offlineMode) notFound();
  const preference = await prisma.networkPreference.findUnique({ where: { userId: session.userId } });
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
    <header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><WifiOff size={15} /> Bağlantıya dayanıklı panel</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Az veriyle çalışın; kayıt kaybolmasın.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--site-body)]">Düşük veri görünümünü ve bu cihazdaki sınırlı çevrimdışı yazma iznini siz yönetirsiniz.</p></header>
    <div className="mt-7"><NetworkPreferencesForm initial={preference ? { version: preference.version, lowDataMode: preference.lowDataMode, offlineWritesEnabled: preference.offlineWritesEnabled } : { version: 0, lowDataMode: false, offlineWritesEnabled: false }} /></div>
  </PanelShell>;
}
