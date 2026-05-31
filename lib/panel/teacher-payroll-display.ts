/**
 * Phase 2 / Session 13 — Client-safe display helpers for teacher payroll.
 *
 * Pure functions and types with NO `server-only` marker, so they can be
 * imported from `"use client"` components without pulling Prisma into
 * the client bundle.
 *
 * The server module `lib/panel/teacher-payroll.ts` re-exports from here.
 */
import type {
  TeacherPayrollPeriodStatus,
  TeacherPayrollItemStatus,
} from "@prisma/client";

// ─── Pure formatters / labels ───────────────────────────────────────────────

export function formatPayrollMoney(kurus: number): string {
  const sign = kurus < 0 ? "-" : "";
  const abs = Math.abs(kurus);
  return `${sign}₺${(abs / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const ITEM_LABELS: Record<TeacherPayrollItemStatus, string> = {
  DRAFT: "Taslak",
  REVIEWED: "İncelendi",
  APPROVED: "Onaylı",
  PAID: "Ödendi",
  EXCLUDED: "Hariç",
};

const PERIOD_LABELS: Record<TeacherPayrollPeriodStatus, string> = {
  DRAFT: "Taslak",
  REVIEWED: "İncelendi",
  LOCKED: "Kilitli",
  PAID: "Ödendi",
  CANCELLED: "İptal",
};

export function getPayrollStatusLabel(
  status: TeacherPayrollItemStatus | TeacherPayrollPeriodStatus,
): string {
  return (
    (ITEM_LABELS as Record<string, string>)[status] ??
    (PERIOD_LABELS as Record<string, string>)[status] ??
    String(status)
  );
}

export function getPayrollStatusTone(
  status: TeacherPayrollItemStatus | TeacherPayrollPeriodStatus,
): "ok" | "accent" | "warn" | "bad" | "neutral" {
  switch (status) {
    case "PAID":
      return "ok";
    case "APPROVED":
    case "REVIEWED":
    case "LOCKED":
      return "accent";
    case "DRAFT":
      return "warn";
    case "CANCELLED":
    case "EXCLUDED":
      return "bad";
    default:
      return "neutral";
  }
}

// ─── Display row types (no Prisma client at runtime, type-only imports) ─────

export type CompensationRuleRow = {
  id: string;
  teacherId: string;
  teacherName: string;
  courseId: string | null;
  courseTitle: string | null;
  classroomId: string | null;
  classroomName: string | null;
  hourlyRateKurus: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  note: string | null;
  createdAt: Date;
};

export type PayrollPeriodSummary = {
  periodId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: TeacherPayrollPeriodStatus;
  lockedAt: Date | null;
  paidAt: Date | null;
  totals: {
    itemCount: number;
    teacherCount: number;
    totalMinutes: number;
    estimatedKurus: number;
    approvedKurus: number;
    paidKurus: number;
    excludedKurus: number;
    rateMissingCount: number;
    attendanceMissingCount: number;
  };
};

export type PayrollTeacherRow = {
  teacherId: string;
  teacherName: string;
  lessonCount: number;
  totalMinutes: number;
  estimatedKurus: number;
  approvedKurus: number;
  paidKurus: number;
  rateMissingCount: number;
  attendanceMissingCount: number;
  status: "PAID" | "APPROVED" | "REVIEWED" | "DRAFT" | "EXCLUDED" | "EMPTY";
};

export type PayrollItemRow = {
  id: string;
  periodId: string;
  teacherId: string;
  teacherName: string;
  lessonId: string | null;
  lessonTitle: string | null;
  scheduledAt: Date | null;
  studentName: string | null;
  courseTitle: string | null;
  classroomName: string | null;
  minutes: number;
  hourlyRateKurus: number;
  grossAmountKurus: number;
  adjustmentAmountKurus: number;
  finalAmountKurus: number;
  status: TeacherPayrollItemStatus;
  rateMissing: boolean;
  attendanceMissing: boolean;
  note: string | null;
  accountingEntryId: string | null;
};

export type TeacherPayrollReadOnlySummary = {
  hasData: boolean;
  currentPeriod: {
    periodId: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    status: TeacherPayrollPeriodStatus;
    estimatedKurus: number;
    approvedKurus: number;
    paidKurus: number;
    lessonCount: number;
    rateMissingCount: number;
    attendanceMissingCount: number;
  } | null;
  recentItems: PayrollItemRow[];
};
