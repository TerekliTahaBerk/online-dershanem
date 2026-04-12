import type { PurchaseStatus } from "@prisma/client";

export type LeadSubmissionInput = {
  fullName: string;
  phone: string;
  classLevel: string;
  examType: string;
  targetGoal: string;
  currentNet: string;
  parentPhone?: string;
  kvkkConsent: boolean;
  source: string;
  formType: "FUNNEL" | "INLINE";
  notes?: string;
  submittedAt: string;
};

export type PurchaseSubmissionInput = {
  studentFullName: string;
  studentPhone: string;
  studentEmail: string;
  schoolName: string;
  city: string;
  district: string;
  classLevel: string;
  department?: string;
  examType: string;
  targetSchool?: string;
  targetRanking: string;
  currentLevel: string;
  currentNet: string;
  weakLessons: string;
  strongLessons?: string;
  needType: string;
  studyStatus: string;
  weeklyStudyHours: string;
  parentFullName?: string;
  parentPhone?: string;
  parentEmail?: string;
  packageName: string;
  paymentLink?: string;
  source: string;
  notes?: string;
  kvkkConsent: boolean;
  paymentConsent: boolean;
  submittedAt: string;
};

export type PurchaseWebhookInput = {
  purchaseId?: string;
  provider: string;
  eventType: string;
  status: PurchaseStatus;
  providerReference?: string;
  amount?: number;
  currency?: string;
  payload?: Record<string, unknown>;
};
