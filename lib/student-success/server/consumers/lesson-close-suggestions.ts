import "server-only";

import type { CrossProductEventOutbox } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { istanbulWeekStart } from "@/lib/istanbul-time";
import { getStudentProducts, parseEventPayload } from "@/lib/student-success/server/event-processor";
import { shouldCreateCoachingRecommendation } from "@/lib/student-success/entitlements";

/**
 * Ders kapanışı → Koçum suggested tasks (onay bekler).
 */
export async function consumeLessonCloseSuggestions(event: CrossProductEventOutbox): Promise<void> {
  const payload = parseEventPayload("LESSON_COMPLETED", event.payload);
  if (!payload.outcomeIds.length) return;

  const student = await prisma.studentProfile.findUnique({
    where: { id: event.studentId },
    select: { userId: true },
  });
  if (!student) return;

  const products = await getStudentProducts(student.userId);
  if (!shouldCreateCoachingRecommendation(products)) return;

  const weekStart = istanbulWeekStart(event.occurredAt);
  const needsReviewOutcomes = await prisma.lessonOutcome.findMany({
    where: {
      lessonId: payload.lessonId,
      outcomeId: { in: payload.outcomeIds },
      evidenceType: "NEEDS_REVIEW",
    },
    select: { outcome: { select: { id: true, title: true, code: true } } },
  });

  for (const row of needsReviewOutcomes) {
    const existing = await prisma.weeklyPlanSuggestion.findFirst({
      where: {
        studentId: event.studentId,
        weekStart,
        kind: "REVIEW_QUEUE",
        status: "PENDING",
        title: row.outcome.title,
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.weeklyPlanSuggestion.create({
      data: {
        studentId: event.studentId,
        weekStart,
        kind: "REVIEW_QUEUE",
        status: "PENDING",
        title: row.outcome.title,
        rationale: `${payload.topic ?? "Ders"} kapanışında tekrar gerekti.`,
        payload: {
          source: "LESSON_CLOSE",
          lessonId: payload.lessonId,
          outcomeId: row.outcome.id,
          outcomeCode: row.outcome.code,
          suggestedQuestions: 20,
          suggestedMinutes: 30,
        },
        createdBySystem: true,
      },
    });

    await prisma.crossProductRecommendation.create({
      data: {
        studentId: event.studentId,
        sourceType: "LESSON_CLOSE",
        sourceId: payload.lessonId,
        kind: "OUTCOME_REPEAT",
        title: row.outcome.title,
        rationale: "Ders kapanışında öğretmen tekrar gerektiğini işaretledi.",
        payload: {
          outcomeId: row.outcome.id,
          outcomeCode: row.outcome.code,
          suggestedQuestions: 20,
          suggestedMinutes: 30,
        },
      },
    });
  }
}
