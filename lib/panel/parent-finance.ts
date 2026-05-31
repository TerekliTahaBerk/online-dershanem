/**
 * Parent Finance Due Tracking — Phase 2 / Session 10.
 *
 * Read-side helper for the parent-facing payment due surface. All queries
 * are scoped to records that belong to the requesting parent — either
 * `parentId === parent.id` directly, or `studentId IN getChildIds(parent.id)`.
 *
 * ── Status freshness (D7) ────────────────────────────────────────────────
 *
 * The `PaymentScheduleItem.status` column stores **only** base statuses:
 *
 *   PENDING | PAID | CANCELLED | PARTIAL
 *
 * `OVERDUE` is **derived at read time** by this module — there is no
 * cron job and no nightly status flip. The rule is:
 *
 *   displayStatus(item) = "OVERDUE" if item.status === "PENDING"
 *                                   AND item.dueDate < startOfToday
 *                       = item.status otherwise
 *
 * `PARTIAL` rows whose remaining amount is still due past the date are
 * **not** auto-flipped — admin behavior should be to mark them as PAID
 * once fully collected, or leave them as PARTIAL with a smaller
 * remaining balance. This keeps the financial intent honest.
 *
 * ── Permission boundary ──────────────────────────────────────────────────
 *
 * Parent (read):
 *   - May see a row only if `row.parentId === parent.id` OR
 *     `row.studentId IN getChildIds(parent.id)`.
 *
 * Parent (write):
 *   - **Never.** Marking a row paid is admin-only (see
 *     `app/panel/admin/odemeler/_actions.ts`). Until a real payment
 *     provider callback exists, no parent self-service settlement.
 *
 * Teacher: no access — finance is not a teacher concern.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type { PaymentScheduleStatus } from "@prisma/client";
import type {
  PaymentScheduleDisplayStatus,
  PaymentScheduleRow,
} from "./parent-finance-display";

// Phase 2 / Session 13 — Pure display helpers + row types live in
// `parent-finance-display.ts` (no `server-only` marker) so client
// components can import them without pulling Prisma into the bundle.
// We re-export so existing server-side imports keep working.
export {
  type PaymentScheduleDisplayStatus,
  type PaymentScheduleRow,
  getPaymentScheduleStatusLabel,
  getPaymentScheduleStatusTone,
  formatMoneyTRY,
} from "./parent-finance-display";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ParentFinanceContext = {
  parentId: string;
  parentName: string;
  childIds: string[];
  childOptions: Array<{ id: string; fullName: string }>;
  /** Selected child filter — null means "all children". */
  selectedChildId: string | null;
};

