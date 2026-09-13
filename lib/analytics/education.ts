import { ratePercent } from "@/lib/analytics/rates";

export type EducationCounts = {
  activeStudents: number;
  activeGroups: number;
  attendancePresentOrLate: number;
  attendanceTotal: number;
  assignmentDone: number;
  assignmentProgressTotal: number;
  planTasksDone: number;
  planTasksTotal: number;
  mockExamParticipants: number;
  riskCritical: number;
  riskWatch: number;
  interventionsOpened: number;
};

export type EducationMetrics = {
  activeStudents: number;
  activeGroups: number;
  lessonAttendancePercent: number | null;
  assignmentCompletionPercent: number | null;
  weeklyPlanCompletionPercent: number | null;
  mockExamParticipationPercent: number | null;
  risk: { critical: number; watch: number; normal: number; total: number };
  interventionRatePercent: number | null;
};

export function calculateEducationMetrics(input: EducationCounts): EducationMetrics {
  const accounted = input.riskCritical + input.riskWatch;
  const normal = Math.max(0, input.activeStudents - accounted);

  return {
    activeStudents: input.activeStudents,
    activeGroups: input.activeGroups,
    lessonAttendancePercent: ratePercent(input.attendancePresentOrLate, input.attendanceTotal),
    assignmentCompletionPercent: ratePercent(input.assignmentDone, input.assignmentProgressTotal),
    weeklyPlanCompletionPercent: ratePercent(input.planTasksDone, input.planTasksTotal),
    mockExamParticipationPercent: ratePercent(input.mockExamParticipants, input.activeStudents),
    risk: {
      critical: input.riskCritical,
      watch: input.riskWatch,
      normal,
      total: input.activeStudents,
    },
    interventionRatePercent: ratePercent(input.interventionsOpened, input.activeStudents),
  };
}
