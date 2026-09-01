import { ratePercent, round1 } from "@/lib/analytics/rates";

/**
 * Öğretmen operasyon metrikleri.
 * Sıralama / leaderboard / performans puanı üretmez.
 */

export type TeacherOpsCounts = {
  lessonsEligible: number;
  lessonsCompleted: number;
  openInterventions: number;
  overdueAssignmentProgress: number;
  pastPlannedLessons: number;
  interventionsCreated: number;
  interventionsResolved: number;
  activeEnrollments: number;
  distinctActiveTeachers: number;
};

export type TeacherOpsMetrics = {
  lessonCloseCompletionPercent: number | null;
  openWorkItems: number;
  interventionResolutionPercent: number | null;
  /** Ortalama öğrenci yükü; öğretmen kimliği yok. */
  averageStudentLoad: number | null;
};

export function calculateTeacherOpsMetrics(input: TeacherOpsCounts): TeacherOpsMetrics {
  return {
    lessonCloseCompletionPercent: ratePercent(input.lessonsCompleted, input.lessonsEligible),
    openWorkItems:
      input.openInterventions + input.overdueAssignmentProgress + input.pastPlannedLessons,
    interventionResolutionPercent: ratePercent(
      input.interventionsResolved,
      input.interventionsCreated,
    ),
    averageStudentLoad:
      input.distinctActiveTeachers > 0
        ? round1(input.activeEnrollments / input.distinctActiveTeachers)
        : null,
  };
}
