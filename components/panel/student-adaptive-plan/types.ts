/** Adaptif plan görünümü ve alt bileşenlerinin veri/prop sözleşmeleri. */
import type { Dispatch, SetStateAction } from "react";
import type { KocumTaskKind } from "@/lib/kocum/plan-tasks";
export type Preference = {
  availableDays: number[];
  minutesPerDay: number;
  nextExamAt: string | null;
  examLabel: string | null;
  planningEnabled: boolean;
  overwhelmPulse: number | null;
};

export type Task = {
  id: string;
  title: string;
  scheduledFor: string;
  durationMinutes: number;
  taskKind?: KocumTaskKind;
  sourceType:
    | "ASSIGNMENT"
    | "REVIEW"
    | "WEAK_OUTCOME"
    | "EXAM_PREP"
    | "RECOVERY"
    | "MANUAL_COACH"
    | "MOCK_EXAM"
    | "SYSTEM_SUGGESTED"
    | "TEMPLATE"
    | "PERSONAL_GOAL";
  reasonCode: "DUE_SOON" | "REVIEW_DUE" | "NEEDS_REVIEW" | "EXAM_APPROACHING" | "CAPACITY_BALANCE" | "MISSED_LESSON";
  status: "PLANNED" | "IN_PROGRESS" | "DONE" | "PARTIAL" | "COULD_NOT" | "SKIPPED";
  actualMinutes?: number | null;
  targetType?: "QUESTIONS" | "MINUTES" | "PAGES" | "VIDEOS" | "NONE" | null;
  targetValue?: number | null;
  actualQuestions?: number | null;
  subject?: string | null;
};

export type CompletionDraft = {
  status: "DONE" | "PARTIAL" | "COULD_NOT";
  actualQuestions: string;
  actualCorrect: string;
  actualIncorrect: string;
  actualBlank: string;
  actualMinutes: string;
  studentNote: string;
  difficultyFelt: string;
  energyFelt: string;
};

export type UpcomingExam = {
  id: string;
  title: string;
  startsAt: string;
};

export type CoachSummarySnippet = {
  studentVisibleText: string | null;
  strengths: string | null;
  focusAreas: string | null;
  nextWeekFocus: string | null;
};

export type Plan = {
  id: string;
  status: "DRAFT" | "APPROVED" | "CHANGE_REQUESTED" | "ARCHIVED";
  version: number;
  capacityMinutes: number;
  changeRequestCategory: string | null;
  tasks: Task[];
};

export type CoachingSnapshot = {
  coachName: string;
  nextScheduledAt: string | null;
  sharedNote: string | null;
  focus: string | null;
  overdue: boolean;
};

export type StudentAdaptivePlanProps = { initialPreference: Preference; initialPlan: Plan | null; initialCoaching: CoachingSnapshot | null; initialCoachSummary?: CoachSummarySnippet | null; upcomingExams?: UpcomingExam[]; today: string };
export type TaskCardProps = { task: Task; canComplete: boolean; highlighted: boolean; onStart: (task: Task) => void; onOpenComplete: (task: Task, status: CompletionDraft["status"]) => void; draft: CompletionDraft | null; onDraftChange: (next: CompletionDraft) => void; onSubmitComplete: (task: Task) => void; onCancelComplete: () => void; busy: boolean };
export type PreferenceFieldsProps = { preference: Preference; setPreference: Dispatch<SetStateAction<Preference>> };
