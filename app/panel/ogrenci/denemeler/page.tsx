import { notFound } from "next/navigation";
import { ChartNoAxesCombined } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { MockExamWorkspace } from "@/components/panel/mock-exam-workspace";
import { mockExamViewInclude, toMockExamView } from "@/lib/mock-exam-view";

export const dynamic = "force-dynamic";
export default async function StudentMockExamsPage() {
  const session = await requireRole("STUDENT"); if (!getPanelFeatureFlags().mockExamAnalysis) notFound();
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><PanelEmptyState title="Deneme profiliniz hazırlanıyor." body="Öğrenci profiliniz tamamlandığında deneme analizi açılır." /></PanelShell>;
  const exams = await prisma.mockExam.findMany({ where: { studentId: profile.id }, orderBy: { takenAt: "desc" }, take: 40, include: mockExamViewInclude });
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><ChartNoAxesCombined size={15} /> Kendi eğilimin</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Her denemeden tek doğru adım çıkar.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Sıralama yok: doğru–yanlış–boş, süre ve nedenleri yalnız kendi önceki denemelerinle karşılaştır.</p></header><div className="mt-7"><MockExamWorkspace role={session.role} students={[{ id: profile.id, name: session.fullName || session.email }]} initialExams={exams.map(toMockExamView)} /></div></PanelShell>;
}
