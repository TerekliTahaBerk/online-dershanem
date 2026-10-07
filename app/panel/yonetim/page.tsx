import { Suspense } from "react";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminOperationsCenterView } from "@/components/panel/admin-operations-center";
import { AdminPreviewEntry } from "@/components/panel/admin-preview-entry";
import { getAdminOperationsCenterSnapshot } from "@/lib/panel/admin-operations-center-server";
import { parseOpsGroupFilter } from "@/lib/panel/admin-operations-center";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";

export const dynamic = "force-dynamic";

/** Yönetim ana sayfası: çapraz ürün Gelen kutusu (§13); `?grup=` alan süzgeci. */
export default async function AdminHomePage({ searchParams }: { searchParams: Promise<{ grup?: string }> }) {
  const session = await requireRole("ADMIN");
  const group = parseOpsGroupFilter((await searchParams).grup);
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
      <AdminOperationsCenterView snapshot={snapshot} group={group} />
    </PanelShell>
  );
}
