import { notFound } from "next/navigation";
import { ChartNoAxesCombined } from "lucide-react";
import { loadTeacherMockExams } from "@/lib/panel/teacher-mock-exams-server";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { MockExamWorkspace } from "@/components/panel/mock-exam-workspace";
import { toMockExamView } from "@/lib/mock-exam-view";
import { PAGE_DESCRIPTION_CLASS, PAGE_EYEBROW_CLASS, PAGE_TITLE_CLASS } from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function TeacherMockExamsPage() {
  const session = await requireRole("TEACHER");
  if (!getPanelFeatureFlags().mockExamAnalysis) notFound();
  const { students, exams } = await loadTeacherMockExams(session.userId);
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <ChartNoAxesCombined size={15} /> Denemeden eyleme
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Neti değil, nedeni görün.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Öğrencinin kendi eğilimini izleyin; hata nedenini düzeltin ve yalnız
          bir küçük sonraki adımı onaylayın.
        </p>
      </header>
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
