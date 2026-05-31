/**
 * Parent-facing paid-history table. Read-only.
 */
import {
  formatMoneyTRY,
  type PaymentScheduleRow,
} from "@/lib/panel/parent-finance-display";
import { PaymentStatusBadge } from "@/components/panel/finance/payment-status-badge";

export function ParentPaidHistory({ rows }: { rows: PaymentScheduleRow[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        Ödeme Geçmişi
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Ödenmiş kayıt bulunmuyor.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Açıklama</th>
                <th className="py-2 pr-3">Öğrenci</th>
                <th className="py-2 pr-3">Vade</th>
                <th className="py-2 pr-3">Ödenen</th>
                <th className="py-2 pr-3">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-3 font-medium text-slate-900">
                    {row.title}
                    {row.packageName ? (
                      <div className="text-xs font-normal text-slate-500">
                        {row.packageName}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">
                    {row.studentFullName ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">
                    {new Date(row.dueDate).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="py-2 pr-3 text-slate-900">
                    {formatMoneyTRY(row.paidAmountKurus)}
                    {row.paidAmountKurus !== row.amountKurus ? (
                      <span className="text-xs text-slate-500">
                        {" "}
                        / {formatMoneyTRY(row.amountKurus)}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">
                    <PaymentStatusBadge status={row.displayStatus} />
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
