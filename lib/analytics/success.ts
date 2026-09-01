import { suppressCohortMetric, type SuppressibleMetric } from "@/lib/analytics/privacy";
import { ratePercent } from "@/lib/analytics/rates";
import { MANAGEMENT_ANALYTICS_COHORT_MIN } from "@/lib/analytics/definitions";
import {
  calculateCohortGains,
  type CohortExamObservation,
  type CohortGain,
} from "@/lib/cohort-quality";

export type SubjectProgressRow = {
  subjectCode: string;
  subjectName: string;
  pairedStudents: number;
  medianChange: number | null;
};

export type SuccessCounts = {
  observations: CohortExamObservation[];
  /** subjectCode → paired change values (percent points). */
  subjectChanges: Array<{
    subjectCode: string;
    subjectName: string;
    changes: number[];
  }>;
  lessonsCompleted: number;
  lessonsCompletedWithOutcome: number;
  planCompletionPercent: number | null;
  planSampleSize: number;
  mockParticipationPercent: number | null;
  mockSampleSize: number;
};

export type SuccessMetrics = {
  mockExamTrends: CohortGain[];
  subjectProgress: SuppressibleMetric<SubjectProgressRow>[];
  outcomeProgress: SuppressibleMetric<number>;
  planAlignmentVsOutcome: SuppressibleMetric<{
    planCompletionPercent: number | null;
    mockParticipationPercent: number | null;
  }>;
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
  }
  return Math.round(sorted[mid]! * 10) / 10;
}

export function calculateSuccessMetrics(input: SuccessCounts): SuccessMetrics {
  const trends = calculateCohortGains(input.observations);

  const subjectProgress = input.subjectChanges.map((row) => {
    const med = median(row.changes);
    const suppressed = suppressCohortMetric(row.changes.length, {
      subjectCode: row.subjectCode,
      subjectName: row.subjectName,
      pairedStudents: row.changes.length,
      medianChange: med,
    });
    return suppressed;
  });

  const outcomeRate = ratePercent(input.lessonsCompletedWithOutcome, input.lessonsCompleted);
  const outcomeProgress = suppressCohortMetric(input.lessonsCompleted, outcomeRate);

  const alignmentSample = Math.min(input.planSampleSize, input.mockSampleSize);
  const planAlignmentVsOutcome = suppressCohortMetric(alignmentSample, {
    planCompletionPercent: input.planCompletionPercent,
    mockParticipationPercent: input.mockParticipationPercent,
  });

  return {
    mockExamTrends: trends,
    subjectProgress,
    outcomeProgress,
    planAlignmentVsOutcome,
  };
}

export { MANAGEMENT_ANALYTICS_COHORT_MIN };
