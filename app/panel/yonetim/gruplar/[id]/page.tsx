import { requireRole } from "@/lib/auth/guards";
import { loadGroup360Bundle } from "@/lib/panel/group-360-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { Group360View } from "@/components/panel/group-360-view";

export const dynamic = "force-dynamic";

export default async function Group360Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("ADMIN");
  const { id } = await params;
  const query = await searchParams;

  const bundle = await loadGroup360Bundle({
    groupId: id,
    tabRaw: query.sekme,
  });

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Grup 360">
      <Group360View bundle={bundle} />
    </PanelShell>
  );
}
