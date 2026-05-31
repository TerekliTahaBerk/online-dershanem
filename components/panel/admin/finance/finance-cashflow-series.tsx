/**
 * Phase 2 / Session 14 — Monthly cashflow series (compact table view).
 *
 * Deliberately a table, not a chart. The codebase doesn't currently bundle a
 * charting dependency and Session 14 is not the place to add one.
 *
 * Stage 3H: migrated to v2 `od-finance-card` + `od-table` + money classes.
 */
import {
  formatFinanceMoney,
  type CashflowMonthPoint,
} from "@/lib/panel/admin-finance-reports-display";

export function FinanceCashflowSeries({ points }: { points: CashflowMonthPoint[] }) {
  if (!points.length) {
    return (
      <section className="od-finance-card">
        <div className="od-finance-card-header">
          <h3 className="od-finance-card-title">Aylık nakit akışı</h3>
        </div>
        <p className="od-money-muted" style={{ fontSize: 13 }}>
          Bu aralıkta muhasebe kaydı yok.
        </p>
      </section>
    );
  }
  return (
    <section className="od-finance-card">
      <div className="od-finance-card-header">
        <h3 className="od-finance-card-title">Aylık nakit akışı</h3>
        <span className="od-finance-card-meta">
          Gerçekleşen muhasebe kayıtları (kuruş bazında)
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="od-table">
          <thead>
            <tr>
              <th>Ay</th>
              <th style={{ textAlign: "right" }}>Gelir</th>
              <th style={{ textAlign: "right" }}>Gider</th>
              <th style={{ textAlign: "right" }}>Net</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.monthKey}>
                <td>{p.monthLabel}</td>
                <td className="od-money-positive" style={{ textAlign: "right", fontFeatureSettings: '"tnum"' }}>
                  {formatFinanceMoney(p.incomeKurus)}
                </td>
                <td className="od-money-negative" style={{ textAlign: "right", fontFeatureSettings: '"tnum"' }}>
                  {formatFinanceMoney(p.expenseKurus)}
                </td>
                <td
                  className={
                    p.netKurus < 0
                      ? "od-money-negative"
                      : p.netKurus > 0
                        ? "od-money-positive"
                        : "od-money-muted"
                  }
                  style={{ textAlign: "right", fontFeatureSettings: '"tnum"', fontWeight: 600 }}
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
