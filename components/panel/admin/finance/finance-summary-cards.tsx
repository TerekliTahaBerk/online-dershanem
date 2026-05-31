/**
 * Phase 2 / Session 14 — Finance summary KPI cards (admin cockpit).
 *
 * Pure server component (no `"use client"`). Imports only the display
 * module so it can be rendered from a server page safely.
 *
 * Stage 3H: migrated to v2 `mini-kpi-card` + money tone helpers.
 */
import {
  formatFinanceMoney,
  type AccountingSummary,
  type PaymentScheduleSummary,
  type TeacherPayrollObligationsSummary,
} from "@/lib/panel/admin-finance-reports-display";

function MiniKpi({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string | null;
  valueClass?: string;
}) {
  return (
    <div className="mini-kpi-card">
      <div className="k-label">{label}</div>
      <div className={`k-value ${valueClass ?? ""}`.trim()}>{value}</div>
      {hint ? <div className="k-meta">{hint}</div> : null}
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
    <div className="od-finance-kpi-grid">
      <MiniKpi
        label="Beklenen tahsilat"
        value={formatFinanceMoney(receivables.upcomingRemainingKurus)}
        hint={`${receivables.upcomingCount} satır · vadeli ödeme kalanı`}
      />
      <MiniKpi
        label="Geciken tahsilat"
        value={formatFinanceMoney(receivables.overdueRemainingKurus)}
        hint={`${receivables.overdueCount} satır · vadesi geçmiş kalanı`}
        valueClass={
          receivables.overdueRemainingKurus > 0 ? "od-money-negative" : "od-money-muted"
        }
      />
      <MiniKpi
        label="Gerçekleşen gelir"
        value={formatFinanceMoney(accounting.incomeKurus)}
        hint="Muhasebe kayıtları (seçili aralık)"
        valueClass="od-money-positive"
      />
      <MiniKpi
        label="Gider"
        value={formatFinanceMoney(accounting.expenseKurus)}
        hint="Muhasebe kayıtları (seçili aralık)"
        valueClass={
          accounting.expenseKurus > 0 ? "od-money-negative" : "od-money-muted"
        }
      />
      <MiniKpi
        label="Hakediş yükümlülüğü"
        value={formatFinanceMoney(payroll.approvedUnpaidKurus)}
        hint={`${payroll.approvedUnpaidCount} satır onaylı · ödenmemiş`}
        valueClass={
          payroll.approvedUnpaidKurus > 0 ? "od-money-negative" : "od-money-muted"
        }
      />
      <MiniKpi
        label="Net nakit akışı"
        value={formatFinanceMoney(accounting.netKurus)}
        hint="Gerçekleşen gelir − gider"
        valueClass={
          accounting.netKurus < 0
            ? "od-money-negative"
            : accounting.netKurus > 0
              ? "od-money-positive"
              : "od-money-muted"
        }
      />
    </div>
  );
}
