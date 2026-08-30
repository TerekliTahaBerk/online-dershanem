import "server-only";
import type { StudentPlanPreference } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PlanCandidate, ReviewSignal } from "@/lib/adaptive-plan";

const DAY_MS = 86_400_000;

export async function collectPlanCandidates(studentId: string, preference: StudentPlanPreference, now = new Date()): Promise<PlanCandidate[]> {
  const inTwoWeeks = new Date(now.getTime() + 14 * DAY_MS);
  const [assignmentRows, reviewRows, outcomeEvidenceRows, recoveryRows] = await Promise.all([
    prisma.assignmentProgress.findMany({
      where: { studentId, status: { not: "DONE" }, assignment: { isActive: true } },
      orderBy: { assignment: { dueAt: "asc" } },
      take: 20,
      select: { updatedAt: true, assignment: { select: { id: true, title: true, dueAt: true, createdAt: true } } },
    }),
    prisma.reviewItem.findMany({
      where: { studentId, status: "ACTIVE" },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 20,
      select: {
        id: true, title: true, dueAt: true, sourceType: true, outcomeId: true, createdAt: true, lastReviewedAt: true,
        attempts: { orderBy: { reviewedAt: "desc" }, take: 4, select: { response: true, reviewedAt: true } },
      },
    }),
    prisma.lessonOutcome.findMany({
      where: { lesson: { status: "COMPLETED", group: { enrollments: { some: { studentId, endedAt: null } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { outcomeId: true, evidenceType: true, createdAt: true, outcome: { select: { title: true } } },
    }),
    prisma.recoveryPackage.findMany({
      where: { studentId, status: "PUBLISHED" },
      orderBy: { dueAt: "asc" },
      take: 5,
      select: { id: true, dueAt: true, publishedAt: true, createdAt: true, lesson: { select: { title: true } } },
    }),
  ]);

  const candidates: PlanCandidate[] = [
    ...assignmentRows.map((row) => ({
      sourceType: "ASSIGNMENT" as const,
      sourceReferenceId: row.assignment.id,
      title: row.assignment.title,
      durationMinutes: 30,
      reasonCode: "DUE_SOON" as const,
      dueAt: row.assignment.dueAt,
      evidenceAt: row.updatedAt > row.assignment.createdAt ? row.updatedAt : row.assignment.createdAt,
      evidenceCount: 1,
    })),
    ...reviewRows.map((row) => {
      const latestResponse = row.attempts[0]?.response as ReviewSignal | undefined;
      const hasCorrect = row.attempts.some((attempt) => attempt.response === "CORRECT");
      const hasDifficulty = row.attempts.some((attempt) => attempt.response === "WRONG" || attempt.response === "UNSURE");
      return {
        sourceType: "REVIEW" as const,
        sourceReferenceId: row.id,
        title: row.title,
        durationMinutes: 15,
        reasonCode: row.sourceType === "LESSON_OUTCOME" ? "NEEDS_REVIEW" as const : "REVIEW_DUE" as const,
        dueAt: row.dueAt,
        evidenceAt: row.attempts[0]?.reviewedAt || row.lastReviewedAt || row.createdAt,
        evidenceCount: 1 + row.attempts.length,
        latestReviewResponse: latestResponse,
        hasConflictingEvidence: hasCorrect && hasDifficulty,
      };
    }),
    ...recoveryRows.map((row) => ({
      sourceType: "RECOVERY" as const,
      sourceReferenceId: row.id,
      title: `Telafi · ${row.lesson.title}`,
      durationMinutes: 20,
      reasonCode: "MISSED_LESSON" as const,
      dueAt: row.dueAt,
      evidenceAt: row.publishedAt || row.createdAt,
      evidenceCount: 1,
    })),
  ];

  const representedOutcomeIds = new Set(reviewRows.flatMap((row) => row.sourceType === "LESSON_OUTCOME" && row.outcomeId ? [row.outcomeId] : []));
  const evidenceByOutcome = new Map<string, typeof outcomeEvidenceRows>();
  for (const row of outcomeEvidenceRows) evidenceByOutcome.set(row.outcomeId, [...(evidenceByOutcome.get(row.outcomeId) || []), row]);
  for (const [outcomeId, evidence] of evidenceByOutcome) {
    if (representedOutcomeIds.has(outcomeId)) continue;
    const reviewEvidence = evidence.filter((item) => item.evidenceType === "NEEDS_REVIEW");
    if (!reviewEvidence.length) continue;
    const latestReview = reviewEvidence[0];
    const recentCutoff = new Date(latestReview.createdAt.getTime() - 30 * DAY_MS);
    const hasPositiveEvidence = evidence.some((item) => item.evidenceType !== "NEEDS_REVIEW" && item.createdAt >= recentCutoff);
    candidates.push({
      sourceType: "WEAK_OUTCOME",
      sourceReferenceId: outcomeId,
      title: latestReview.outcome.title,
      durationMinutes: 20,
      reasonCode: "NEEDS_REVIEW",
      evidenceAt: latestReview.createdAt,
      evidenceCount: reviewEvidence.length,
      hasConflictingEvidence: hasPositiveEvidence,
    });
  }

  if (preference.nextExamAt && preference.nextExamAt >= now && preference.nextExamAt <= inTwoWeeks) {
    candidates.push({
      sourceType: "EXAM_PREP",
      title: `${preference.examLabel || "Yaklaşan sınav"} için kısa hazırlık`,
      durationMinutes: 25,
      reasonCode: "EXAM_APPROACHING",
      dueAt: preference.nextExamAt,
      evidenceAt: preference.updatedAt,
      evidenceCount: 1,
    });
  }
  return candidates;
}
