/**
 * Soru odak süreleri ve zaman analizi yardımcıları.
 */

export type QuestionTimingInput = {
  questionId: string;
  sectionCode?: string;
  sectionTitle?: string;
  result?: "CORRECT" | "WRONG" | "BLANK" | null;
  activeDurationMs: number;
};

export type SectionTimeSummary = {
  sectionCode: string;
  sectionTitle: string;
  totalActiveMs: number;
  correctAvgMs: number | null;
  wrongAvgMs: number | null;
  questionCount: number;
};

export function aggregateQuestionTimings(rows: QuestionTimingInput[]) {
  const bySection = new Map<string, { title: string; total: number; correct: number[]; wrong: number[]; count: number }>();
  const ranked = [...rows].sort((a, b) => b.activeDurationMs - a.activeDurationMs);
  const fastWrongs = rows.filter((row) => row.result === "WRONG" && row.activeDurationMs > 0 && row.activeDurationMs < 30_000)
    .sort((a, b) => a.activeDurationMs - b.activeDurationMs);
  const longWrongs = rows.filter((row) => row.result === "WRONG" && row.activeDurationMs >= 120_000)
    .sort((a, b) => b.activeDurationMs - a.activeDurationMs);

  for (const row of rows) {
    const code = row.sectionCode || "UNKNOWN";
    const bucket = bySection.get(code) || { title: row.sectionTitle || code, total: 0, correct: [], wrong: [], count: 0 };
    bucket.total += row.activeDurationMs;
    bucket.count += 1;
    if (row.result === "CORRECT") bucket.correct.push(row.activeDurationMs);
    if (row.result === "WRONG") bucket.wrong.push(row.activeDurationMs);
    bySection.set(code, bucket);
  }

  const sections: SectionTimeSummary[] = [...bySection.entries()].map(([sectionCode, bucket]) => ({
    sectionCode,
    sectionTitle: bucket.title,
    totalActiveMs: bucket.total,
    correctAvgMs: bucket.correct.length ? Math.round(bucket.correct.reduce((a, b) => a + b, 0) / bucket.correct.length) : null,
    wrongAvgMs: bucket.wrong.length ? Math.round(bucket.wrong.reduce((a, b) => a + b, 0) / bucket.wrong.length) : null,
    questionCount: bucket.count,
  }));

  return {
    mostTimeSpent: ranked.slice(0, 10),
    fastWrongs: fastWrongs.slice(0, 10),
    longWrongs: longWrongs.slice(0, 10),
    sections,
  };
}

export function mergeVisitDuration(existingMs: number, deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return existingMs;
  return existingMs + Math.min(deltaMs, 30 * 60_000);
}

/** Visibility hidden iken süre sayılmaz — caller document.visibilityState kontrol eder. */
export function visibleElapsedMs(enteredAt: number, leftAt: number, wasVisible: boolean): number {
  if (!wasVisible) return 0;
  return Math.max(0, leftAt - enteredAt);
}
