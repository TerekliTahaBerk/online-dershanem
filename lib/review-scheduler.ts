import type { ReviewResponse } from "@prisma/client";

export const reviewIntervalsDays = [1, 3, 7, 14, 30] as const;
export const dailyReviewLimit = 5;

export type ReviewScheduleResult = { stage: number; dueAt: Date | null; mastered: boolean; intervalDays: (typeof reviewIntervalsDays)[number] | null };

function addDays(date: Date, days: number) { return new Date(date.getTime() + days * 86400000); }

/**
 * Deterministic and intentionally non-punitive. A wrong answer returns to a
 * short interval; it never erases attempt history or emits a failure score.
 */
export function scheduleReview(stage: number, response: ReviewResponse, now = new Date()): ReviewScheduleResult {
  const safeStage = Math.max(0, Math.min(reviewIntervalsDays.length - 1, Math.trunc(stage)));
  if (response === "CORRECT" && safeStage === reviewIntervalsDays.length - 1) return { stage: safeStage, dueAt: null, mastered: true, intervalDays: null };
  const nextStage = response === "CORRECT" ? safeStage + 1 : response === "UNSURE" ? Math.max(0, safeStage - 1) : 0;
  const intervalDays = reviewIntervalsDays[nextStage];
  return { stage: nextStage, dueAt: addDays(now, intervalDays), mastered: false, intervalDays };
}

export function initialReviewDueAt(sourceAt: Date, now = new Date()): Date {
  const planned = addDays(sourceAt, reviewIntervalsDays[0]);
  return planned > now ? planned : now;
}

export function sameLocalDay(a: Date, b: Date): boolean {
  const key = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return key(a) === key(b);
}
