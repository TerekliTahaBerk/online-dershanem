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
  /**
   * Plan bir insan tarafından değil, ürün politikası gereği sistemce onaylandı.
   * Onaylı ama otomatik onaylı bir planı kilitleyen bir koç kararı yoktur.
   */
  autoApproved: boolean;
  tasks: Task[];
};

/**
 * Planın ürününden gelen onay politikası. `false` olduğunda öğrenciye onay
 * bekleme / koça gönderme arayüzü HİÇ gösterilmez: bekleyeceği bir onay yoktur.
 */
export type PlanApprovalPolicyView = {
  requiresApproval: boolean;
};

/** Sınav geri sayımı — yalnız hedef sınav tarihi olan ürünlerde (KPSS) dolu gelir. */
export type ExamCountdownView = {
  tier: "FAR" | "APPROACHING" | "NEAR" | "FINAL_WEEK";
  weeksRemaining: number;
  examLabel: string | null;
  examAt: string;
};

export type CoachingSnapshot = {
  coachName: string;
  nextScheduledAt: string | null;
  sharedNote: string | null;
  focus: string | null;
  overdue: boolean;
};

export type StudentAdaptivePlanProps = {
  initialPreference: Preference;
  initialPlan: Plan | null;
  initialCoaching: CoachingSnapshot | null;
  initialCoachSummary?: CoachSummarySnippet | null;
  upcomingExams?: UpcomingExam[];
  today: string;
  /**
   * Varsayılan `true`: çağıran taraf bu bilgiyi vermezse davranış mevcut
   * Online Koçum akışıdır (onay bekleyen plan, koç bölümü görünür).
   */
  requiresApproval?: boolean;
  examCountdown?: ExamCountdownView | null;
};
export type TaskCardProps = { task: Task; canComplete: boolean; highlighted: boolean; onStart: (task: Task) => void; onOpenComplete: (task: Task, status: CompletionDraft["status"]) => void; draft: CompletionDraft | null; onDraftChange: (next: CompletionDraft) => void; onSubmitComplete: (task: Task) => void; onCancelComplete: () => void; busy: boolean };
export type PreferenceFieldsProps = { preference: Preference; setPreference: Dispatch<SetStateAction<Preference>> };
