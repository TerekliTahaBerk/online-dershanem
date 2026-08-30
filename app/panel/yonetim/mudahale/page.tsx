import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getInterventionConcernTargets, getInterventionInbox } from "@/lib/intervention-inbox-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { InterventionInbox } from "@/components/panel/intervention-inbox";

export const dynamic = "force-dynamic";
export default async function AdminInterventionPage() {
  const session = await requireRole("ADMIN"); if (!getPanelFeatureFlags().interventionInbox) notFound();
  const [rows, concernTargets] = await Promise.all([getInterventionInbox({ role: "ADMIN", userId: session.userId }), getInterventionConcernTargets({ role: "ADMIN", userId: session.userId })]);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><AdminPageHeader eyebrow="İnsan müdahalesi" title="Hiçbir sinyal sahipsiz kalmasın." description="Açıklanabilir kural, 24 saat hedefi, sahiplik, sonuç ve yanlış işaret geri bildirimi tek yerde." icon={Inbox} meta={`${rows.length} kayıt`} /><div className="mt-7"><InterventionInbox rows={rows} concernTargets={concernTargets} /></div></PanelShell>;
}
