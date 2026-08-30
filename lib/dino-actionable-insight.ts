export type DinoInsightReview = {
  id: string;
  outcomeId: string | null;
  title: string;
  sourceType: "MOCK_EXAM_SECTION" | "LESSON_OUTCOME" | "TEACHER_REFERENCE";
  dueAt: Date;
  latestResponse: "WRONG" | "UNSURE" | "CORRECT" | null;
};

export type DinoInsightEvidence = {
  outcomeId: string;
  title: string;
  createdAt: Date;
};

export type DinoInsightPlanTask = {
  title: string;
  durationMinutes: number;
  sourceType: "REVIEW" | "WEAK_OUTCOME";
  sourceReferenceId: string | null;
};

export type ActionableDinoInsightDraft = {
  insight: string;
  basis: string;
  target: "PLAN" | "REVIEW";
};

const DAY_MS = 86_400_000;

function reviewBasis(review: DinoInsightReview): string {
  const source = review.sourceType === "LESSON_OUTCOME"
    ? "öğretmenin derste verdiği “tekrar gerekli” işareti"
    : review.sourceType === "MOCK_EXAM_SECTION"
      ? "zamanı gelen deneme tekrarı"
      : "öğretmenin eklediği tekrar kaydı";
  const response = review.latestResponse === "WRONG"
    ? "; son tekrar başarısız"
    : review.latestResponse === "UNSURE"
      ? "; son tekrarda emin değildi"
      : review.latestResponse === "CORRECT"
        ? "; son tekrar başarılı"
        : "";
  return `Dayanak: ${source}${response}.`;
}

function evidenceBasis(evidence: DinoInsightEvidence, now: Date): string {
  const ageDays = Math.max(0, Math.floor((now.getTime() - evidence.createdAt.getTime()) / DAY_MS));
  const age = ageDays === 0 ? "bugünkü" : ageDays === 1 ? "dünkü" : `${ageDays} gün önceki`;
  return `Dayanak: ${age} derste verilen “tekrar gerekli” işareti.`;
}

/**
 * Bir model çağrısı yapmadan, yalnız güvenli first-party kayıtlarından tek bir
 * sonraki adım seçer. Bu fonksiyon hiçbir kaydı değiştirmez.
 */
export function buildActionableDinoInsight(input: {
  now: Date;
  planTasks: DinoInsightPlanTask[];
  reviews: DinoInsightReview[];
  evidence: DinoInsightEvidence[];
}): ActionableDinoInsightDraft | null {
  const reviewById = new Map(input.reviews.map((review) => [review.id, review]));
  const evidenceByOutcome = new Map(input.evidence.map((item) => [item.outcomeId, item]));

  for (const task of input.planTasks) {
    if (!task.sourceReferenceId) continue;
    const review = task.sourceType === "REVIEW" ? reviewById.get(task.sourceReferenceId) : null;
    const lessonEvidence = task.sourceType === "WEAK_OUTCOME" ? evidenceByOutcome.get(task.sourceReferenceId) : null;
    const basis = review ? reviewBasis(review) : lessonEvidence ? evidenceBasis(lessonEvidence, input.now) : null;
    if (!basis) continue;
    return {
      insight: `Bugünkü plana başlamak için ${task.durationMinutes} dk'lık “${task.title}” görevini seç.`,
      basis,
      target: "PLAN",
    };
  }

  const dueReview = input.reviews.find((review) => review.dueAt <= input.now);
  if (dueReview) {
    return {
      insight: `Bugün 15 dakikalık “${dueReview.title}” tekrarıyla başla.`,
      basis: reviewBasis(dueReview),
      target: "REVIEW",
    };
  }

  const latestEvidence = input.evidence[0];
  if (latestEvidence) {
    return {
      insight: `Bugün 20 dakika “${latestEvidence.title}” kazanımını tekrar et.`,
      basis: evidenceBasis(latestEvidence, input.now),
      target: "REVIEW",
    };
  }
  return null;
}
