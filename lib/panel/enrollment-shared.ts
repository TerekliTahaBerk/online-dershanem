/**
 * Phase 3 / Session 5 + Session 10 patch — Shared, client-safe enrollment types
 * and pure helpers.
 *
 * Importing this module from a "use client" component is safe; it must NOT
 * contain Prisma queries, "server-only", or other server-bound code. The
 * server orchestration (DB reads + writes) lives in `lib/panel/enrollment.ts`
 * which re-exports from here.
 */
import type { EnrollmentStatus } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EnrollmentOption = {
  id: string;
  name: string;
  type: "COURSE" | "EXAM";
  priceKurus: number;
  lessonCount: number;
  subjects: string;
  isActive: boolean;
};

export type ParentPayerOption = {
  parentId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  hasUserAccount: boolean;
  relationshipLabel: string | null;
};

export type StudentEnrollmentSnapshot = {
  studentId: string;
  fullName: string;
  classLevel: string | null;
  examType: string | null;
  hasUserAccount: boolean;
  classroomCount: number;
  parentCount: number;
  activeEnrollments: Array<{
    id: string;
    packageId: string;
    packageName: string;
    status: EnrollmentStatus;
    startsAt: Date;
    endsAt: Date | null;
  }>;
  pendingPaymentItemCount: number;
  pendingPaymentTotalKurus: number;
  overdueItemCount: number;
};

export type PaymentPlanInput =
  | { kind: "NONE" }
  | { kind: "ONE_TIME"; totalKurus: number; firstDueAt: Date; title?: string; note?: string }
  | {
      kind: "INSTALLMENTS";
      totalKurus: number;
      installments: number;
      firstDueAt: Date;
      intervalMonths?: number;
      titlePrefix?: string;
      note?: string;
    };

export type PaymentPlanPreviewItem = {
  index: number;
  title: string;
  dueDate: Date;
  amountKurus: number;
};

// ─── Pure helpers ────────────────────────────────────────────────────────────

export function getEnrollmentStatusLabel(s: EnrollmentStatus): string {
  switch (s) {
    case "LEAD":
      return "Aday";
    case "TRIAL":
      return "Deneme";
    case "ACTIVE":
      return "Aktif";
    case "PAUSED":
      return "Duraklatıldı";
    case "COMPLETED":
      return "Tamamlandı";
    case "CANCELLED":
      return "İptal";
  }
}

export function getEnrollmentStatusTone(
  s: EnrollmentStatus,
): "accent" | "ok" | "warn" | "bad" | "purple" | "teal" | "neutral" {
  switch (s) {
    case "ACTIVE":
      return "ok";
    case "TRIAL":
      return "teal";
    case "LEAD":
      return "purple";
    case "PAUSED":
      return "warn";
    case "CANCELLED":
      return "bad";
    case "COMPLETED":
      return "neutral";
  }
}

function addMonths(base: Date, n: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function calculatePaymentPlanPreview(
  input: PaymentPlanInput,
  packageName: string,
): PaymentPlanPreviewItem[] {
  if (input.kind === "NONE") return [];
  if (input.kind === "ONE_TIME") {
    return [
      {
        index: 1,
        title: input.title?.trim() || `${packageName} ödemesi`,
        dueDate: input.firstDueAt,
        amountKurus: input.totalKurus,
      },
    ];
  }
  // INSTALLMENTS — split as evenly as possible; allocate the remainder to the
  // LAST installment so the visible sum exactly equals totalKurus.
  const n = Math.max(1, Math.floor(input.installments));
  const interval = Math.max(1, Math.floor(input.intervalMonths ?? 1));
  const base = Math.floor(input.totalKurus / n);
  const remainder = input.totalKurus - base * n;
  const out: PaymentPlanPreviewItem[] = [];
  const prefix = input.titlePrefix?.trim() || `${packageName} taksit`;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    out.push({
      index: i + 1,
      title: `${prefix} ${i + 1}/${n}`,
      dueDate: addMonths(input.firstDueAt, i * interval),
      amountKurus: base + (isLast ? remainder : 0),
    });
  }
  return out;
}

export function getPaymentPlanSummary(items: PaymentPlanPreviewItem[]): {
  count: number;
  totalKurus: number;
  firstDueDate: Date | null;
  lastDueDate: Date | null;
} {
  if (items.length === 0) {
    return { count: 0, totalKurus: 0, firstDueDate: null, lastDueDate: null };
  }
  return {
    count: items.length,
    totalKurus: items.reduce((s, i) => s + i.amountKurus, 0),
    firstDueDate: items[0].dueDate,
    lastDueDate: items[items.length - 1].dueDate,
  };
}
