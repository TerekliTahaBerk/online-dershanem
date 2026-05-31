/**
 * Parent finance summary KPI cards.
 * Pure presentational; gets pre-computed counts/totals from the helper.
 */
import {
  formatMoneyTRY,
  type ParentFinanceSummary,
} from "@/lib/panel/parent-finance";

function Card({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string | null;
  tone?: "neutral" | "warn" | "bad" | "ok";
}) {
  const toneClass =
    tone === "warn"
      ? "border-amber-200 bg-amber-50/40"
      : tone === "bad"
        ? "border-rose-200 bg-rose-50/40"
        : tone === "ok"
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? (
        <div className="mt-1 text-xs text-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}

export function ParentFinanceSummaryCards({
  summary,
}: {
  summary: ParentFinanceSummary;
}) {
  if (!summary.hasTrackedItems) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Henüz vadeli ödeme kaydı bulunmuyor. Yeni paket satın alındığında veya
        yönetim tarafından bir ödeme planı oluşturulduğunda burada görünür.
      </div>
    );
  }

  const nextHint = summary.nextDue
    ? `Sıradaki: ${summary.nextDue.title} — ${new Date(
        summary.nextDue.dueDate,
      ).toLocaleDateString("tr-TR")}`
    : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        label="Toplam Bekleyen"
        value={formatMoneyTRY(summary.totalOutstandingKurus)}
        hint={`${summary.upcomingCount + summary.overdueCount} kayıt`}
        tone={summary.overdueCount > 0 ? "warn" : "neutral"}
      />
      <Card
        label="Yaklaşan"
        value={String(summary.upcomingCount)}
        hint={nextHint}
        tone="neutral"
      />
      <Card
        label="Geciken"
        value={String(summary.overdueCount)}
        hint={
          summary.overdueCount > 0
            ? formatMoneyTRY(summary.overdueTotalKurus)
            : "Geciken ödeme yok"
        }
        tone={summary.overdueCount > 0 ? "bad" : "ok"}
      />
      <Card
        label="Ödenen"
        value={String(summary.paidCount)}
        hint={formatMoneyTRY(summary.paidTotalKurus)}
        tone="ok"
      />
    </div>
  );
}
