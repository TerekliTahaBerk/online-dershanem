/**
 * Phase 2 / Session 14 — Teacher payroll obligations panel.
 *
 * Server component. Shows aggregate KPIs + the latest in-flight items.
 * Cross-links to the existing payroll hub.
 *
 * Stage 3H: migrated to v2 `od-finance-card` + `mini-kpi-card` + soft-pill.
 */
import Link from "next/link";
import {
  formatFinanceMoney,
  type PayrollObligationRow,
  type TeacherPayrollObligationsSummary,
} from "@/lib/panel/admin-finance-reports-display";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function statusLabel(s: PayrollObligationRow["status"]): string {
  switch (s) {
    case "PAID":
      return "Ödendi";
    case "APPROVED":
      return "Onaylı";
    case "REVIEWED":
      return "İncelendi";
    case "EXCLUDED":
      return "Hariç";
    default:
      return "Taslak";
  }
}

function statusPillClass(s: PayrollObligationRow["status"]): string {
  switch (s) {
    case "PAID":
    case "APPROVED":
      return "is-mint";
    case "REVIEWED":
      return "is-sky";
    case "EXCLUDED":
      return "is-blush";
    default:
      return "is-lavender";
  }
}

export function FinancePayrollObligations({
  summary,
  rows,
}: {
  summary: TeacherPayrollObligationsSummary;
  rows: PayrollObligationRow[];
}) {
  return (
    <section className="od-finance-card">
      <div className="od-finance-card-header">
        <h3 className="od-finance-card-title">
          Öğretmen hakediş yükümlülükleri
        </h3>
        <Link
          href="/panel/admin/ogretmen-hakedisleri"
          className="od-btn ghost sm"
        >
          Hakediş hub&apos;ına git →
        </Link>
      </div>

      <div className="od-finance-kpi-grid" style={{ marginBottom: 14 }}>
        <div className="mini-kpi-card">
          <div className="k-label">Onaylı · ödenmemiş</div>
          <div
            className={`k-value ${
              summary.approvedUnpaidKurus > 0 ? "od-money-negative" : "od-money-muted"
            }`}
          >
            {formatFinanceMoney(summary.approvedUnpaidKurus)}
          </div>
          <div className="k-meta">{summary.approvedUnpaidCount} satır</div>
        </div>
        <div className="mini-kpi-card">
          <div className="k-label">Taslak / İncelendi</div>
          <div className="k-value">
            {formatFinanceMoney(summary.draftReviewKurus)}
          </div>
          <div className="k-meta">{summary.draftReviewCount} satır</div>
        </div>
        <div className="mini-kpi-card">
          <div className="k-label">Ödendi (seçili aralık)</div>
          <div className="k-value od-money-positive">
            {formatFinanceMoney(summary.paidInRangeKurus)}
          </div>
          <div className="k-meta">{summary.paidInRangeCount} satır</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="od-money-muted" style={{ fontSize: 13 }}>
          Onay bekleyen ya da incelenen hakediş satırı yok.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="od-table">
            <thead>
              <tr>
                <th>Öğretmen</th>
                <th>Dönem</th>
                <th>Ders</th>
                <th style={{ textAlign: "right" }}>Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.itemId}>
                  <td>
                    {r.teacherFullName}
                    {r.rateMissing || r.attendanceMissing ? (
                      <span
                        className="od-finance-flag-chip"
                        style={{ marginLeft: 8 }}
                        title={[
                          r.rateMissing ? "Saat ücreti tanımlı değil" : null,
                          r.attendanceMissing ? "Yoklama eksik" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      >
                        Eksik bilgi
                      </span>
                    ) : null}
                  </td>
                  <td className="od-money-muted">
                    <Link
                      href={`/panel/admin/ogretmen-hakedisleri/${r.periodId}`}
                      className="hover:underline"
                    >
                      {r.periodTitle}
                    </Link>
                  </td>
                  <td className="od-money-muted">
                    {r.scheduledAt ? DATE_FMT.format(r.scheduledAt) : "—"}
                  </td>
                  <td style={{ textAlign: "right", fontFeatureSettings: '"tnum"', fontWeight: 600 }}>
                    {formatFinanceMoney(r.finalAmountKurus)}
                  </td>
                  <td>
                    <span className={`soft-pill ${statusPillClass(r.status)}`.trim()}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
