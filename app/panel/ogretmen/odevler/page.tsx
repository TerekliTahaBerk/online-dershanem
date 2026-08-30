import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherAssignmentManager } from "@/components/panel/teacher-assignment-manager";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export const dynamic = "force-dynamic";

export default async function TeacherAssignmentsPage() {
  const session = await requireRole("TEACHER");
  const featureFlags = getPanelFeatureFlags();
  const [groups, lessons, assignments, outcomes] = await Promise.all([
    prisma.group.findMany({ where: { teacherId: session.userId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, subject: true } }),
    prisma.lesson.findMany({ where: { teacherId: session.userId, startsAt: { gte: new Date(Date.now() - 30 * 86400000) }, status: { not: "CANCELLED" } }, orderBy: { startsAt: "desc" }, take: 40, select: { id: true, groupId: true, title: true, startsAt: true } }),
    prisma.assignment.findMany({ where: { group: { teacherId: session.userId } }, orderBy: [{ isActive: "desc" }, { dueAt: "asc" }], take: 60, include: { group: { select: { name: true } }, progress: { select: { status: true } }, outcomeLinks: { include: { outcome: { select: { code: true } } } }, rubricCriteria: { orderBy: { position: "asc" } }, submissions: { orderBy: { submittedAt: "asc" }, include: { student: { include: { user: { select: { fullName: true, email: true } } } }, scores: true } } } }),
    featureFlags.learningOutcomes ? prisma.learningOutcome.findMany({ where: { isActive: true, unit: { subject: { version: { status: "ACTIVE" } } } }, orderBy: [{ favorites: { _count: "desc" } }, { assignments: { _count: "desc" } }, { updatedAt: "desc" }, { code: "asc" }], take: 15, include: { unit: { include: { subject: true } }, skills: { include: { skill: true } }, favorites: { where: { userId: session.userId } }, assignments: { where: { linkedById: session.userId }, take: 1 } } }) : Promise.resolve([]),
  ]);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
    <header className="mb-7"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><ClipboardCheck size={15} /> Çalışma döngüsü</p><h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em] text-[var(--site-ink)]">Ödevleri ver, ilerlemeyi gör.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Ödev öğrenciye ulaşır; tamamlanma durumu veli paneline aynı anda yansır.</p></header>
    <TeacherAssignmentManager groups={groups} lessons={lessons.map((item) => ({ ...item, startsAt: item.startsAt.toISOString() }))} assignments={assignments.map((item) => ({ id: item.id, groupId: item.groupId, groupName: item.group.name, title: item.title, description: item.description || "", dueAt: item.dueAt.toISOString(), isActive: item.isActive, done: item.progress.filter((progress) => progress.status === "DONE").length, total: item.progress.length, outcomes: item.outcomeLinks.map((link) => link.outcome.code), evidenceRequired: item.evidenceRequired, criteria: item.rubricCriteria.map((criterion) => ({ id: criterion.id, label: criterion.label })), submissions: item.submissions.map((submission) => ({ id: submission.id, studentName: submission.student.user.fullName || submission.student.user.email, attemptNumber: submission.attemptNumber, status: submission.status, textEvidence: submission.textEvidence, feedback: submission.feedback, version: submission.version, submittedAt: submission.submittedAt.toISOString(), scores: submission.scores.map((score) => ({ criterionId: score.criterionId, level: score.level })) })) }))} learningOutcomesEnabled={featureFlags.learningOutcomes} assignmentEvidenceEnabled={featureFlags.assignmentEvidence} outcomes={outcomes.map((outcome) => ({ id: outcome.id, code: outcome.code, title: outcome.title, subject: outcome.unit.subject.name, unit: outcome.unit.name, skills: outcome.skills.map((item) => item.skill.name), favorite: outcome.favorites.length > 0, recent: outcome.assignments.length > 0 }))} />
  </PanelShell>;
}
