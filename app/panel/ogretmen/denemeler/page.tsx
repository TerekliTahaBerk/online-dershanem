import { notFound } from "next/navigation";
import { ChartNoAxesCombined } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { MockExamWorkspace } from "@/components/panel/mock-exam-workspace";
import { mockExamViewInclude, toMockExamView } from "@/lib/mock-exam-view";

export const dynamic = "force-dynamic";
export default async function TeacherMockExamsPage() {
  const session = await requireRole("TEACHER"); if (!getPanelFeatureFlags().mockExamAnalysis) notFound();
  const students = await prisma.studentProfile.findMany({ where: { user: { status: "ACTIVE" }, enrollments: { some: { endedAt: null, group: { teacherId: session.userId, isActive: true } } } }, orderBy: { user: { fullName: "asc" } }, include: { user: { select: { fullName: true, email: true } } } });
  const exams = await prisma.mockExam.findMany({ where: { studentId: { in: students.map((student) => student.id) } }, orderBy: { takenAt: "desc" }, take: 80, include: mockExamViewInclude });
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><ChartNoAxesCombined size={15} /> Denemeden eyleme</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Neti değil, nedeni görün.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Öğrencinin kendi eğilimini izleyin; hata nedenini düzeltin ve yalnız bir küçük sonraki adımı onaylayın.</p></header><div className="mt-7"><MockExamWorkspace role={session.role} students={students.map((student) => ({ id: student.id, name: student.user.fullName || student.user.email }))} initialExams={exams.map(toMockExamView)} canReview /></div></PanelShell>;
}
