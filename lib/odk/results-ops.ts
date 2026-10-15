/**
 * Yönetim sonuç inceleme özetleri — katılım, section averages, integrity.
 */

export type AttemptResultRow = {
  attemptId: string;
  studentName: string;
  status: string;
  correctCount: number | null;
  wrongCount: number | null;
  blankCount: number | null;
  totalNet: number | null;
  durationSeconds: number | null;
  integrityLevel: "NORMAL" | "REVIEW" | "HIGH";
  publicationStatus: "HIDDEN" | "PUBLISHED" | null;
  scoringError: boolean;
};

export type ExamResultsSummary = {
  participation: number;
  submitted: number;
  missing: number;
  averageNet: number | null;
  medianNet: number | null;
  integrityReviewCount: number;
  scoringErrors: number;
  sectionAverages: Array<{ code: string; title: string; averageNet: number | null; averageAccuracy: number | null }>;
  /** Alt test ortalamaları (Faz 6): yalnız şablon görüntüsüyle puanlanmış denemelerde dolu. */
  subtestAverages: Array<{ sectionCode: string; code: string; title: string; averageNet: number | null; averageAccuracy: number | null }>;
  rows: AttemptResultRow[];
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export type SectionBreakdownRow = {
  code?: string;
  sectionId?: string;
  title: string;
  net?: number;
  accuracy?: number;
  correct?: number;
  questionCount?: number;
  subtests?: Array<{ code: string; title: string; questionCount: number; correct: number; net: number }>;
};

export function buildExamResultsSummary(input: {
  assignmentCount: number;
  attempts: Array<{
    id: string;
    studentName: string;
    status: string;
    integrityLevel: "NORMAL" | "REVIEW" | "HIGH";
    startedAt: Date;
    submittedAt: Date | null;
    score: null | {
      correctCount: number;
      wrongCount: number;
      blankCount: number;
      totalNet: number;
      publicationStatus: "HIDDEN" | "PUBLISHED";
      activeDurationMs?: number | null;
      /** Puanlama motoru `SectionScore` ({sectionId, questionCount, correct}) yazar; eski/sentetik satırlar `code`/`accuracy` taşıyabilir. */
      sectionBreakdown?: Array<SectionBreakdownRow> | null;
    };
  }>;
}): ExamResultsSummary {
  const submittedStatuses = new Set(["SUBMITTED", "AUTO_SUBMITTED", "REVIEW_REQUIRED"]);
  const submitted = input.attempts.filter((item) => submittedStatuses.has(item.status));
  const nets = submitted.flatMap((item) => (item.score ? [item.score.totalNet] : []));
  const scoringErrors = submitted.filter((item) => !item.score).length;
  const integrityReviewCount = input.attempts.filter((item) => item.integrityLevel !== "NORMAL").length;

  const sectionBuckets = new Map<string, { title: string; nets: number[]; accuracies: number[] }>();
  for (const attempt of submitted) {
    for (const section of attempt.score?.sectionBreakdown || []) {
      const code = section.code ?? section.sectionId;
      if (!code) continue;
      const bucket = sectionBuckets.get(code) || { title: section.title, nets: [], accuracies: [] };
      if (typeof section.net === "number") bucket.nets.push(section.net);
      const accuracy = typeof section.accuracy === "number" ? section.accuracy : typeof section.correct === "number" && section.questionCount ? (section.correct / section.questionCount) * 100 : null;
      if (accuracy != null) bucket.accuracies.push(accuracy);
      sectionBuckets.set(code, bucket);
    }
  }

  const subtestBuckets = new Map<string, { sectionCode: string; code: string; title: string; nets: number[]; accuracies: number[] }>();
  for (const attempt of submitted) {
    for (const section of attempt.score?.sectionBreakdown || []) {
      const sectionCode = section.code ?? section.sectionId;
      if (!sectionCode) continue;
      for (const subtest of section.subtests ?? []) {
        const key = `${sectionCode}:${subtest.code}`;
        const bucket = subtestBuckets.get(key) || { sectionCode, code: subtest.code, title: subtest.title, nets: [], accuracies: [] };
        bucket.nets.push(subtest.net);
        if (subtest.questionCount) bucket.accuracies.push((subtest.correct / subtest.questionCount) * 100);
        subtestBuckets.set(key, bucket);
      }
    }
  }
  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

  return {
    participation: input.attempts.length,
    submitted: submitted.length,
    missing: Math.max(0, input.assignmentCount - submitted.length),
    averageNet: nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : null,
    medianNet: median(nets),
    integrityReviewCount,
    scoringErrors,
    sectionAverages: [...sectionBuckets.entries()].map(([code, bucket]) => ({
      code,
      title: bucket.title,
      averageNet: bucket.nets.length ? bucket.nets.reduce((a, b) => a + b, 0) / bucket.nets.length : null,
      averageAccuracy: bucket.accuracies.length ? bucket.accuracies.reduce((a, b) => a + b, 0) / bucket.accuracies.length : null,
    })),
    subtestAverages: [...subtestBuckets.values()].map((bucket) => ({ sectionCode: bucket.sectionCode, code: bucket.code, title: bucket.title, averageNet: mean(bucket.nets), averageAccuracy: mean(bucket.accuracies) })),
    rows: input.attempts.map((attempt) => ({
      attemptId: attempt.id,
      studentName: attempt.studentName,
      status: attempt.status,
      correctCount: attempt.score?.correctCount ?? null,
      wrongCount: attempt.score?.wrongCount ?? null,
      blankCount: attempt.score?.blankCount ?? null,
      totalNet: attempt.score?.totalNet ?? null,
      durationSeconds: attempt.score?.activeDurationMs != null
        ? Math.round(attempt.score.activeDurationMs / 1000)
        : attempt.submittedAt
          ? Math.max(0, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000))
          : null,
      integrityLevel: attempt.integrityLevel,
      publicationStatus: attempt.score?.publicationStatus ?? null,
      scoringError: submittedStatuses.has(attempt.status) && !attempt.score,
    })),
  };
}
