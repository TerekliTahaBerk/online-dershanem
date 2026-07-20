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
