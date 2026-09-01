import { requireRole } from "@/lib/auth/guards";
import { loadStudent360Bundle } from "@/lib/panel/student-360-server";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { Student360View } from "@/components/panel/student-360-view";

export const dynamic = "force-dynamic";

/**
 * Öğretmen / koç Öğrenci 360.
 *
 * Erişim `resolveStudent360Access` ile kurulur: aktif grup kaydı veya koç
 * ataması gerekir. Ticari sekme asla yüklenmez.
 */
export default async function TeacherStudent360Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("TEACHER");
  const { id } = await params;
  const query = await searchParams;

  const bundle = await loadStudent360Bundle({
    viewer: session,
    studentProfileId: id,
    tabRaw: query.sekme,
  });

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Öğrenci 360"
    >
      <Student360View
        bundle={bundle}
        listHref="/panel/ogretmen/gruplar"
        dinoEnabled={getPanelFeatureFlags().dinoAi}
      />
    </PanelShell>
  );
}
