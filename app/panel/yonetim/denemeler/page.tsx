import { notFound } from "next/navigation";
import { ChartNoAxesCombined } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { MockExamWorkspace } from "@/components/panel/mock-exam-workspace";
import { mockExamViewInclude, toMockExamView } from "@/lib/mock-exam-view";

export const dynamic = "force-dynamic";
export default async function AdminMockExamsPage() {
  const session = await requireRole("ADMIN"); if (!getPanelFeatureFlags().mockExamAnalysis) notFound();
  const [students, exams] = await Promise.all([prisma.studentProfile.findMany({ where: { user: { status: "ACTIVE" } }, orderBy: { user: { fullName: "asc" } }, include: { user: { select: { fullName: true, email: true } } } }), prisma.mockExam.findMany({ orderBy: { takenAt: "desc" }, take: 100, include: mockExamViewInclude })]);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><AdminPageHeader eyebrow="Sınav kanıtı" title="Deneme sonucunu nedene ve eyleme bağla." description="Kişi içi eğilimi izleyin; sınıf sırası veya sahte yüzdelik üretmeden veri giriş kalitesini koruyun." icon={ChartNoAxesCombined} meta={`${exams.length} deneme`} /><div className="mt-7"><MockExamWorkspace role={session.role} students={students.map((student) => ({ id: student.id, name: student.user.fullName || student.user.email }))} initialExams={exams.map(toMockExamView)} canReview /></div></PanelShell>;
}
