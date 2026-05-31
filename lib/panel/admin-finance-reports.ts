/**
 * Phase 2 / Session 14 — Admin finance reports / cashflow cockpit.
 *
 * Aggregation helpers for `/panel/admin/finans/raporlar`. **Read-only.**
 * No mutations, no provider reconciliation, no tax/legal reporting.
 *
 * ──── Double-counting policy ────────────────────────────────────────────────
 *
 *   • Beklenen tahsilat / Geciken tahsilat / Kalan bakiye
 *       → derived ONLY from `PaymentScheduleItem`
 *         (status PENDING / PARTIAL, optionally CANCELLED filtered out).
 *
 *   • Gerçekleşen gelir / Gider / Net nakit akışı
 *       → derived ONLY from `AccountingEntry`.
 *
 *   • The two are NEVER summed. A `PaymentScheduleItem` may have an
 *     `accountingEntryId` linking it to a realized entry — when present, the
 *     realized amount is already counted under "Gerçekleşen gelir" and we
 *     deliberately do NOT add the schedule item's `paidAmount` on top.
 *
 *   • Teacher payroll obligations are derived from `TeacherPayrollItem`. A
 *     PAID payroll item with an `accountingEntryId` is also visible as an
 *     EXPENSE / TEACHER_PAYROLL accounting entry; in this module we keep
 *     the two views deliberately separate (obligations vs realized expense).
 *
 *   • PurchaseIntent / OdkOrder / OdkPayment / OdOrder / OdPayment intentionally
 *     NOT included. Their relation to AccountingEntry is asymmetric across
 *     services (some flows write an entry, some don't) and double-counting
 *     risk is high. Deferred — see §24 of the audit doc.
 *
 * Money convention: kuruş (Int). 1 TRY = 100.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  AccountingSummary,
  AdminFinanceDashboard,
  CashflowMonthPoint,
  FinanceActivityRow,
  FinanceDateRange,
  FinanceRangePreset,
  PaymentScheduleSummary,
  PayrollObligationRow,
  ReceivableRow,
  TeacherPayrollObligationsSummary,
} from "./admin-finance-reports-display";

// Phase 2 / Session 14 — display-only helpers + types live in
// `admin-finance-reports-display.ts` (no `server-only`). Re-exported below
// so existing server callers keep working.
export {
  type AccountingSummary,
  type AdminFinanceDashboard,
  type CashflowMonthPoint,
  type FinanceActivityRow,
  type FinanceDateRange,
  type FinanceRangePreset,
  type PaymentScheduleSummary,
  type PayrollObligationRow,
  type ReceivableRow,
  type TeacherPayrollObligationsSummary,
  FINANCE_RANGE_PRESETS,
  formatFinanceMoney,
  getAccessServiceLabel,
  getEntryCategoryLabel,
  getEntryTypeLabel,
} from "./admin-finance-reports-display";

// ─── Date range ─────────────────────────────────────────────────────────────

const RANGE_LABEL: Record<FinanceRangePreset, string> = {
  THIS_MONTH: "Bu ay",
  LAST_30D: "Son 30 gün",
  LAST_90D: "Son 90 gün",
  THIS_YEAR: "Bu yıl",
};

function isPreset(s: unknown): s is FinanceRangePreset {
  return s === "THIS_MONTH" || s === "LAST_30D" || s === "LAST_90D" || s === "THIS_YEAR";
}

/**
 * Resolve a `FinanceDateRange` from a query-string preset value. Anything
 * unknown / malformed → defaults to `THIS_MONTH`. Never throws.
 */
