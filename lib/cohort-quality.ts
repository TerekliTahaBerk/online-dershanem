export const COHORT_QUALITY_RULE_VERSION = "cohort-gain-v1" as const;
export const COHORT_MIN_STUDENTS = 10;
export const COHORT_MIN_GAP_DAYS = 14;

export type CohortExamType = "LGS" | "TYT" | "AYT" | "YDT";

export type CohortExamObservation = {
  studentKey: string;
  exam: CohortExamType;
  takenAt: Date;
  sections: Array<{ questionCount: number; correctCount: number; incorrectCount: number }>;
};

export type CohortGain = {
  exam: CohortExamType;
  status: "READY" | "INSUFFICIENT_SAMPLE";
  pairedStudents: number;
  observedStudents: number;
  coveragePercent: number | null;
  medianChange: number | null;
  lowerQuartile: number | null;
  upperQuartile: number | null;
  positiveChangePercent: number | null;
  medianGapDays: number | null;
  dataThrough: Date | null;
};

const dayMs = 86_400_000;

function round(value: number) { return Math.round(value * 10) / 10; }

function percentile(sorted: number[], ratio: number) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index); const upper = Math.ceil(index);
  return round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}

export function normalizedNetPercent(observation: CohortExamObservation) {
  const divisor = observation.exam === "LGS" ? 3 : 4;
  const questions = observation.sections.reduce((sum, item) => sum + item.questionCount, 0);
  if (!questions) return null;
  const net = observation.sections.reduce((sum, item) => sum + item.correctCount - item.incorrectCount / divisor, 0);
  return round((net / questions) * 100);
}

export function calculateCohortGains(observations: CohortExamObservation[]): CohortGain[] {
  const exams: CohortExamType[] = ["LGS", "TYT", "AYT", "YDT"];
  return exams.map((exam) => {
    const rows = observations.filter((row) => row.exam === exam && normalizedNetPercent(row) !== null).sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
    const byStudent = new Map<string, CohortExamObservation[]>();
    for (const row of rows) byStudent.set(row.studentKey, [...(byStudent.get(row.studentKey) || []), row]);
    const pairs = [...byStudent.values()].flatMap((studentRows) => {
      const first = studentRows[0];
      const last = [...studentRows].reverse().find((item) => item.takenAt.getTime() - first.takenAt.getTime() >= COHORT_MIN_GAP_DAYS * dayMs);
      if (!last) return [];
      return [{ change: normalizedNetPercent(last)! - normalizedNetPercent(first)!, gapDays: Math.round((last.takenAt.getTime() - first.takenAt.getTime()) / dayMs), dataThrough: last.takenAt }];
    });
    const changes = pairs.map((pair) => pair.change).sort((a, b) => a - b);
    const gaps = pairs.map((pair) => pair.gapDays).sort((a, b) => a - b);
    const ready = pairs.length >= COHORT_MIN_STUDENTS;
    return {
      exam,
      status: ready ? "READY" : "INSUFFICIENT_SAMPLE",
      pairedStudents: pairs.length,
      observedStudents: byStudent.size,
      coveragePercent: byStudent.size ? Math.round((pairs.length / byStudent.size) * 100) : null,
      medianChange: ready ? percentile(changes, 0.5) : null,
      lowerQuartile: ready ? percentile(changes, 0.25) : null,
      upperQuartile: ready ? percentile(changes, 0.75) : null,
      positiveChangePercent: ready ? Math.round((changes.filter((value) => value > 0).length / changes.length) * 100) : null,
      medianGapDays: ready ? percentile(gaps, 0.5) : null,
      dataThrough: pairs.length ? new Date(Math.max(...pairs.map((pair) => pair.dataThrough.getTime()))) : null,
    };
  });
}

export function cohortSampleBand(count: number): "0-9" | "10-24" | "25-99" | "100+" {
  if (count < 10) return "0-9";
  if (count < 25) return "10-24";
  if (count < 100) return "25-99";
  return "100+";
}
