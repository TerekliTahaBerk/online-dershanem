/**
 * Phase 2 / Session 11 — Admin payroll period KPI cards.
 * Stage 3H: migrated to v2 `mini-kpi-card` + money tone helpers.
 */
import {
  formatPayrollMoney,
  type PayrollPeriodSummary,
} from "@/lib/panel/teacher-payroll-display";
import { PayrollStatusBadge } from "@/components/panel/finance/payroll-status-badge";

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

export function PayrollSummaryCards({
  summary,
}: {
  summary: PayrollPeriodSummary;
}) {
  const t = summary.totals;
  const hours = (t.totalMinutes / 60).toLocaleString("tr-TR", {
    maximumFractionDigits: 1,
  });
  const issueCount = t.rateMissingCount + t.attendanceMissingCount;
  return (
    <div className="space-y-3">
      <div className="od-payroll-status-row">
        <PayrollStatusBadge status={summary.status} />
        <strong>{summary.title}</strong>
        <span className="od-money-muted">
          {new Date(summary.startsAt).toLocaleDateString("tr-TR")} —{" "}
          {new Date(summary.endsAt).toLocaleDateString("tr-TR")}
        </span>
      </div>
      <div className="od-finance-kpi-grid">
        <MiniKpi
          label="Tahmini Hakediş"
          value={formatPayrollMoney(t.estimatedKurus)}
          hint={`${t.itemCount} satır • ${t.teacherCount} öğretmen • ${hours} saat`}
        />
        <MiniKpi
          label="Onaylı Tutar"
          value={formatPayrollMoney(t.approvedKurus)}
          valueClass="od-money-positive"
        />
        <MiniKpi
          label="Ödenen"
          value={formatPayrollMoney(t.paidKurus)}
          valueClass="od-money-positive"
        />
        <MiniKpi
          label="İncelemede"
          value={`${issueCount}`}
          hint={`Ücret eksik: ${t.rateMissingCount} • Yoklama eksik: ${t.attendanceMissingCount}`}
          valueClass={issueCount > 0 ? "od-money-negative" : "od-money-muted"}
        />
      </div>
    </div>
  );
}
