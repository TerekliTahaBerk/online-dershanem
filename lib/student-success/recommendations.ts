/**
 * Deterministic recommendation rules — human-in-the-loop lifecycle.
 *
 * Öneriler otomatik publish edilmez; SUGGESTED → ACCEPTED/DISMISSED → APPLIED.
 */

import type { RecommendationLifecycleStatus } from "./types";

export type RecommendationRuleInput = {
  mockExamAccuracy?: number | null;
  mockExamQuestionCount?: number;
  assignmentAccuracy?: number | null;
  lessonMissed?: boolean;
  planCompletionPercent?: number | null;
  hasOkEntitlement: boolean;
  hasOdEntitlement: boolean;
};

export type RecommendationDraft = {
  kind:
    | "REVIEW_TASK"
    | "TOPIC_REPEAT"
    | "OUTCOME_REPEAT"
    | "QUESTION_SET"
    | "SPEED_PRACTICE"
    | "MINI_MOCK"
    | "RECOVERY_PACKAGE"
    | "COACH_REVIEW"
    | "LESSON_PREP";
  sourceType: "MOCK_EXAM" | "ASSIGNMENT" | "RECOVERY" | "REVIEW_ENGINE" | "LESSON_CLOSE" | "COACH";
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
};

const MOCK_EXAM_WEAK_THRESHOLD = 0.55;
const ASSIGNMENT_WEAK_THRESHOLD = 0.6;
const PLAN_LOW_THRESHOLD = 50;

export function generateRecommendations(input: RecommendationRuleInput & {
  outcomeTitle?: string;
  outcomeCode?: string;
  examTitle?: string;
  sourceId: string;
}): RecommendationDraft[] {
  const results: RecommendationDraft[] = [];

  if (
    input.mockExamAccuracy !== null &&
    input.mockExamAccuracy !== undefined &&
    input.mockExamQuestionCount &&
    input.mockExamQuestionCount >= 2 &&
    input.mockExamAccuracy < MOCK_EXAM_WEAK_THRESHOLD
  ) {
    const wrong = Math.round(input.mockExamQuestionCount * (1 - input.mockExamAccuracy));
    results.push({
      kind: "OUTCOME_REPEAT",
      sourceType: "MOCK_EXAM",
      title: input.outcomeTitle ?? "Kazanım tekrarı",
      rationale: `${input.examTitle ?? "Deneme"} sonucunda ${input.mockExamQuestionCount} sorudan ${wrong} yanlış.`,
      payload: {
        outcomeCode: input.outcomeCode,
        suggestedQuestions: Math.max(20, input.mockExamQuestionCount * 10),
        suggestedMinutes: 30,
        sourceExamId: input.sourceId,
      },
    });
  }

  if (
    input.assignmentAccuracy !== null &&
    input.assignmentAccuracy !== undefined &&
    input.assignmentAccuracy < ASSIGNMENT_WEAK_THRESHOLD
  ) {
    results.push({
      kind: "QUESTION_SET",
      sourceType: "ASSIGNMENT",
      title: input.outcomeTitle ?? "Ödev pekiştirme",
      rationale: `Ödev başarısı %${Math.round(input.assignmentAccuracy * 100)} — ek tekrar önerilir.`,
      payload: { assignmentId: input.sourceId, suggestedQuestions: 20 },
    });
  }

  if (input.lessonMissed) {
    results.push({
      kind: "RECOVERY_PACKAGE",
      sourceType: "RECOVERY",
      title: "Telafi paketi",
      rationale: "Kaçırılan ders için kayıt izleme, materyal ve soru seti önerilir.",
      payload: { recoveryPackageId: input.sourceId },
    });
  }

  if (
    input.hasOkEntitlement &&
    input.planCompletionPercent !== null &&
    input.planCompletionPercent !== undefined &&
    input.planCompletionPercent < PLAN_LOW_THRESHOLD
  ) {
    results.push({
      kind: "COACH_REVIEW",
      sourceType: "COACH",
      title: "Plan gözden geçirme",
      rationale: `Plan tamamlama %${Math.round(input.planCompletionPercent)} — koç incelemesi önerilir.`,
      payload: { planCompletionPercent: input.planCompletionPercent },
    });
  }

  return results;
}

export function canTransitionRecommendation(
  from: RecommendationLifecycleStatus,
  to: RecommendationLifecycleStatus,
): boolean {
  const allowed: Record<RecommendationLifecycleStatus, RecommendationLifecycleStatus[]> = {
    SUGGESTED: ["ACCEPTED", "DISMISSED", "EXPIRED"],
    ACCEPTED: ["APPLIED", "DISMISSED"],
    APPLIED: [],
    DISMISSED: [],
    EXPIRED: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

export function recommendationStatusLabel(status: RecommendationLifecycleStatus): string {
  return {
    SUGGESTED: "Önerildi",
    ACCEPTED: "Kabul edildi",
    DISMISSED: "Reddedildi",
    APPLIED: "Uygulandı",
    EXPIRED: "Süresi doldu",
  }[status];
}
