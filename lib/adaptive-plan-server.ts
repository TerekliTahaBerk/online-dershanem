import "server-only";
import type { StudentPlanPreference } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSupportSignals, type SupportSnapshot } from "@/lib/support-signals";
import type { PlanCandidate } from "@/lib/adaptive-plan";

export async function collectPlanCandidates(studentId: string, preference: StudentPlanPreference): Promise<PlanCandidate[]> {
  const now = new Date();
  const inTwoWeeks = new Date(now.getTime() + 14 * 86400000);
  const [assignmentRows, reviewRows, weakRows, recoveryRows] = await Promise.all([
    prisma.assignmentProgress.findMany({ where: { studentId, status: { not: "DONE" }, assignment: { isActive: true } }, orderBy: { assignment: { dueAt: "asc" } }, take: 20, include: { assignment: { select: { id: true, title: true, dueAt: true } } } }),
    prisma.reviewItem.findMany({ where: { studentId, status: "ACTIVE" }, orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }], take: 20, select: { id: true, title: true, dueAt: true, sourceType: true } }),
    prisma.lessonOutcome.findMany({ where: { evidenceType: "NEEDS_REVIEW", lesson: { status: "COMPLETED", group: { enrollments: { some: { studentId, endedAt: null } } } } }, orderBy: { createdAt: "desc" }, take: 10, select: { outcomeId: true, outcome: { select: { title: true } } } }),
    prisma.recoveryPackage.findMany({ where: { studentId, status: "PUBLISHED" }, orderBy: { dueAt: "asc" }, take: 5, select: { id: true, dueAt: true, lesson: { select: { title: true } } } }),
  ]);

  const baseCandidates: PlanCandidate[] = [
    ...assignmentRows.map((row) => ({ sourceType: "ASSIGNMENT" as const, sourceReferenceId: row.assignment.id, title: row.assignment.title, durationMinutes: 30, reasonCode: "DUE_SOON" as const, priority: row.assignment.dueAt <= inTwoWeeks ? 100 : 70, dueAt: row.assignment.dueAt })),
    ...reviewRows.map((row) => ({ sourceType: "REVIEW" as const, sourceReferenceId: row.id, title: row.title, durationMinutes: 15, reasonCode: row.sourceType === "LESSON_OUTCOME" ? "NEEDS_REVIEW" as const : "REVIEW_DUE" as const, priority: row.dueAt <= now ? 95 : 65, dueAt: row.dueAt })),
    ...recoveryRows.map((row) => ({ sourceType: "RECOVERY" as const, sourceReferenceId: row.id, title: `Telafi · ${row.lesson.title}`, durationMinutes: 20, reasonCode: "MISSED_LESSON" as const, priority: 120, dueAt: row.dueAt })),
  ];
  const supportSnapshot: SupportSnapshot = {
    attendance: { total: 0, absent: 0 },
    overdueWork: baseCandidates.filter((candidate) => candidate.reasonCode === "DUE_SOON").length,
    repeatedReviewDifficulty: weakRows.length,
    stalledPlanTasks: 0,
    examInactivity: preference.nextExamAt ? { expectedBy: preference.nextExamAt, missedCount: 0 } : null,
    generalInactivity: { daysSinceActivity: 0, activeEnrollment: true },
    overwhelmPulse: preference.overwhelmPulse,
    coachingConcern: null,
  };
  const supportCandidates = buildSupportSignals(supportSnapshot, now).flatMap((signal): PlanCandidate[] => {
    if (signal.type === "OVERDUE_WORK") return baseCandidates.filter((candidate) => candidate.reasonCode === "DUE_SOON").slice(0, 3).map((candidate) => ({ ...candidate, priority: Math.max(candidate.priority, 80), dueAt: candidate.dueAt ?? now }));
    if (signal.type === "REPEATED_REVIEW_DIFFICULTY") return baseCandidates.filter((candidate) => candidate.reasonCode === "NEEDS_REVIEW").slice(0, 3).map((candidate) => ({ ...candidate, priority: Math.max(candidate.priority, 78), dueAt: candidate.dueAt ?? now }));
    if (signal.type === "EXAM_INACTIVITY") return preference.nextExamAt ? [{ sourceType: "EXAM_PREP" as const, title: `${preference.examLabel || "Yaklaşan sınav"} için deneme`, durationMinutes: 25, reasonCode: "EXAM_APPROACHING" as const, priority: 82, dueAt: preference.nextExamAt }] : [];
    if (signal.type === "REPEATED_OVERWHELM") return baseCandidates.filter((candidate) => candidate.reasonCode === "CAPACITY_BALANCE").slice(0, 1).map((candidate) => ({ ...candidate, priority: Math.max(candidate.priority, 90), dueAt: candidate.dueAt ?? now }));
    return [];
  });
  const seen = new Set<string>();
  const candidates = [...baseCandidates, ...supportCandidates].filter((candidate) => {
    const key = `${candidate.sourceType}:${candidate.sourceReferenceId || candidate.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const representedOutcomes = new Set(reviewRows.map((row) => row.sourceType === "LESSON_OUTCOME" ? row.title : ""));
  for (const row of new Map(weakRows.map((item) => [item.outcomeId, item])).values()) {
    if (!representedOutcomes.has(row.outcome.title)) candidates.push({ sourceType: "WEAK_OUTCOME", sourceReferenceId: row.outcomeId, title: row.outcome.title, durationMinutes: 20, reasonCode: "NEEDS_REVIEW", priority: 75 });
  }
  if (preference.nextExamAt && preference.nextExamAt >= now && preference.nextExamAt <= inTwoWeeks) candidates.push({ sourceType: "EXAM_PREP", title: `${preference.examLabel || "Yaklaşan sınav"} için kısa hazırlık`, durationMinutes: 25, reasonCode: "EXAM_APPROACHING", priority: 85, dueAt: preference.nextExamAt });
  return candidates;
}
