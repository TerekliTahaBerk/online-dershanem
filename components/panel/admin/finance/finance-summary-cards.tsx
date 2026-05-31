/**
 * Phase 2 / Session 14 — Finance summary KPI cards (admin cockpit).
 *
 * Pure server component (no `"use client"`). Imports only the display
 * module so it can be rendered from a server page safely.
 */
import {
  formatFinanceMoney,
  type AccountingSummary,
  type PaymentScheduleSummary,
  type TeacherPayrollObligationsSummary,
} from "@/lib/panel/admin-finance-reports-display";

function Card({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string | null;
  tone?: "neutral" | "warn" | "bad" | "ok" | "accent";
}) {
  const cls =
    tone === "warn"
      ? "border-amber-200 bg-amber-50/40"
      : tone === "bad"
        ? "border-rose-200 bg-rose-50/40"
        : tone === "ok"
          ? "border-emerald-200 bg-emerald-50/40"
          : tone === "accent"
            ? "border-sky-200 bg-sky-50/40"
            : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border ${cls} p-4`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function FinanceSummaryCards({
  accounting,
  receivables,
  payroll,
}: {
  accounting: AccountingSummary;
  receivables: PaymentScheduleSummary;
  payroll: TeacherPayrollObligationsSummary;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card
        label="Beklenen tahsilat"
        value={formatFinanceMoney(receivables.upcomingRemainingKurus)}
        hint={`${receivables.upcomingCount} satır · vadeli ödeme kalanı`}
        tone="accent"
      />
      <Card
        label="Geciken tahsilat"
        value={formatFinanceMoney(receivables.overdueRemainingKurus)}
        hint={`${receivables.overdueCount} satır · vadesi geçmiş kalanı`}
        tone={receivables.overdueRemainingKurus > 0 ? "bad" : "neutral"}
      />
      <Card
        label="Gerçekleşen gelir"
        value={formatFinanceMoney(accounting.incomeKurus)}
        hint="Muhasebe kayıtları (seçili aralık)"
        tone="ok"
      />
      <Card
        label="Gider"
        value={formatFinanceMoney(accounting.expenseKurus)}
        hint="Muhasebe kayıtları (seçili aralık)"
        tone={accounting.expenseKurus > 0 ? "warn" : "neutral"}
      />
      <Card
        label="Hakediş yükümlülüğü"
        value={formatFinanceMoney(payroll.approvedUnpaidKurus)}
        hint={`${payroll.approvedUnpaidCount} satır onaylı · ödenmemiş`}
        tone={payroll.approvedUnpaidKurus > 0 ? "warn" : "neutral"}
      />
      <Card
        label="Net nakit akışı"
        value={formatFinanceMoney(accounting.netKurus)}
        hint="Gerçekleşen gelir − gider"
        tone={accounting.netKurus < 0 ? "bad" : accounting.netKurus > 0 ? "ok" : "neutral"}
      />
    </div>
  );
}
