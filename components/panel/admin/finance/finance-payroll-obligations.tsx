/**
 * Phase 2 / Session 14 — Teacher payroll obligations panel.
 *
 * Server component. Shows aggregate KPIs + the latest in-flight items.
 * Cross-links to the existing payroll hub.
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

function statusToneClass(s: PayrollObligationRow["status"]): string {
  switch (s) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "APPROVED":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "REVIEWED":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case "EXCLUDED":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200";
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
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Öğretmen hakediş yükümlülükleri
        </h3>
        <Link
          href="/panel/admin/ogretmen-hakedisleri"
          className="text-xs font-medium text-sky-700 hover:underline"
        >
          Hakediş hub'ına git →
        </Link>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
          <div className="text-xs text-slate-500">Onaylı · ödenmemiş</div>
          <div className="text-base font-semibold text-slate-900">
            {formatFinanceMoney(summary.approvedUnpaidKurus)}
          </div>
          <div className="text-xs text-slate-500">{summary.approvedUnpaidCount} satır</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-xs text-slate-500">Taslak / İncelendi</div>
          <div className="text-base font-semibold text-slate-900">
            {formatFinanceMoney(summary.draftReviewKurus)}
          </div>
          <div className="text-xs text-slate-500">{summary.draftReviewCount} satır</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2">
          <div className="text-xs text-slate-500">Ödendi (seçili aralık)</div>
          <div className="text-base font-semibold text-slate-900">
            {formatFinanceMoney(summary.paidInRangeKurus)}
          </div>
          <div className="text-xs text-slate-500">{summary.paidInRangeCount} satır</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          Onay bekleyen ya da incelenen hakediş satırı yok.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-1 pr-3">Öğretmen</th>
                <th className="py-1 pr-3">Dönem</th>
                <th className="py-1 pr-3">Ders</th>
                <th className="py-1 pr-3 text-right">Tutar</th>
                <th className="py-1 pr-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.itemId} className="border-t border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-700">
                    {r.teacherFullName}
                    {r.rateMissing || r.attendanceMissing ? (
                      <span
                        className="ml-2 inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-200"
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
                  <td className="py-1.5 pr-3 text-slate-600">
                    <Link
                      href={`/panel/admin/ogretmen-hakedisleri/${r.periodId}`}
                      className="hover:underline"
                    >
                      {r.periodTitle}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3 text-slate-600">
                    {r.scheduledAt ? DATE_FMT.format(r.scheduledAt) : "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums font-medium text-slate-900">
                    {formatFinanceMoney(r.finalAmountKurus)}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusToneClass(
                        r.status,
                      )}`}
                    >
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
