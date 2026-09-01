import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelPageHeader } from "@/components/panel/ui";
import { TeacherWorkspaceHome } from "@/components/panel/teacher-workspace-home";
import { getTeacherWorkspace } from "@/lib/panel/teacher-workspace-server";

export const dynamic = "force-dynamic";

/**
 * Öğretmen günlük çalışma alanı.
 *
 * Ana soru: "Bugün ne yapmam gerekiyor?" Menü gezmeden dersler, bekleyen
 * işler, riskli öğrenciler ve yaklaşanlar tek akışta.
 *
 * Feature flag kapalıysa ilgili kalemler sunucuda üretilmez; UI sadeleşir.
 */
export default async function TeacherHomePage() {
  const session = await requireRole("TEACHER");
  const workspace = await getTeacherWorkspace(session.userId);

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Bugün"
    >
      <div className="max-w-[1040px]">
        <PanelPageHeader
          title="Bugün ne yapmam gerekiyor?"
          description={workspace.summary}
        />
        <TeacherWorkspaceHome workspace={workspace} />
      </div>
    </PanelShell>
  );
}
