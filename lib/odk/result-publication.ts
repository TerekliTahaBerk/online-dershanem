/**
 * Sonuç yayınlama preview + skor/publication ayrımı.
 * scoreStatus = CALCULATED ≠ publicationStatus = HIDDEN|PUBLISHED
 */

export type PublishCandidate = {
  attemptId: string;
  studentLabel: string;
  hasScore: boolean;
  scoringError?: boolean;
  integrityLevel?: "NORMAL" | "REVIEW" | "HIGH";
  reviewRequired?: boolean;
};

export type PublishPreview = {
  totalCandidates: number;
  publishable: number;
  reviewRequired: number;
  scoringErrors: number;
  warnings: string[];
  canPublish: boolean;
  excludedAttemptIds: string[];
};

export function previewResultPublication(
  candidates: PublishCandidate[],
  options: { excludeReviewRequired?: boolean } = {},
): PublishPreview {
  const scoringErrors = candidates.filter((item) => item.scoringError || !item.hasScore).length;
  const reviewRequired = candidates.filter((item) => item.reviewRequired || item.integrityLevel === "HIGH" || item.integrityLevel === "REVIEW").length;
  const excluded = options.excludeReviewRequired
    ? candidates.filter((item) => item.reviewRequired || item.integrityLevel === "HIGH" || item.integrityLevel === "REVIEW").map((item) => item.attemptId)
    : [];
  const publishable = candidates.filter((item) => item.hasScore && !item.scoringError && !excluded.includes(item.attemptId)).length;
  const warnings: string[] = [];
  if (reviewRequired) warnings.push(`${reviewRequired} sonuç inceleme bekliyor.`);
  if (scoringErrors) warnings.push(`${scoringErrors} scoring hatası var.`);
  if (!publishable) warnings.push("Yayınlanacak puanlanmış sonuç yok.");

  return {
    totalCandidates: candidates.length,
    publishable,
    reviewRequired,
    scoringErrors,
    warnings,
    canPublish: publishable > 0 && scoringErrors === 0,
    excludedAttemptIds: excluded,
  };
}

export type RescoreImpact = {
  attemptCount: number;
  changedQuestions: number;
  publishedResultsWillChange: boolean;
};

export function previewRescoreImpact(input: {
  attemptCount: number;
  changedQuestionCount: number;
  hasPublishedResults: boolean;
}): RescoreImpact {
  return {
    attemptCount: input.attemptCount,
    changedQuestions: input.changedQuestionCount,
    publishedResultsWillChange: input.hasPublishedResults && input.changedQuestionCount > 0,
  };
}
