import { Suspense } from "react";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminOperationsCenterView } from "@/components/panel/admin-operations-center";
import { AdminPreviewEntry } from "@/components/panel/admin-preview-entry";
import { getAdminOperationsCenterSnapshot } from "@/lib/panel/admin-operations-center-server";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const session = await requireRole("ADMIN");
  const snapshot = await getAdminOperationsCenterSnapshot();

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle={PANEL_DOMAIN.operasyonMerkezi}
    >
      <Suspense fallback={null}>
        <AdminPreviewEntry returnPath="/panel/yonetim" />
      </Suspense>
      <AdminOperationsCenterView snapshot={snapshot} />
    </PanelShell>
  );
}
