/**
 * Role-safe presenters — sunucu tarafında DTO dönüşümü.
 *
 * Parent response içinden admin alanları frontend'e bırakılmaz.
 */

import type { OutcomeProfileRow, StudentProgressSummary, UnifiedTimelineEntry, ViewerRole } from "./types";
import { OUTCOME_MASTERY_LABELS } from "./types";

export type AdminStudentSummary = StudentProgressSummary & {
  internalRiskScore: null;
  operationFlags: string[];
};

export type TeacherStudentSummary = StudentProgressSummary & {
  learningSignals: string[];
  prepSuggestions: string[];
};

export type ParentStudentSummary = {
  studentId: string;
  computedAt: Date;
  weekSummary: {
    lessonAttendance: string;
    planCompletion: string;
    assignments: string;
    latestExam: string | null;
  };
  focusAreas: string[];
  nextWeek: string[];
};

export type StudentSelfSummary = StudentProgressSummary & {
  todayCount: number;
  whatNext: string | null;
};

function stripInternalFields(summary: StudentProgressSummary): StudentProgressSummary {
  return { ...summary };
}

export function presentForAdmin(summary: StudentProgressSummary, operationFlags: string[] = []): AdminStudentSummary {
  return {
    ...stripInternalFields(summary),
    internalRiskScore: null,
    operationFlags,
  };
}

export function presentForTeacher(
  summary: StudentProgressSummary,
  learningSignals: string[],
  prepSuggestions: string[],
): TeacherStudentSummary {
  return {
    ...stripInternalFields(summary),
    learningSignals,
    prepSuggestions,
  };
}

export function presentForParent(input: {
  summary: StudentProgressSummary;
  focusAreas: string[];
  nextWeek: string[];
}): ParentStudentSummary {
  return {
    studentId: input.summary.studentId,
    computedAt: input.summary.computedAt,
    weekSummary: {
      lessonAttendance:
        input.summary.attendance.percent !== null
          ? `Derslere katılım %${Math.round(input.summary.attendance.percent)}`
          : "Ders katılım verisi yok",
      planCompletion:
        input.summary.coachingPlanCompletion.percent !== null
          ? `Planın %${Math.round(input.summary.coachingPlanCompletion.percent)}'i tamamlandı`
          : "Plan verisi yok",
      assignments:
        input.summary.assignmentCompletion.percent !== null
          ? `${input.summary.assignmentCompletion.numerator} / ${input.summary.assignmentCompletion.denominator} ödev tamamlandı`
          : "Ödev verisi yok",
      latestExam: input.summary.latestExamTrend?.examTitle
        ? `${input.summary.latestExamTrend.examTitle}${input.summary.latestExamTrend.netDelta !== null ? ` (${input.summary.latestExamTrend.netDelta >= 0 ? "+" : ""}${input.summary.latestExamTrend.netDelta.toFixed(2)} net)` : ""}`
        : null,
    },
    focusAreas: input.focusAreas,
    nextWeek: input.nextWeek,
  };
}

export function presentForStudent(
  summary: StudentProgressSummary,
  todayCount: number,
  whatNext: string | null,
): StudentSelfSummary {
  return {
    ...stripInternalFields(summary),
    todayCount,
    whatNext,
  };
}

export function presentOutcomeProfile(
  rows: OutcomeProfileRow[],
  role: ViewerRole,
): OutcomeProfileRow[] {
  if (role === "PARENT") {
    return rows.map((row) => ({
      ...row,
      explanation: row.explanation.slice(0, 3),
    }));
  }
  return rows;
}

export function presentTimeline(
  entries: UnifiedTimelineEntry[],
  role: ViewerRole,
): UnifiedTimelineEntry[] {
  if (role === "PARENT" || role === "STUDENT") {
    return entries.filter((entry) => entry.kind !== "INTERVENTION");
  }
  return entries;
}

export function outcomeStatusLabel(status: keyof typeof OUTCOME_MASTERY_LABELS): string {
  return OUTCOME_MASTERY_LABELS[status];
}
