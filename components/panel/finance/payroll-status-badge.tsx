/**
 * Phase 2 / Session 11 — Payroll status pill (admin + teacher).
 * Stage 3H: Migrated to v2 `soft-pill is-{tone}` vocabulary.
 */
import { getPayrollStatusLabel } from "@/lib/panel/teacher-payroll-display";
import type {
  TeacherPayrollPeriodStatus,
  TeacherPayrollItemStatus,
} from "@prisma/client";

type Status =
  | TeacherPayrollItemStatus
  | TeacherPayrollPeriodStatus
  | "EMPTY";

/**
 * Map raw status → soft-pill tone (per Stage 3H D1 spec):
 *   DRAFT → lavender · REVIEWED → sky · APPROVED → mint
 *   LOCKED → dark · PAID → mint · EXCLUDED → muted (default)
 *   CANCELLED → blush
 */
function pillTone(status: Status): string {
  switch (status) {
    case "DRAFT":
      return "is-lavender";
    case "REVIEWED":
      return "is-sky";
    case "APPROVED":
    case "PAID":
      return "is-mint";
    case "LOCKED":
      return "is-dark";
    case "CANCELLED":
      return "is-blush";
    case "EXCLUDED":
    case "EMPTY":
    default:
      return "";
  }
}

export function PayrollStatusBadge({ status }: { status: Status }) {
  if (status === "EMPTY") {
    return <span className="soft-pill">—</span>;
  }
  const label = getPayrollStatusLabel(status);
  const tone = pillTone(status);
  return <span className={`soft-pill ${tone}`.trim()}>{label}</span>;
}
