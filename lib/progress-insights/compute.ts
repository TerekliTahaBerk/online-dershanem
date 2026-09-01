import { netScore } from "@/lib/goals";
import { buildTrendCaption, selectLatestSixChronological } from "@/lib/student-progress-trend";
import {
  buildSubjectTrendSentence,
  subjectTrendDirection,
} from "@/lib/panel/parent-calm";
import type {
  AcademicInsights,
  AreaHighlight,
  BehavioralInsights,
  NetTrendPoint,
  ProgressInsightBundle,
  ProgressInsightPeriod,
  RateStat,
  SubjectTrendSeries,
  TrendDirection,
} from "@/lib/progress-insights/types";
import { PROGRESS_INSIGHT_SERIES_COLORS } from "@/lib/progress-insights/types";

export type ExamSectionInput = {
  subjectName: string;
  correctCount: number;
  incorrectCount: number;
};

export type ExamInput = {
  takenAt: Date;
  sections: ExamSectionInput[];
};

export type AttendanceInput = {
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | string;
};

export type AssignmentInput = {
  done: boolean;
};

export type PlanTaskInput = {
  done: boolean;
};

export type ComputeProgressInput = {
  studentId: string;
  studentName: string;
  period: ProgressInsightPeriod;
  exams: ExamInput[];
  attendance: AttendanceInput[];
  assignments: AssignmentInput[];
  planTasks: PlanTaskInput[];
  /** Öğretmen/admin risk cümlesi; veli strip eder. */
  riskHint?: string | null;
  /** false ise akademik deneme bloğu boş bırakılır (feature kapalı). */
  includeExams?: boolean;
};

function rateStat(numerator: number, denominator: number): RateStat {
  if (denominator <= 0) {
    return { percent: null, numerator: 0, denominator: 0 };
  }
  return {
    percent: Math.round((numerator / denominator) * 100),
    numerator,
    denominator,
  };
}

function netFromSection(section: ExamSectionInput): number {
  return Number(netScore(section.correctCount, section.incorrectCount).toFixed(2));
}

function totalNet(exam: ExamInput): number {
  return Number(
    exam.sections.reduce((sum, s) => sum + netScore(s.correctCount, s.incorrectCount), 0).toFixed(2),
  );
}

function directionFromNets(nets: number[]): TrendDirection {
  return subjectTrendDirection(nets);
}

export function buildAcademicInsights(
  exams: ExamInput[],
  options: { includeExams?: boolean; labelFormat?: (d: Date, index: number) => string } = {},
): AcademicInsights {
  if (options.includeExams === false) {
    return {
      examCount: 0,
      netTrend: [],
      netDelta: null,
      subjectSeries: [],
      labels: [],
      strengths: [],
      supportAreas: [],
      subjectCaption: undefined,
    };
  }

  const selected = selectLatestSixChronological(exams);
  const labelFormat =
    options.labelFormat ??
    ((_d: Date, index: number) => `D${index + 1}`);

  const netTrend: NetTrendPoint[] = selected.map((exam, i) => ({
    label: labelFormat(exam.takenAt, i),
    net: totalNet(exam),
    takenAt: exam.takenAt.toISOString(),
  }));

  const netDelta =
    netTrend.length >= 2
      ? Number((netTrend[netTrend.length - 1]!.net - netTrend[0]!.net).toFixed(2))
      : null;

  const subjectNames = [
    ...new Set(selected.flatMap((exam) => exam.sections.map((s) => s.subjectName))),
  ];

  const subjectSeries: SubjectTrendSeries[] = subjectNames.map((name, idx) => {
    const nets = selected.map((exam) => {
      const section = exam.sections.find((s) => s.subjectName === name);
      return section ? netFromSection(section) : null;
    });
    const actual = nets.filter((n): n is number => n !== null);
    return {
      name,
      color: PROGRESS_INSIGHT_SERIES_COLORS[idx % PROGRESS_INSIGHT_SERIES_COLORS.length]!,
      nets,
      direction: directionFromNets(actual),
    };
  });

  const highlights: AreaHighlight[] = subjectSeries.map((series) => {
    const actual = series.nets.filter((n): n is number => n !== null);
    const built = buildSubjectTrendSentence(series.name, actual);
    return {
      subject: built.subject,
      direction: built.direction,
      sentence: built.sentence,
    };
  });

  const strengths = highlights
    .filter((h) => h.direction === "up" || h.direction === "steady")
    .slice(0, 3);
  const supportAreas = highlights.filter((h) => h.direction === "down").slice(0, 3);

  const labels = selected.map((exam, i) => labelFormat(exam.takenAt, i));

  return {
    examCount: selected.length,
    netTrend,
    netDelta,
    subjectSeries,
    labels,
    strengths,
    supportAreas,
    subjectCaption: buildTrendCaption(subjectSeries),
  };
}

export function buildBehavioralInsights(input: {
  attendance: AttendanceInput[];
  assignments: AssignmentInput[];
  planTasks: PlanTaskInput[];
}): BehavioralInsights {
  const attended = input.attendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE",
  ).length;
  const doneAssignments = input.assignments.filter((a) => a.done).length;
  const donePlan = input.planTasks.filter((t) => t.done).length;

  return {
    attendance: rateStat(attended, input.attendance.length),
    assignments: rateStat(doneAssignments, input.assignments.length),
    plan: rateStat(donePlan, input.planTasks.length),
  };
}

export function isInsightBundleEmpty(
  academic: AcademicInsights,
  behavioral: BehavioralInsights,
): boolean {
  const hasAcademic = academic.examCount > 0;
  const hasBehavioral =
    behavioral.attendance.denominator > 0 ||
    behavioral.assignments.denominator > 0 ||
    behavioral.plan.denominator > 0;
  return !hasAcademic && !hasBehavioral;
}

/**
 * Saf hesap: DB'ye dokunmaz. Anlatım (`narrative`) çağıran tarafça
 * `buildNarrativeForAudience` ile doldurulur.
 */
export function computeProgressInsightBundle(
  input: ComputeProgressInput,
): Omit<ProgressInsightBundle, "narrative"> & { narrative: string[] } {
  const academic = buildAcademicInsights(input.exams, {
    includeExams: input.includeExams,
  });
  const behavioral = buildBehavioralInsights({
    attendance: input.attendance,
    assignments: input.assignments,
    planTasks: input.planTasks,
  });

  return {
    studentId: input.studentId,
    studentName: input.studentName,
    period: input.period,
    academic,
    behavioral,
    narrative: [],
    isEmpty: isInsightBundleEmpty(academic, behavioral),
    riskHint: input.riskHint ?? null,
  };
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
  }
  return Math.round(sorted[mid]! * 10) / 10;
}

export function averageNullable(values: Array<number | null>): number | null {
  const actual = values.filter((v): v is number => v !== null);
  if (!actual.length) return null;
  return Math.round((actual.reduce((s, v) => s + v, 0) / actual.length) * 10) / 10;
}

/** Davranış veya akademik gerileme: düşen gidişat bayrağı. */
export function isDecliningGidisat(input: {
  netDelta: number | null;
  attendancePercent: number | null;
  assignmentPercent: number | null;
  planPercent: number | null;
}): boolean {
  if (input.netDelta !== null && input.netDelta <= -1.5) return true;
  if (input.attendancePercent !== null && input.attendancePercent < 70) return true;
  if (input.assignmentPercent !== null && input.assignmentPercent < 50) return true;
  if (input.planPercent !== null && input.planPercent < 50) return true;
  return false;
}
