export type OutcomeEvidence = {
  examId: string;
  takenAt: Date;
  outcomeId: string;
  code: string;
  title: string;
  unitName: string;
  questionCount: number;
  accuracyRate: number;
};

export type OutcomeTrend = {
  outcomeId: string;
  code: string;
  title: string;
  unitName: string;
  latestAccuracy: number;
  previousAccuracy: number | null;
  delta: number | null;
  evidenceCount: number;
  questionCount: number;
};

export type WeakOutcomeSignal = {
  outcomeId: string;
  code: string;
  title: string;
  unitName: string;
  latestAccuracy: number;
  previousAccuracy: number | null;
  delta: number | null;
  evidenceCount: number;
  questionCount: number;
  latestQuestionCount: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  confidenceScore: number;
  priority: number;
  needsReview: boolean;
};

export function buildOutcomeTrends(rows: OutcomeEvidence[]): OutcomeTrend[] {
  const grouped = new Map<string, OutcomeEvidence[]>();
  for (const row of rows) grouped.set(row.outcomeId, [...(grouped.get(row.outcomeId) || []), row]);
  return [...grouped.entries()].map(([outcomeId, evidence]) => {
    const ordered = [...evidence].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
    const latest = ordered.at(-1)!;
    const previous = ordered.length > 1 ? ordered.at(-2)! : null;
    return {
      outcomeId,
      code: latest.code,
      title: latest.title,
      unitName: latest.unitName,
      latestAccuracy: latest.accuracyRate,
      previousAccuracy: previous?.accuracyRate ?? null,
      delta: previous ? Math.round((latest.accuracyRate - previous.accuracyRate) * 100) / 100 : null,
      evidenceCount: new Set(ordered.map((item) => item.examId)).size,
      questionCount: ordered.reduce((sum, item) => sum + item.questionCount, 0),
    };
  }).sort((a, b) => a.latestAccuracy - b.latestAccuracy || a.code.localeCompare(b.code, "tr"));
}

export function buildWeakOutcomeSignals(input: {
  latestScores: Array<Pick<OutcomeEvidence, "outcomeId" | "code" | "title" | "unitName" | "questionCount" | "accuracyRate">>;
  trends: OutcomeTrend[];
}): WeakOutcomeSignal[] {
  const trendByOutcomeId = new Map(input.trends.map((trend) => [trend.outcomeId, trend]));
  return input.latestScores.map((latest): WeakOutcomeSignal => {
    const trend = trendByOutcomeId.get(latest.outcomeId);
    const evidenceCount = trend?.evidenceCount ?? 1;
    const questionCount = trend?.questionCount ?? latest.questionCount;
    const previousAccuracy = trend?.previousAccuracy ?? null;
    const delta = trend?.delta ?? null;
    const priorMeasurements = Math.max(0, evidenceCount - 1);
    const confidenceScore = Math.max(
      0,
      Math.min(
        1,
        (evidenceCount >= 2 ? 0.45 : 0.15)
          + Math.min(0.35, questionCount / 20)
          + (priorMeasurements > 0 ? 0.2 : 0)
          + (latest.questionCount >= 3 ? 0.1 : 0),
      ),
    );
    const confidence = confidenceScore < 0.4 ? "LOW" : confidenceScore < 0.7 ? "MEDIUM" : "HIGH";
    const baseRisk = (100 - latest.accuracyRate)
      + (delta !== null && delta < 0 ? Math.min(18, -delta * 0.7) : 0)
      - (delta !== null && delta > 0 ? Math.min(10, delta * 0.45) : 0)
      - (latest.questionCount < 3 ? 8 : 0);
    const conservativeBase = Math.max(0, 55 - latest.accuracyRate);
    const weightedRisk = baseRisk * confidenceScore + conservativeBase * (1 - confidenceScore);
    const priority = Math.round(Math.max(0, Math.min(100, weightedRisk)));
    const needsReview = latest.accuracyRate < 60 && priority >= 28 && confidenceScore >= 0.4;
    return {
      outcomeId: latest.outcomeId,
      code: latest.code,
      title: latest.title,
      unitName: latest.unitName,
      latestAccuracy: latest.accuracyRate,
      previousAccuracy,
      delta,
      evidenceCount,
      questionCount,
      latestQuestionCount: latest.questionCount,
      confidence,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      priority,
      needsReview,
    };
  }).sort((a, b) => b.priority - a.priority || a.latestAccuracy - b.latestAccuracy || a.code.localeCompare(b.code, "tr"));
}
