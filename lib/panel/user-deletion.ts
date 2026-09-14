import type { Prisma } from "@prisma/client";
import { z } from "zod";

export const userProfileUpdateSchema = z.object({
  email: z.string().min(3).max(254), fullName: z.string().trim().max(120).optional(), phone: z.string().trim().max(32).optional(),
  classLevel: z.string().trim().max(40).optional(), schoolName: z.string().trim().max(160).optional(), targetGoal: z.string().trim().max(500).optional(),
  subjects: z.array(z.string().trim().min(1).max(80)).max(20).optional(), bio: z.string().trim().max(1200).optional(),
});

export const USER_DELETE_COUNT_SELECT = {
  taughtGroups: true, taughtLessons: true, createdAssignments: true, createdMaterials: true,
  generatedRecoveryPackages: true, studentHelpResponses: true, requestedMfaResets: true, approvedMfaResets: true,
  createdCurriculums: true, linkedLessonOutcomes: true, linkedAssignmentOutcomes: true, createdMockExams: true,
  createdPilotCohorts: true, createdOdkPilotRuns: true, createdOdkExamSeries: true, createdOdkExams: true,
  createdOdkExamVersions: true, uploadedOdkExamFiles: true, odkExamAttempts: true, scoredOdkExamAttempts: true,
} as const;

export type DeleteBlocker = { code: string; label: string; count: number };
type DeleteCountSnapshot = Prisma.UserGetPayload<{ select: { _count: { select: typeof USER_DELETE_COUNT_SELECT } } }>["_count"];

export function collectDeleteBlockers(counts: DeleteCountSnapshot): DeleteBlocker[] {
  const blockers: DeleteBlocker[] = [];
  if (counts.taughtGroups > 0) blockers.push({ code: "taught_groups", label: "aktif/pasif grup sorumluluğu", count: counts.taughtGroups });
  if (counts.taughtLessons > 0) blockers.push({ code: "taught_lessons", label: "ders kayıtları", count: counts.taughtLessons });
  if (counts.createdAssignments > 0) blockers.push({ code: "created_assignments", label: "oluşturulmuş ödevler", count: counts.createdAssignments });
  if (counts.createdMaterials > 0) blockers.push({ code: "created_materials", label: "oluşturulmuş materyaller", count: counts.createdMaterials });
  if (counts.generatedRecoveryPackages > 0) blockers.push({ code: "recovery_packages", label: "oluşturulmuş telafi paketleri", count: counts.generatedRecoveryPackages });
  if (counts.studentHelpResponses > 0) blockers.push({ code: "student_help_responses", label: "öğrenci yardım yanıtları", count: counts.studentHelpResponses });
  if (counts.requestedMfaResets > 0 || counts.approvedMfaResets > 0) blockers.push({ code: "mfa_resets", label: "MFA sıfırlama kayıtları", count: counts.requestedMfaResets + counts.approvedMfaResets });
  if (counts.createdCurriculums > 0) blockers.push({ code: "created_curriculums", label: "oluşturulmuş müfredat sürümleri", count: counts.createdCurriculums });
  if (counts.linkedLessonOutcomes > 0 || counts.linkedAssignmentOutcomes > 0) blockers.push({ code: "outcome_links", label: "kazanım eşleştirme kayıtları", count: counts.linkedLessonOutcomes + counts.linkedAssignmentOutcomes });
  if (counts.createdMockExams > 0) blockers.push({ code: "mock_exams", label: "oluşturulmuş deneme analizleri", count: counts.createdMockExams });
  if (counts.createdPilotCohorts > 0 || counts.createdOdkPilotRuns > 0) blockers.push({ code: "pilot_rollout", label: "pilot rollout kayıtları", count: counts.createdPilotCohorts + counts.createdOdkPilotRuns });
  if (counts.createdOdkExamSeries > 0 || counts.createdOdkExams > 0 || counts.createdOdkExamVersions > 0 || counts.uploadedOdkExamFiles > 0) blockers.push({ code: "odk_exam_content", label: "ODK sınav içerik geçmişi", count: counts.createdOdkExamSeries + counts.createdOdkExams + counts.createdOdkExamVersions + counts.uploadedOdkExamFiles });
  if (counts.odkExamAttempts > 0 || counts.scoredOdkExamAttempts > 0) blockers.push({ code: "odk_exam_attempts", label: "ODK deneme sonuçları", count: counts.odkExamAttempts + counts.scoredOdkExamAttempts });
  return blockers;
}

export function formatDeleteBlockers(blockers: string[]): string {
  const shortlist = blockers.slice(0, 4);
  return shortlist.join(", ") + (blockers.length > shortlist.length ? ", …" : "");
}
