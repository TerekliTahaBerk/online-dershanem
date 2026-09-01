/**
 * Online Koçum suggestion bridge — otomatik plan publish etmez.
 */

export type CoachSuggestion = {
  subject: string;
  topic: string;
  outcomeCode: string;
  outcomeTitle: string;
  questionCount: number;
  correctCount: number;
  accuracyRate: number;
  cta: "ADD_TO_WEEKLY_PLAN";
  label: string;
};

export function buildCoachSuggestions(
  outcomes: Array<{ code: string; title: string; unitName: string; questionCount: number; correctCount: number; accuracyRate: number }>,
  limit = 5,
): CoachSuggestion[] {
  return [...outcomes]
    .filter((item) => item.questionCount > 0 && item.accuracyRate < 70)
    .sort((a, b) => a.accuracyRate - b.accuracyRate || b.questionCount - a.questionCount)
    .slice(0, limit)
    .map((item) => ({
      subject: item.unitName,
      topic: item.title,
      outcomeCode: item.code,
      outcomeTitle: item.title,
      questionCount: item.questionCount,
      correctCount: item.correctCount,
      accuracyRate: item.accuracyRate,
      cta: "ADD_TO_WEEKLY_PLAN" as const,
      label: `${item.unitName} → ${item.title}\n${item.questionCount} soru, ${item.correctCount} doğru`,
    }));
}
