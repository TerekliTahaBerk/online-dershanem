export type LearningEvidenceRow = {
  outcomeId: string;
  code: string;
  title: string;
  subject: string;
  unit: string;
  skills: string[];
  type: "TAUGHT" | "OBSERVED" | "INDEPENDENT" | "NEEDS_REVIEW";
  occurredAt: Date;
  source: "LESSON" | "ASSIGNMENT";
};

export type LearningEvidenceSummary = {
  thisWeek: Array<LearningEvidenceRow & { evidenceCount: number }>;
  reviewNext: Array<LearningEvidenceRow & { evidenceCount: number }>;
};

/** No mastery score: latest teacher-verified evidence and repetition need only. */
export function summarizeLearningEvidence(rows: LearningEvidenceRow[], now = new Date()): LearningEvidenceSummary {
  const sinceWeek = new Date(now.getTime() - 7 * 86400000);
  const grouped = new Map<string, LearningEvidenceRow[]>();
  for (const row of rows) grouped.set(row.outcomeId, [...(grouped.get(row.outcomeId) || []), row]);
  const latest = [...grouped.values()].map((items) => {
    const sorted = [...items].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    return { ...sorted[0], evidenceCount: sorted.length };
  });
  return {
    thisWeek: latest.filter((item) => item.occurredAt >= sinceWeek).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 8),
    reviewNext: latest.filter((item) => item.type === "NEEDS_REVIEW").sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 2),
  };
}

export const evidenceTypeLabel = {
  TAUGHT: "İşlendi",
  OBSERVED: "Uygulaması gözlendi",
  INDEPENDENT: "Bağımsız uygulandı",
  NEEDS_REVIEW: "Tekrar planlandı",
} as const;
