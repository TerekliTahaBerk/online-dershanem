import { notFound } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { loadTeacherRecovery } from "@/lib/panel/teacher-recovery-server";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherRecoveryManager } from "@/components/panel/teacher-recovery-manager";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function TeacherRecoveryPage() {
  const session = await requireRole("TEACHER");
  if (!getPanelFeatureFlags().recoveryPackage) notFound();
  const rows = await loadTeacherRecovery(session.userId);
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <PackageCheck size={15} /> 72 saatlik telafi
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Kaçırılan dersi tek onayla küçük bir sıraya koy.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Ortak özet, aktif kaynak, çalışma ve mini kontrol. Öğrenciye özel
          notlar taslağa hiçbir zaman girmez.
        </p>
      </header>
      <div className="mt-7">
        <TeacherRecoveryManager rows={rows} />
      </div>
    </PanelShell>
  );
}