export function getFinanceDateRange(presetRaw?: string | null): FinanceDateRange {
  const preset: FinanceRangePreset = isPreset(presetRaw) ? presetRaw : "THIS_MONTH";
  const now = new Date();
  let startsAt: Date;
  const endsAt = new Date(now); // inclusive of "now"
  switch (preset) {
    case "THIS_MONTH": {
      startsAt = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    }
    case "LAST_30D": {
      startsAt = new Date(now);
      startsAt.setDate(startsAt.getDate() - 30);
      startsAt.setHours(0, 0, 0, 0);
      break;
    }
    case "LAST_90D": {
      startsAt = new Date(now);
      startsAt.setDate(startsAt.getDate() - 90);
      startsAt.setHours(0, 0, 0, 0);
      break;
    }
    case "THIS_YEAR": {
      startsAt = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    }
  }
  return { preset, startsAt, endsAt, label: RANGE_LABEL[preset] };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

// Type-narrowers to dodge stale Prisma client typings without `any`.
type AccountingClient = {
  aggregate: (args: unknown) => Promise<{ _sum: { amount: number | null } }>;
  groupBy: (args: unknown) => Promise<Array<Record<string, unknown>>>;
  findMany: (args: unknown) => Promise<unknown[]>;
};
type ScheduleClient = {
  aggregate: (args: unknown) => Promise<{
    _sum: { amount: number | null; paidAmount: number | null };
    _count: { _all: number };
  }>;
  count: (args: unknown) => Promise<number>;
  findMany: (args: unknown) => Promise<unknown[]>;
};
type PayrollItemClient = {
  aggregate: (args: unknown) => Promise<{
    _sum: { finalAmount: number | null };
    _count: { _all: number };
  }>;
  count: (args: unknown) => Promise<number>;
  findMany: (args: unknown) => Promise<unknown[]>;
};

// ─── Accounting summary ─────────────────────────────────────────────────────

export async function getAccountingSummary(range: FinanceDateRange): Promise<AccountingSummary> {
  const where = { occurredAt: { gte: range.startsAt, lte: range.endsAt } };
  const ae = (prisma as unknown as { accountingEntry: AccountingClient }).accountingEntry;

  const [incomeAgg, expenseAgg, byCatRows, totalCount] = await Promise.all([
    ae.aggregate({ _sum: { amount: true }, where: { ...where, type: "INCOME" } }),
    ae.aggregate({ _sum: { amount: true }, where: { ...where, type: "EXPENSE" } }),
    ae.groupBy({
      by: ["type", "category"],
      _sum: { amount: true },
      where,
    }),
    (prisma as unknown as { accountingEntry: { count: (args: unknown) => Promise<number> } })
      .accountingEntry.count({ where }),
  ]);

  const incomeKurus = incomeAgg._sum.amount ?? 0;
  const expenseKurus = expenseAgg._sum.amount ?? 0;

  const incomeByCategory: AccountingSummary["incomeByCategory"] = [];
  const expenseByCategory: AccountingSummary["expenseByCategory"] = [];
  for (const row of byCatRows) {
    const r = row as { type: string; category: string; _sum: { amount: number | null } };
    const amt = r._sum.amount ?? 0;
    if (amt === 0) continue;
    if (r.type === "INCOME") {
      incomeByCategory.push({ category: r.category as AccountingSummary["incomeByCategory"][number]["category"], amountKurus: amt });
    } else {
      expenseByCategory.push({ category: r.category as AccountingSummary["expenseByCategory"][number]["category"], amountKurus: amt });
    }
  }
  incomeByCategory.sort((a, b) => b.amountKurus - a.amountKurus);
  expenseByCategory.sort((a, b) => b.amountKurus - a.amountKurus);

  return {
    incomeKurus,
    expenseKurus,
    netKurus: incomeKurus - expenseKurus,
    incomeByCategory,
    expenseByCategory,
    entryCount: totalCount,
  };
}

// ─── Payment-schedule (receivables) summary ─────────────────────────────────

export async function getPaymentScheduleSummary(range: FinanceDateRange): Promise<PaymentScheduleSummary> {
  const psi = (prisma as unknown as { paymentScheduleItem: ScheduleClient }).paymentScheduleItem;
  const today = startOfToday();
  const activeStatuses = ["PENDING", "PARTIAL"] as const;

  const [overdueAgg, upcomingAgg, paidAgg, totalOutAgg] = await Promise.all([
    psi.aggregate({
      _sum: { amount: true, paidAmount: true },
      _count: { _all: true },
      where: { status: { in: activeStatuses }, dueDate: { lt: today } },
    }),
    psi.aggregate({
      _sum: { amount: true, paidAmount: true },
      _count: { _all: true },
      where: { status: { in: activeStatuses }, dueDate: { gte: today } },
    }),
    psi.aggregate({
      _sum: { amount: true, paidAmount: true },
      _count: { _all: true },
      where: {
        status: "PAID",
        paidAt: { gte: range.startsAt, lte: range.endsAt },
      },
    }),
    psi.aggregate({
      _sum: { amount: true, paidAmount: true },
      _count: { _all: true },
      where: { status: { in: activeStatuses } },
    }),
  ]);

  const overdueRemaining = (overdueAgg._sum.amount ?? 0) - (overdueAgg._sum.paidAmount ?? 0);
  const upcomingRemaining = (upcomingAgg._sum.amount ?? 0) - (upcomingAgg._sum.paidAmount ?? 0);
  const totalOutstanding = (totalOutAgg._sum.amount ?? 0) - (totalOutAgg._sum.paidAmount ?? 0);

  return {
    upcomingCount: upcomingAgg._count._all,
    upcomingRemainingKurus: Math.max(0, upcomingRemaining),
    overdueCount: overdueAgg._count._all,
    overdueRemainingKurus: Math.max(0, overdueRemaining),
    paidInRangeCount: paidAgg._count._all,
    paidInRangeKurus: paidAgg._sum.paidAmount ?? 0,
    totalOutstandingKurus: Math.max(0, totalOutstanding),
  };
}

// ─── Teacher-payroll obligations summary ────────────────────────────────────

export async function getTeacherPayrollSummary(
  range: FinanceDateRange,
): Promise<TeacherPayrollObligationsSummary> {
  const tpi = (prisma as unknown as { teacherPayrollItem: PayrollItemClient }).teacherPayrollItem;

  const [approvedUnpaid, draftReview, paidInRange, excludedCount] = await Promise.all([
    tpi.aggregate({
      _sum: { finalAmount: true },
      _count: { _all: true },
      where: { status: "APPROVED" },
    }),
    tpi.aggregate({
      _sum: { finalAmount: true },
      _count: { _all: true },
      where: { status: { in: ["DRAFT", "REVIEWED"] } },
    }),
    tpi.aggregate({
      _sum: { finalAmount: true },
      _count: { _all: true },
      where: {
        status: "PAID",
        updatedAt: { gte: range.startsAt, lte: range.endsAt },
      },
    }),
    tpi.count({ where: { status: "EXCLUDED" } }),
  ]);

  return {
    approvedUnpaidKurus: approvedUnpaid._sum.finalAmount ?? 0,
    approvedUnpaidCount: approvedUnpaid._count._all,
    draftReviewKurus: draftReview._sum.finalAmount ?? 0,
    draftReviewCount: draftReview._count._all,
    paidInRangeKurus: paidInRange._sum.finalAmount ?? 0,
    paidInRangeCount: paidInRange._count._all,
    excludedCount,
  };
}

// ─── Monthly cashflow series (income / expense / net) ───────────────────────

const MONTH_LABEL_FMT = new Intl.DateTimeFormat("tr-TR", {
  month: "short",
  year: "numeric",
});

function monthKeyOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Returns one point per calendar month in `[range.startsAt, range.endsAt]`,
 * inclusive on both ends. Always includes empty months so the chart/list
 * doesn't visually skip gaps.
 */
export async function getMonthlyCashflowSeries(
  range: FinanceDateRange,
): Promise<CashflowMonthPoint[]> {
  const ae = (prisma as unknown as {
    accountingEntry: {
      findMany: (args: unknown) => Promise<
        Array<{ type: "INCOME" | "EXPENSE"; amount: number; occurredAt: Date }>
      >;
    };
  }).accountingEntry;

  const rows = await ae.findMany({
    where: { occurredAt: { gte: range.startsAt, lte: range.endsAt } },
    select: { type: true, amount: true, occurredAt: true },
  });

  // Build empty buckets first so months with zero rows still show.
  const buckets = new Map<string, CashflowMonthPoint>();
  const cursor = new Date(range.startsAt.getFullYear(), range.startsAt.getMonth(), 1);
  const last = new Date(range.endsAt.getFullYear(), range.endsAt.getMonth(), 1);
  while (cursor.getTime() <= last.getTime()) {
    const key = monthKeyOf(cursor);
    buckets.set(key, {
      monthKey: key,
      monthStart: new Date(cursor),
      monthLabel: MONTH_LABEL_FMT.format(cursor),
      incomeKurus: 0,
      expenseKurus: 0,
      netKurus: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const r of rows) {
    const key = monthKeyOf(r.occurredAt);
    const b = buckets.get(key);
    if (!b) continue;
    if (r.type === "INCOME") b.incomeKurus += r.amount;
    else b.expenseKurus += r.amount;
  }
  for (const b of buckets.values()) b.netKurus = b.incomeKurus - b.expenseKurus;

  return Array.from(buckets.values()).sort((a, b) =>
    a.monthKey < b.monthKey ? -1 : a.monthKey > b.monthKey ? 1 : 0,
  );
}

// ─── Receivable rows (overdue / upcoming) ───────────────────────────────────

const RECEIVABLE_LIMIT = 25;

type ReceivableRaw = {
  id: string;
  title: string;
  amount: number;
  paidAmount: number;
  dueDate: Date;
  status: "PENDING" | "PAID" | "CANCELLED" | "PARTIAL";
  studentId: string | null;
  parentId: string | null;
  student: { id: string; fullName: string } | null;
  parent: { id: string; fullName: string } | null;
  package: { id: string; name: string } | null;
};

function toReceivableRow(r: ReceivableRaw, isOverdue: boolean): ReceivableRow {
  const remaining = Math.max(0, r.amount - r.paidAmount);
  return {
    id: r.id,
    title: r.title,
    amountKurus: r.amount,
    paidAmountKurus: r.paidAmount,
    remainingKurus: remaining,
    dueDate: r.dueDate,
    daysUntilDue: dayDiff(r.dueDate, startOfToday()),
    status: isOverdue && r.status === "PENDING" ? "OVERDUE" : r.status,
    studentId: r.studentId,
    studentFullName: r.student?.fullName ?? null,
    parentId: r.parentId,
    parentFullName: r.parent?.fullName ?? null,
    packageName: r.package?.name ?? null,
  };
}

export async function getOverdueReceivables(limit = RECEIVABLE_LIMIT): Promise<ReceivableRow[]> {
  const psi = (prisma as unknown as {
    paymentScheduleItem: { findMany: (args: unknown) => Promise<ReceivableRaw[]> };
  }).paymentScheduleItem;
  const today = startOfToday();
  const rows = await psi.findMany({
    where: { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { lt: today } },
    orderBy: { dueDate: "asc" },
    take: limit,
    include: {
      student: { select: { id: true, fullName: true } },
      parent: { select: { id: true, fullName: true } },
      package: { select: { id: true, name: true } },
    },
  });
  return rows.map((r) => toReceivableRow(r, true));
}

export async function getUpcomingReceivables(limit = RECEIVABLE_LIMIT): Promise<ReceivableRow[]> {
  const psi = (prisma as unknown as {
    paymentScheduleItem: { findMany: (args: unknown) => Promise<ReceivableRaw[]> };
  }).paymentScheduleItem;
  const today = startOfToday();
  const rows = await psi.findMany({
    where: { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { gte: today } },
    orderBy: { dueDate: "asc" },
    take: limit,
    include: {
      student: { select: { id: true, fullName: true } },
      parent: { select: { id: true, fullName: true } },
      package: { select: { id: true, name: true } },
    },
  });
  return rows.map((r) => toReceivableRow(r, false));
}

// ─── Payroll obligation rows ────────────────────────────────────────────────

type PayrollObligationRaw = {
  id: string;
  periodId: string;
  teacherId: string;
  finalAmount: number;
  status: "DRAFT" | "REVIEWED" | "APPROVED" | "PAID" | "EXCLUDED";
  rateMissing: boolean;
  attendanceMissing: boolean;
  period: { id: string; title: string };
  teacher: { id: string; fullName: string };
  lesson: { scheduledAt: Date | null } | null;
};

export async function getTeacherPayoutObligations(
  limit = 30,
): Promise<PayrollObligationRow[]> {
  const tpi = (prisma as unknown as {
    teacherPayrollItem: { findMany: (args: unknown) => Promise<PayrollObligationRaw[]> };
  }).teacherPayrollItem;
  const rows = await tpi.findMany({
    where: { status: { in: ["APPROVED", "REVIEWED"] } },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: limit,
    include: {
      period: { select: { id: true, title: true } },
      teacher: { select: { id: true, fullName: true } },
      lesson: { select: { scheduledAt: true } },
    },
  });
  return rows.map((r) => ({
    itemId: r.id,
    periodId: r.periodId,
    periodTitle: r.period.title,
    teacherId: r.teacherId,
    teacherFullName: r.teacher.fullName,
    finalAmountKurus: r.finalAmount,
    status: r.status,
    rateMissing: r.rateMissing,
    attendanceMissing: r.attendanceMissing,
    scheduledAt: r.lesson?.scheduledAt ?? null,
  }));
}

// ─── Recent finance activity ────────────────────────────────────────────────

type RecentActivityRaw = {
  id: string;
  service: "OD" | "ODK";
  type: "INCOME" | "EXPENSE";
  category:
    | "PACKAGE_SALE" | "CAMP_SALE" | "SERVICE_FEE" | "OTHER_INCOME"
    | "TEACHER_PAYROLL" | "MARKETING" | "RENT" | "TAX" | "OPERATIONAL" | "OTHER_EXPENSE";
  amount: number;
  occurredAt: Date;
  description: string | null;
  student: { fullName: string } | null;
  teacher: { fullName: string } | null;
  package: { name: string } | null;
};

export async function getRecentFinanceActivity(
  limit = 20,
): Promise<FinanceActivityRow[]> {
  const ae = (prisma as unknown as {
    accountingEntry: { findMany: (args: unknown) => Promise<RecentActivityRaw[]> };
  }).accountingEntry;
  const rows = await ae.findMany({
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: {
      student: { select: { fullName: true } },
      teacher: { select: { fullName: true } },
      package: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    kind: "ACCOUNTING" as const,
    id: r.id,
    occurredAt: r.occurredAt,
    type: r.type,
    category: r.category,
    service: r.service,
    amountKurus: r.amount,
    description: r.description,
    studentName: r.student?.fullName ?? null,
    teacherName: r.teacher?.fullName ?? null,
    packageName: r.package?.name ?? null,
  }));
}

// ─── Top-level dashboard composer ───────────────────────────────────────────

export async function getAdminFinanceDashboard(
  presetRaw?: string | null,
): Promise<AdminFinanceDashboard> {
  const range = getFinanceDateRange(presetRaw);
  const [
    accounting,
    receivables,
    payroll,
    cashflowMonthly,
    overdueReceivables,
    upcomingReceivables,
    payrollObligations,
    recentActivity,
  ] = await Promise.all([
    getAccountingSummary(range),
    getPaymentScheduleSummary(range),
    getTeacherPayrollSummary(range),
    getMonthlyCashflowSeries(range),
    getOverdueReceivables(),
    getUpcomingReceivables(),
    getTeacherPayoutObligations(),
    getRecentFinanceActivity(),
  ]);

  return {
    range,
    accounting,
    receivables,
    payroll,
    cashflowMonthly,
    overdueReceivables,
    upcomingReceivables,
    payrollObligations,
    recentActivity,
  };
}
