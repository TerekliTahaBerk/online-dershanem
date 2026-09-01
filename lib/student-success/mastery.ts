/**
 * Outcome mastery — açıklanabilir weighted evidence modeli.
 *
 * Black-box skor yok; her sonuç evidence satırlarından türetilir.
 */

import type { MasteryExplanationLine, OutcomeMasteryLevel, ProgressEvidenceInput } from "./types";

export type EvidenceSignal = {
  sourceType: ProgressEvidenceInput["sourceType"];
  summary: string;
  metrics: Record<string, unknown>;
  occurredAt: Date;
  weight: number;
};

const SOURCE_WEIGHTS: Record<ProgressEvidenceInput["sourceType"], number> = {
  TEACHER_ASSESSMENT: 1.0,
  MOCK_EXAM: 0.9,
  ASSIGNMENT: 0.75,
  COACHING_TASK: 0.6,
  REVIEW: 0.55,
  LESSON: 0.4,
};

const RECENCY_HALF_LIFE_DAYS = 21;

function recencyMultiplier(occurredAt: Date, now: Date): number {
  const ageDays = (now.getTime() - occurredAt.getTime()) / 86400000;
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

function accuracyFromMetrics(metrics: Record<string, unknown>): number | null {
  const correct = typeof metrics.correctCount === "number" ? metrics.correctCount : null;
  const total = typeof metrics.questionCount === "number" ? metrics.questionCount : null;
  if (correct === null || total === null || total <= 0) return null;
  return correct / total;
}

function signalScore(signal: EvidenceSignal, now: Date): number {
  const base = signal.weight * recencyMultiplier(signal.occurredAt, now);
  const accuracy = accuracyFromMetrics(signal.metrics);
  if (accuracy !== null) return base * (0.3 + accuracy * 0.7);
  if (signal.metrics.evidenceType === "NEEDS_REVIEW") return base * 0.25;
  if (signal.metrics.evidenceType === "TAUGHT") return base * 0.5;
  if (signal.metrics.evidenceType === "OBSERVED") return base * 0.6;
  if (signal.metrics.evidenceType === "INDEPENDENT") return base * 0.85;
  if (signal.metrics.completed === true) return base * 0.7;
  return base * 0.55;
}

export function evidenceToSignal(evidence: ProgressEvidenceInput): EvidenceSignal {
  return {
    sourceType: evidence.sourceType,
    summary: evidence.summary,
    metrics: evidence.metrics,
    occurredAt: evidence.occurredAt,
    weight: SOURCE_WEIGHTS[evidence.sourceType],
  };
}

export type MasteryComputation = {
  status: OutcomeMasteryLevel;
  score: number;
  explanation: MasteryExplanationLine[];
  evidenceCount: number;
};

const SOURCE_LABELS: Record<ProgressEvidenceInput["sourceType"], string> = {
  LESSON: "Ders",
  ASSIGNMENT: "Ödev",
  COACHING_TASK: "Koçum",
  MOCK_EXAM: "Deneme",
  REVIEW: "Tekrar",
  TEACHER_ASSESSMENT: "Öğretmen",
};

export function computeOutcomeMastery(
  signals: EvidenceSignal[],
  now = new Date(),
): MasteryComputation {
  if (!signals.length) {
    return {
      status: "NOT_STARTED",
      score: 0,
      explanation: [{ source: "Sistem", detail: "Bu kazanım için henüz kanıt yok." }],
      evidenceCount: 0,
    };
  }

  const sorted = [...signals].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const scored = sorted.map((signal) => ({
    signal,
    value: signalScore(signal, now),
  }));
  const totalWeight = scored.reduce((sum, row) => sum + row.value, 0);
  const avgScore = totalWeight / scored.length;

  const latestMock = sorted.find((s) => s.sourceType === "MOCK_EXAM");
  const latestAssignment = sorted.find((s) => s.sourceType === "ASSIGNMENT");
  const latestLesson = sorted.find((s) => s.sourceType === "LESSON");
  const latestReview = sorted.find((s) => s.sourceType === "REVIEW" || s.sourceType === "COACHING_TASK");

  const explanation: MasteryExplanationLine[] = [];

  if (latestMock) {
    const acc = accuracyFromMetrics(latestMock.metrics);
    if (acc !== null) {
      explanation.push({
        source: "Deneme",
        detail: `Son denemede ${latestMock.metrics.questionCount} sorudan ${latestMock.metrics.correctCount} doğru (${Math.round(acc * 100)}%).`,
      });
    }
  }
  if (latestAssignment) {
    const acc = accuracyFromMetrics(latestAssignment.metrics);
    if (acc !== null) {
      explanation.push({
        source: "Ödev",
        detail: `Son ödevde başarı %${Math.round(acc * 100)}.`,
      });
    }
  }
  if (latestLesson?.metrics.evidenceType === "NEEDS_REVIEW") {
    explanation.push({
      source: "Ders",
      detail: "Öğretmen bu kazanımda tekrar gerektiğini işaretledi.",
    });
  }
  const daysSinceReview = latestReview
    ? Math.floor((now.getTime() - latestReview.occurredAt.getTime()) / 86400000)
    : null;
  if (daysSinceReview !== null && daysSinceReview >= 14) {
    explanation.push({
      source: "Tekrar",
      detail: `Kazanım ${daysSinceReview} gündür tekrar edilmedi.`,
    });
  }

  let status: OutcomeMasteryLevel;
  const latestNeedsReview =
    latestLesson?.metrics.evidenceType === "NEEDS_REVIEW" ||
    (latestMock && (accuracyFromMetrics(latestMock.metrics) ?? 1) < 0.5);

  if (latestNeedsReview && avgScore < 0.55) {
    status = "NEEDS_REVIEW";
  } else if (avgScore >= 0.8 && scored.length >= 3) {
    status = "MASTERED";
  } else if (avgScore >= 0.65) {
    status = "DEVELOPING";
  } else if (avgScore >= 0.45 || sorted.some((s) => s.sourceType === "ASSIGNMENT" || s.sourceType === "MOCK_EXAM")) {
    status = "PRACTICING";
  } else if (sorted.some((s) => s.sourceType === "LESSON")) {
    status = "INTRODUCED";
  } else {
    status = "NOT_STARTED";
  }

  if (explanation.length === 0) {
    const top = scored[0]?.signal;
    if (top) {
      explanation.push({
        source: SOURCE_LABELS[top.sourceType],
        detail: top.summary,
      });
    }
  }

  return { status, score: avgScore, explanation, evidenceCount: signals.length };
}

export function groupNeedsReviewOutcomes(
  rows: Array<{ outcomeId: string; status: OutcomeMasteryLevel }>,
): Set<string> {
  return new Set(rows.filter((row) => row.status === "NEEDS_REVIEW").map((row) => row.outcomeId));
}
