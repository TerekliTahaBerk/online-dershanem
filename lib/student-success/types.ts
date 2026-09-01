/**
 * Student Success Layer — paylaşılan tip modeli.
 *
 * Üç ürün (OD, OK, ODK) aynı öğrenci kimliği ve akademik taksonomi üzerinde
 * birleşik öğrenci başarı sistemini destekler.
 */

import type { ProductCode } from "@prisma/client";

export const STUDENT_SUCCESS_PRODUCT_LABELS: Record<ProductCode, string> = {
  OD: "Dershanem",
  OK: "Koçum",
  ODK: "Deneme Kulübü",
};

export type UnifiedCalendarEventType =
  | "LESSON"
  | "ASSIGNMENT_DUE"
  | "COACHING_TASK"
  | "MOCK_EXAM"
  | "COACHING_SESSION"
  | "OTHER";

export type UnifiedCalendarEvent = {
  id: string;
  type: UnifiedCalendarEventType;
  product: ProductCode | null;
  productLabel: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  href: string | null;
  sourceId: string;
  sourceType: string;
};

export type UnifiedTodayItem = {
  id: string;
  kind: UnifiedCalendarEventType;
  product: ProductCode | null;
  productLabel: string;
  title: string;
  subtitle: string | null;
  startsAt: Date | null;
  dueAt: Date | null;
  priority: number;
  href: string | null;
  sourceExplanation: string | null;
};

export type ProgressEvidenceInput = {
  studentId: string;
  outcomeId: string;
  sourceType: "LESSON" | "ASSIGNMENT" | "COACHING_TASK" | "MOCK_EXAM" | "REVIEW" | "TEACHER_ASSESSMENT";
  sourceId: string;
  productCode: ProductCode;
  summary: string;
  metrics: Record<string, unknown>;
  occurredAt: Date;
};

export type OutcomeMasteryLevel =
  | "NOT_STARTED"
  | "INTRODUCED"
  | "PRACTICING"
  | "DEVELOPING"
  | "MASTERED"
  | "NEEDS_REVIEW";

export const OUTCOME_MASTERY_LABELS: Record<OutcomeMasteryLevel, string> = {
  NOT_STARTED: "Başlanmadı",
  INTRODUCED: "Tanışıldı",
  PRACTICING: "Uygulama",
  DEVELOPING: "Gelişiyor",
  MASTERED: "Yeterli",
  NEEDS_REVIEW: "Tekrar gerekli",
};

export type MasteryExplanationLine = {
  source: string;
  detail: string;
};

export type OutcomeProfileRow = {
  outcomeId: string;
  code: string;
  title: string;
  subjectName: string;
  unitName: string;
  status: OutcomeMasteryLevel;
  statusLabel: string;
  lastWorkedAt: Date | null;
  explanation: MasteryExplanationLine[];
  evidence: {
    lesson: string | null;
    assignment: string | null;
    mockExam: string | null;
    coaching: string | null;
  };
};

export type StudentProgressSummary = {
  studentId: string;
  computedAt: Date;
  products: ProductCode[];
  attendance: { percent: number | null; numerator: number; denominator: number };
  assignmentCompletion: { percent: number | null; numerator: number; denominator: number };
  coachingPlanCompletion: { percent: number | null; numerator: number; denominator: number };
  latestExamTrend: { netDelta: number | null; examTitle: string | null } | null;
  outcomeSummary: { needsReview: number; mastered: number; total: number };
  risks: string[];
  nextActions: string[];
};

export type RecommendationLifecycleStatus =
  | "SUGGESTED"
  | "ACCEPTED"
  | "DISMISSED"
  | "APPLIED"
  | "EXPIRED";

export type UnifiedTimelineEntry = {
  id: string;
  occurredAt: Date;
  title: string;
  summary: string | null;
  product: ProductCode | null;
  productLabel: string | null;
  kind: string;
};

export type TeacherLearningSignal = {
  outcomeId: string;
  outcomeTitle: string;
  subjectName: string;
  unitName: string;
  studentCount: number;
  needsReviewCount: number;
  signals: string[];
  suggestion: string;
};

export type GroupLearningGap = {
  groupId: string;
  groupName: string;
  outcomeId: string;
  outcomeTitle: string;
  studentCount: number;
  needsReviewCount: number;
  suggestion: string;
};

export type ViewerRole = "ADMIN" | "TEACHER" | "PARENT" | "STUDENT";
