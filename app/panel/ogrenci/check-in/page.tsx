import { notFound } from "next/navigation";
import { HandHeart } from "lucide-react";
import { requireFirstAccessibleProductRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadStudentCheckIn } from "@/lib/panel/student-check-in-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentCheckInForm } from "@/components/panel/student-check-in-form";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function StudentCheckInPage() {
  const { session } = await requireFirstAccessibleProductRole(["OD", "OK"], "STUDENT");
  if (!getPanelFeatureFlags().studentCheckIn) notFound();
  // Okuma `lib/panel/student-check-in-server.ts`'te; mobil uç (`/api/panel/student/check-in`) aynı yükleyiciyi kullanır.
  const data = await loadStudentCheckIn({ userId: session.userId });
  if (!data) notFound();
  const history = data.history.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }));
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <HandHeart size={15} /> Sakin check-in
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Nasıl ilerlediğini fark et, gerekirse yardım iste.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Puan, sıralama ve serbest metin yok. Paylaşma kararın sende; veli bu
          alanı göremez.
        </p>
      </header>
      <div className="mt-7">
        <StudentCheckInForm
          groups={data.targets.map((target) => (target.kind === "GROUP" ? { id: target.groupId, name: target.name, subject: target.subject } : { id: `coach:${target.coachAssignmentId}`, name: target.name, subject: "Koçunla takip" }))}
          history={history}
          remaining={data.remaining}
        />
      </div>
    </PanelShell>
  );
}
