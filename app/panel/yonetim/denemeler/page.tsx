import { notFound } from "next/navigation";
import { ChartNoAxesCombined } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { MockExamWorkspace } from "@/components/panel/mock-exam-workspace";
import { toMockExamView } from "@/lib/mock-exam-view";
import { loadAdminMockExams } from "@/lib/panel/admin-mock-exams-server";

export const dynamic = "force-dynamic";
export default async function AdminMockExamsPage() {
  const session = await requireRole("ADMIN");
  if (!getPanelFeatureFlags().mockExamAnalysis) notFound();
  const { students, exams } = await loadAdminMockExams();
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <AdminPageHeader
        eyebrow="Sınav kanıtı"
        title="Deneme sonucunu nedene ve eyleme bağla."
        description="Kişi içi eğilimi izleyin; sınıf sırası veya sahte yüzdelik üretmeden veri giriş kalitesini koruyun."
        icon={ChartNoAxesCombined}
        meta={`${exams.length} deneme`}
      />
      <div className="mt-7">
        <MockExamWorkspace
          role={session.role}
          students={students.map((student) => ({
            id: student.id,
            name: student.user.fullName || student.user.email,
          }))}
          initialExams={exams.map(toMockExamView)}
          canReview
        />
      </div>
    </PanelShell>
  );
}
