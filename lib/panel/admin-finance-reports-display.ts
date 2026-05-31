/**
 * Phase 2 / Session 14 — Admin finance reports (client-safe display layer).
 *
 * Pure types + formatters with NO `server-only` marker. The server module
 * `lib/panel/admin-finance-reports.ts` re-exports for back-compat and uses
 * `import type` for internal scope.
 *
 * Every monetary value here is in **kuruş (Int)** to match the rest of the
 * finance domain (`AccountingEntry.amount`, `PaymentScheduleItem.amount`,
 * `TeacherPayrollItem.finalAmount`). 1 TRY = 100.
 */
import type {
  AccessService,
  EntryCategory,
  EntryType,
  PaymentScheduleStatus,
  TeacherPayrollItemStatus,
} from "@prisma/client";

// ─── Range presets ──────────────────────────────────────────────────────────

export type FinanceRangePreset = "THIS_MONTH" | "LAST_30D" | "LAST_90D" | "THIS_YEAR";

export const FINANCE_RANGE_PRESETS: ReadonlyArray<{
  value: FinanceRangePreset;
  label: string;
}> = [
  { value: "THIS_MONTH", label: "Bu ay" },
  { value: "LAST_30D", label: "Son 30 gün" },
  { value: "LAST_90D", label: "Son 90 gün" },
  { value: "THIS_YEAR", label: "Bu yıl" },
];

export type FinanceDateRange = {
  preset: FinanceRangePreset;
  startsAt: Date;
  endsAt: Date;
  label: string;
};

// ─── Money formatter ────────────────────────────────────────────────────────

/**
 * Conservative TRY formatter. Matches the convention from
 * `parent-finance-display.formatMoneyTRY` and `teacher-payroll-display.formatPayrollMoney`
 * but kept local so this module is fully self-contained.
 */
export function formatFinanceMoney(kurus: number): string {
  const sign = kurus < 0 ? "-" : "";
  const abs = Math.abs(kurus);
  return `${sign}₺${(abs / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Status / category labels ───────────────────────────────────────────────

const ENTRY_CATEGORY_LABEL: Record<EntryCategory, string> = {
  PACKAGE_SALE: "Paket satışı",
  CAMP_SALE: "Kamp satışı",
  SERVICE_FEE: "Hizmet bedeli",
  OTHER_INCOME: "Diğer gelir",
  TEACHER_PAYROLL: "Öğretmen ödemesi",
  MARKETING: "Pazarlama",
  RENT: "Kira",
  TAX: "Vergi",
  OPERATIONAL: "İşletme",
  OTHER_EXPENSE: "Diğer gider",
};

export function getEntryCategoryLabel(c: EntryCategory): string {
  return ENTRY_CATEGORY_LABEL[c] ?? String(c);
}

const ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  INCOME: "Gelir",
  EXPENSE: "Gider",
};
export function getEntryTypeLabel(t: EntryType): string {
  return ENTRY_TYPE_LABEL[t] ?? String(t);
}

const ACCESS_SERVICE_LABEL: Record<AccessService, string> = {
  OD: "OnlineDershanem",
  ODK: "OnlineDenemeKulübü",
};
export function getAccessServiceLabel(s: AccessService): string {
  return ACCESS_SERVICE_LABEL[s] ?? String(s);
}

// ─── Row shapes (no Prisma values leaked) ───────────────────────────────────

export type AccountingSummary = {
  incomeKurus: number;
  expenseKurus: number;
  netKurus: number;
  /** Kategori bazlı gelir kırılımı. */
  incomeByCategory: Array<{ category: EntryCategory; amountKurus: number }>;
  /** Kategori bazlı gider kırılımı. */
  expenseByCategory: Array<{ category: EntryCategory; amountKurus: number }>;
  entryCount: number;
};

export type PaymentScheduleSummary = {
  /** Tüm aktif vadeli ödeme satırlarını kapsar (CANCELLED hariç). */
  upcomingCount: number;
  /** Bugün veya ileri tarihli, PENDING/PARTIAL kalanı. */
  upcomingRemainingKurus: number;
  overdueCount: number;
  /** dueDate < bugün VE status PENDING/PARTIAL satırlarının kalan bakiyesi. */
  overdueRemainingKurus: number;
  /** Seçili tarih aralığı içinde paidAt ile işaretlenmiş tutarlar. */
  paidInRangeCount: number;
  paidInRangeKurus: number;
  /** Tüm aktif (CANCELLED hariç) PENDING/PARTIAL satırların toplam kalanı. */
  totalOutstandingKurus: number;
};

export type TeacherPayrollObligationsSummary = {
  /** Status APPROVED ve accountingEntryId null olan satırların finalAmount toplamı. */
  approvedUnpaidKurus: number;
  approvedUnpaidCount: number;
  /** DRAFT/REVIEWED satırların finalAmount toplamı. */
  draftReviewKurus: number;
  draftReviewCount: number;
  /** PAID satırların finalAmount toplamı (seçili aralık). */
  paidInRangeKurus: number;
  paidInRangeCount: number;
  /** EXCLUDED satır sayısı (sadece bilgi). */
  excludedCount: number;
};

export type CashflowMonthPoint = {
  /** YYYY-MM (UTC). */
  monthKey: string;
  /** Ayın 1. günü, yerel başlangıç. */
  monthStart: Date;
  monthLabel: string;
  incomeKurus: number;
  expenseKurus: number;
  netKurus: number;
};

export type ReceivableRow = {
  id: string;
  title: string;
  amountKurus: number;
  paidAmountKurus: number;
  remainingKurus: number;
  dueDate: Date;
  /** Bugüne göre gün farkı (negatif = gecikti). */
  daysUntilDue: number;
  status: PaymentScheduleStatus | "OVERDUE";
  studentId: string | null;
  studentFullName: string | null;
  parentId: string | null;
  parentFullName: string | null;
  packageName: string | null;
};

export type PayrollObligationRow = {
  itemId: string;
  periodId: string;
  periodTitle: string;
  teacherId: string;
  teacherFullName: string;
  finalAmountKurus: number;
  status: TeacherPayrollItemStatus;
  /** Bilgi amaçlı bayraklar — okunabilirlik için. */
  rateMissing: boolean;
  attendanceMissing: boolean;
  scheduledAt: Date | null;
};

export type FinanceActivityKind = "ACCOUNTING";
export type FinanceActivityRow = {
  kind: FinanceActivityKind;
  id: string;
  occurredAt: Date;
  type: EntryType;
  category: EntryCategory;
  service: AccessService;
  amountKurus: number;
  description: string | null;
  /** İlgili kayıt etiketleri (varsa). */
  studentName?: string | null;
  teacherName?: string | null;
  packageName?: string | null;
};

export type AdminFinanceDashboard = {
  range: FinanceDateRange;
  accounting: AccountingSummary;
  receivables: PaymentScheduleSummary;
  payroll: TeacherPayrollObligationsSummary;
  cashflowMonthly: CashflowMonthPoint[];
  overdueReceivables: ReceivableRow[];
  upcomingReceivables: ReceivableRow[];
  payrollObligations: PayrollObligationRow[];
  recentActivity: FinanceActivityRow[];
};
