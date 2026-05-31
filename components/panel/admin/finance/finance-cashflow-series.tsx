/**
 * Phase 2 / Session 14 — Monthly cashflow series (compact table view).
 *
 * Deliberately a table, not a chart. The codebase doesn't currently bundle a
 * charting dependency and Session 14 is not the place to add one.
 */
import {
  formatFinanceMoney,
  type CashflowMonthPoint,
} from "@/lib/panel/admin-finance-reports-display";

export function FinanceCashflowSeries({ points }: { points: CashflowMonthPoint[] }) {
  if (!points.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Aylık nakit akışı</h3>
        <p className="text-sm text-slate-500">Bu aralıkta muhasebe kaydı yok.</p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Aylık nakit akışı</h3>
        <span className="text-xs text-slate-500">
          Gerçekleşen muhasebe kayıtları (kuruş bazında)
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="py-1 pr-3">Ay</th>
              <th className="py-1 pr-3 text-right">Gelir</th>
              <th className="py-1 pr-3 text-right">Gider</th>
              <th className="py-1 pr-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.monthKey} className="border-t border-slate-100">
                <td className="py-1.5 pr-3 text-slate-700">{p.monthLabel}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-emerald-700">
                  {formatFinanceMoney(p.incomeKurus)}
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-rose-700">
                  {formatFinanceMoney(p.expenseKurus)}
                </td>
                <td
                  className={`py-1.5 pr-3 text-right tabular-nums font-medium ${
                    p.netKurus < 0
                      ? "text-rose-700"
                      : p.netKurus > 0
                        ? "text-emerald-700"
                        : "text-slate-700"
                  }`}
                >
                  {formatFinanceMoney(p.netKurus)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
