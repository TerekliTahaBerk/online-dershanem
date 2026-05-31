/**
 * Phase 2 / Session 11 — Admin payroll period KPI cards.
 */
import {
  formatPayrollMoney,
  type PayrollPeriodSummary,
} from "@/lib/panel/teacher-payroll-display";
import { PayrollStatusBadge } from "@/components/panel/finance/payroll-status-badge";

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
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
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
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <PayrollStatusBadge status={summary.status} />
        <span>{summary.title}</span>
        <span className="text-xs text-slate-400">
          {new Date(summary.startsAt).toLocaleDateString("tr-TR")} —{" "}
          {new Date(summary.endsAt).toLocaleDateString("tr-TR")}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Tahmini Hakediş"
          value={formatPayrollMoney(t.estimatedKurus)}
          hint={`${t.itemCount} satır • ${t.teacherCount} öğretmen • ${hours} saat`}
        />
        <Card
          label="Onaylı Tutar"
          value={formatPayrollMoney(t.approvedKurus)}
          tone="accent"
        />
        <Card
          label="Ödenen"
          value={formatPayrollMoney(t.paidKurus)}
          tone="ok"
        />
        <Card
          label="İncelemede"
          value={`${t.rateMissingCount + t.attendanceMissingCount}`}
          hint={`Ücret eksik: ${t.rateMissingCount} • Yoklama eksik: ${t.attendanceMissingCount}`}
          tone={
            t.rateMissingCount + t.attendanceMissingCount > 0
              ? "warn"
              : "neutral"
          }
        />
      </div>
    </div>
  );
}
