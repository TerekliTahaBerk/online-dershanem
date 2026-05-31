/**
 * Phase 2 / Session 11 — Payroll status pill (admin + teacher).
 */
import {
  getPayrollStatusLabel,
  getPayrollStatusTone,
} from "@/lib/panel/teacher-payroll-display";
import type {
  TeacherPayrollPeriodStatus,
  TeacherPayrollItemStatus,
} from "@prisma/client";

const TONE_CLASSES: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  accent: "bg-sky-50 text-sky-700 ring-sky-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  bad: "bg-rose-50 text-rose-700 ring-rose-200",
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function PayrollStatusBadge({
  status,
}: {
  status: TeacherPayrollItemStatus | TeacherPayrollPeriodStatus | "EMPTY";
}) {
  if (status === "EMPTY") {
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES.neutral}`}>
        —
      </span>
    );
  }
  const tone = getPayrollStatusTone(status);
  const label = getPayrollStatusLabel(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        TONE_CLASSES[tone] ?? TONE_CLASSES.neutral
      }`}
    >
      {label}
    </span>
  );
}
