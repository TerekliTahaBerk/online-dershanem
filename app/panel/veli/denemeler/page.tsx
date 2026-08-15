import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { MockExamWorkspace } from "@/components/panel/mock-exam-workspace";
import { mockExamViewInclude, toMockExamView } from "@/lib/mock-exam-view";

export const dynamic = "force-dynamic";
export default async function ParentMockExamsPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireRole("PARENT"); if (!getPanelFeatureFlags().mockExamAnalysis) notFound(); const { studentId } = await searchParams;
  const links = await prisma.parentStudent.findMany({ where: { parentId: session.userId }, include: { student: { include: { user: { select: { fullName: true, email: true } } } } }, orderBy: { student: { user: { fullName: "asc" } } } });
  if (!links.length) return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><PanelEmptyState title="Öğrenci bağlantınız hazırlanıyor." body="Bağlantı kurulduğunda sakin deneme özeti burada görünür." /></PanelShell>;
  const selected = studentId ? links.find((link) => link.studentId === studentId) : links[0]; if (!selected) notFound();
  const exams = await prisma.mockExam.findMany({ where: { studentId: selected.studentId }, orderBy: { takenAt: "desc" }, take: 30, include: mockExamViewInclude }); const name = selected.student.user.fullName || selected.student.user.email;
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><ShieldCheck size={15} /> Yalnız bağlı öğrenciniz</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">{name} · Deneme eğilimi</h1><p className="mt-2 text-sm text-[var(--site-body)]"><ChartNoAxesCombined size={14} className="mr-1 inline" /> Tek sonuca hüküm vermeyen, karşılaştırmasız ve eylem odaklı özet.</p></div>{links.length > 1 ? <nav className="flex gap-2" aria-label="Öğrenci seçimi">{links.map((link) => <Link key={link.studentId} href={`/panel/veli/denemeler?studentId=${link.studentId}`} className={`rounded-full px-3 py-2 text-xs font-bold ${link.studentId === selected.studentId ? "bg-[var(--brand-olive)] text-white" : "border border-[var(--site-line)] bg-white"}`}>{link.student.user.fullName || link.student.user.email}</Link>)}</nav> : null}</header><div className="mt-7"><MockExamWorkspace role={session.role} students={[{ id: selected.studentId, name }]} initialExams={exams.map(toMockExamView)} canCreate={false} /></div></PanelShell>;
}