export type ParentFinanceSummary = {
  /** PENDING + PARTIAL, dueDate >= today. */
  upcomingCount: number;
  upcomingTotalKurus: number;
  /** PENDING with dueDate < today (derived). */
  overdueCount: number;
  overdueTotalKurus: number;
  /** PAID rows in the requested window (defaults to last 90 days). */
  paidCount: number;
  paidTotalKurus: number;
  /** PENDING + PARTIAL + OVERDUE remaining balance. */
  totalOutstandingKurus: number;
  /** Earliest upcoming or overdue row, if any. */
  nextDue: PaymentScheduleRow | null;
  /** True if the parent has any tracked schedule item — used to swap
   *  the dashboard widget between "real summary" and honest empty state. */
  hasTrackedItems: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal — Prisma include + row mapper
// ─────────────────────────────────────────────────────────────────────────────

const SCHEDULE_INCLUDE = {
  student: { select: { id: true, fullName: true } },
  package: { select: { id: true, name: true } },
} as const;

type ScheduleWithIncludes = {
  id: string;
  studentId: string | null;
  parentId: string | null;
  purchaseIntentId: string | null;
  packageId: string | null;
  accountingEntryId: string | null;
  title: string;
  amount: number;
  paidAmount: number;
  dueDate: Date;
  status: PaymentScheduleStatus;
  paidAt: Date | null;
  paymentLink: string | null;
  note: string | null;
  createdAt: Date;
  student: { id: string; fullName: string } | null;
  package: { id: string; name: string } | null;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function deriveDisplayStatus(
  status: PaymentScheduleStatus,
  dueDate: Date,
): PaymentScheduleDisplayStatus {
  if (status === "PENDING" && dueDate.getTime() < startOfToday().getTime()) {
    return "OVERDUE";
  }
  return status as PaymentScheduleDisplayStatus;
}

function toRow(s: ScheduleWithIncludes): PaymentScheduleRow {
  const remaining = Math.max(0, s.amount - s.paidAmount);
  return {
    id: s.id,
    title: s.title,
    amountKurus: s.amount,
    paidAmountKurus: s.paidAmount,
    remainingKurus: remaining,
    dueDate: s.dueDate,
    status: s.status,
    displayStatus: deriveDisplayStatus(s.status, s.dueDate),
    paidAt: s.paidAt,
    paymentLink: s.paymentLink,
    note: s.note,
    createdAt: s.createdAt,
    studentId: s.studentId,
    studentFullName: s.student?.fullName ?? null,
    parentId: s.parentId,
    packageId: s.packageId,
    packageName: s.package?.name ?? null,
    purchaseIntentId: s.purchaseIntentId,
    accountingEntryId: s.accountingEntryId,
    daysUntilDue: dayDiff(s.dueDate, startOfToday()),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context — child roster + selected filter
// ─────────────────────────────────────────────────────────────────────────────

export async function getParentFinanceContext(
  parentId: string,
  requestedChildId?: string | null,
): Promise<ParentFinanceContext> {
  const [parent, links] = await Promise.all([
    prisma.parent.findUnique({ where: { id: parentId }, select: { id: true, fullName: true } }),
    prisma.parentStudent.findMany({
      where: { parentId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { studentId: true, student: { select: { id: true, fullName: true } } },
    }),
  ]);
  const childOptions = links.map((l) => ({ id: l.student.id, fullName: l.student.fullName }));
  const childIds = childOptions.map((c) => c.id);
  let selectedChildId: string | null = null;
  if (requestedChildId && childIds.includes(requestedChildId)) {
    selectedChildId = requestedChildId;
  }
  return {
    parentId,
    parentName: parent?.fullName ?? "Veli",
    childIds,
    childOptions,
    selectedChildId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission guard
// ─────────────────────────────────────────────────────────────────────────────

export async function canParentViewFinanceItem(
  parentId: string,
  itemId: string,
): Promise<boolean> {
  const item = await prisma.paymentScheduleItem.findUnique({
    where: { id: itemId },
    select: { parentId: true, studentId: true },
  });
  if (!item) return false;
  if (item.parentId === parentId) return true;
  if (item.studentId) {
    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId: item.studentId } },
      select: { parentId: true },
    });
    if (link) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal — base where-clause for parent visibility
// ─────────────────────────────────────────────────────────────────────────────

function parentScopeWhere(ctx: ParentFinanceContext) {
  // A row is in scope if (parentId == ctx.parentId) OR
  // (studentId IN ctx.childIds). When a specific child is selected,
  // narrow further.
  if (ctx.selectedChildId) {
    return { studentId: ctx.selectedChildId };
  }
  return {
    OR: [
      { parentId: ctx.parentId },
      ...(ctx.childIds.length > 0 ? [{ studentId: { in: ctx.childIds } }] : []),
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Linked-student finance — paginated raw read (used by tables)
// ─────────────────────────────────────────────────────────────────────────────

export async function getParentLinkedStudentFinance(
  ctx: ParentFinanceContext,
  options?: { take?: number },
): Promise<PaymentScheduleRow[]> {
  if (ctx.childIds.length === 0 && !ctx.parentId) return [];
  const rows = await prisma.paymentScheduleItem.findMany({
    where: parentScopeWhere(ctx),
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: Math.min(200, options?.take ?? 100),
    include: SCHEDULE_INCLUDE,
  });
  return rows.map((r) => toRow(r as ScheduleWithIncludes));
}

// ─────────────────────────────────────────────────────────────────────────────
// Upcoming — PENDING + PARTIAL with dueDate >= today
// ─────────────────────────────────────────────────────────────────────────────

export async function getParentUpcomingDues(
  ctx: ParentFinanceContext,
  options?: { take?: number },
): Promise<PaymentScheduleRow[]> {
  const today = startOfToday();
  const rows = await prisma.paymentScheduleItem.findMany({
    where: {
      ...parentScopeWhere(ctx),
      status: { in: ["PENDING", "PARTIAL"] },
      dueDate: { gte: today },
    },
    orderBy: [{ dueDate: "asc" }],
    take: Math.min(100, options?.take ?? 50),
    include: SCHEDULE_INCLUDE,
  });
  return rows.map((r) => toRow(r as ScheduleWithIncludes));
}

// ─────────────────────────────────────────────────────────────────────────────
// Overdue — PENDING with dueDate < today (derived OVERDUE)
// ─────────────────────────────────────────────────────────────────────────────

export async function getParentOverdueDues(
  ctx: ParentFinanceContext,
  options?: { take?: number },
): Promise<PaymentScheduleRow[]> {
  const today = startOfToday();
  const rows = await prisma.paymentScheduleItem.findMany({
    where: {
      ...parentScopeWhere(ctx),
      status: "PENDING",
      dueDate: { lt: today },
    },
    orderBy: [{ dueDate: "asc" }],
    take: Math.min(100, options?.take ?? 50),
    include: SCHEDULE_INCLUDE,
  });
  return rows.map((r) => toRow(r as ScheduleWithIncludes));
}

// ─────────────────────────────────────────────────────────────────────────────
// Paid history — PAID + PARTIAL rows, ordered by paidAt desc
// ─────────────────────────────────────────────────────────────────────────────

export async function getParentPaidItems(
  ctx: ParentFinanceContext,
  options?: { take?: number; sinceDays?: number },
): Promise<PaymentScheduleRow[]> {
  const since = options?.sinceDays
    ? new Date(Date.now() - options.sinceDays * 86_400_000)
    : null;
  const rows = await prisma.paymentScheduleItem.findMany({
    where: {
      ...parentScopeWhere(ctx),
      status: { in: ["PAID", "PARTIAL"] },
      ...(since ? { OR: [{ paidAt: { gte: since } }, { updatedAt: { gte: since } }] } : {}),
    },
    orderBy: [{ paidAt: "desc" }, { updatedAt: "desc" }],
    take: Math.min(100, options?.take ?? 50),
    include: SCHEDULE_INCLUDE,
  });
  return rows.map((r) => toRow(r as ScheduleWithIncludes));
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary — used by header cards AND the dashboard widget
// ─────────────────────────────────────────────────────────────────────────────

export async function getParentFinanceSummary(
  ctx: ParentFinanceContext,
): Promise<ParentFinanceSummary> {
  if (ctx.childIds.length === 0 && !ctx.parentId) {
    return EMPTY_SUMMARY;
  }
  const today = startOfToday();
  const [pendingPartialFuture, overduePending, paidRows, totalCount] = await Promise.all([
    prisma.paymentScheduleItem.findMany({
      where: {
        ...parentScopeWhere(ctx),
        status: { in: ["PENDING", "PARTIAL"] },
        dueDate: { gte: today },
      },
      select: { id: true, amount: true, paidAmount: true, dueDate: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.paymentScheduleItem.findMany({
      where: {
        ...parentScopeWhere(ctx),
        status: "PENDING",
        dueDate: { lt: today },
      },
      select: { id: true, amount: true, paidAmount: true, dueDate: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.paymentScheduleItem.findMany({
      where: {
        ...parentScopeWhere(ctx),
        status: { in: ["PAID", "PARTIAL"] },
      },
      select: { id: true, amount: true, paidAmount: true },
      take: 200,
    }),
    prisma.paymentScheduleItem.count({ where: parentScopeWhere(ctx) }),
  ]);

  const upcomingTotalKurus = pendingPartialFuture.reduce(
    (s, r) => s + Math.max(0, r.amount - r.paidAmount),
    0,
  );
  const overdueTotalKurus = overduePending.reduce(
    (s, r) => s + Math.max(0, r.amount - r.paidAmount),
    0,
  );
  const paidTotalKurus = paidRows.reduce((s, r) => s + r.paidAmount, 0);

  // Find nextDue — earliest of overdue OR upcoming.
  const earliestId = overduePending[0]?.id ?? pendingPartialFuture[0]?.id ?? null;
  let nextDue: PaymentScheduleRow | null = null;
  if (earliestId) {
    const row = await prisma.paymentScheduleItem.findUnique({
      where: { id: earliestId },
      include: SCHEDULE_INCLUDE,
    });
    if (row) nextDue = toRow(row as ScheduleWithIncludes);
  }

  return {
    upcomingCount: pendingPartialFuture.length,
    upcomingTotalKurus,
    overdueCount: overduePending.length,
    overdueTotalKurus,
    paidCount: paidRows.length,
    paidTotalKurus,
    totalOutstandingKurus: upcomingTotalKurus + overdueTotalKurus,
    nextDue,
    hasTrackedItems: totalCount > 0,
  };
}

const EMPTY_SUMMARY: ParentFinanceSummary = {
  upcomingCount: 0,
  upcomingTotalKurus: 0,
  overdueCount: 0,
  overdueTotalKurus: 0,
  paidCount: 0,
  paidTotalKurus: 0,
  totalOutstandingKurus: 0,
  nextDue: null,
  hasTrackedItems: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Display labels / tones / formatter
// ─────────────────────────────────────────────────────────────────────────────
// Moved to `parent-finance-display.ts` (re-exported at top of this file).
