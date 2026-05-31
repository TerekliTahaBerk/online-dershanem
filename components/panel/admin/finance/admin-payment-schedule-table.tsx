/**
 * Admin "vadeler" listesi — tüm `PaymentScheduleItem` kayıtları.
 * Listeleme + filtreler bu komponentte; mutasyonlar inline form action ile.
 */
"use client";

import { useTransition } from "react";
import {
  formatMoneyTRY,
  type PaymentScheduleRow,
} from "@/lib/panel/parent-finance-display";
import { PaymentStatusBadge } from "@/components/panel/finance/payment-status-badge";
import {
  cancelPaymentScheduleItemAction,
  markPaymentScheduleItemPaidAction,
  markPaymentScheduleItemPartialAction,
} from "@/app/panel/admin/odemeler/_actions";

function dueLabel(row: PaymentScheduleRow): string {
  const dt = new Date(row.dueDate).toLocaleDateString("tr-TR");
  if (row.displayStatus === "OVERDUE") {
    return `${dt} — ${Math.abs(row.daysUntilDue)} gün gecikti`;
  }
  return dt;
}

export function AdminPaymentScheduleTable({
  rows,
}: {
  rows: PaymentScheduleRow[];
}) {
  const [pending, start] = useTransition();

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Bu filtreyle eşleşen vade kaydı yok.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">Başlık</th>
            <th className="px-3 py-2">Öğrenci / Veli</th>
            <th className="px-3 py-2">Vade</th>
            <th className="px-3 py-2">Tutar</th>
            <th className="px-3 py-2">Durum</th>
            <th className="px-3 py-2">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => {
            const isPaid = row.displayStatus === "PAID";
            const isCancelled = row.displayStatus === "CANCELLED";
            return (
              <tr key={row.id} className={isCancelled ? "bg-slate-50/50" : ""}>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{row.title}</div>
                  {row.packageName ? (
                    <div className="text-xs text-slate-500">
                      {row.packageName}
                    </div>
                  ) : null}
                  {row.note ? (
                    <div className="text-xs text-slate-500">Not: {row.note}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {row.studentFullName ?? "—"}
                </td>
                <td className="px-3 py-2 text-slate-600">{dueLabel(row)}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-slate-900">
                    {formatMoneyTRY(row.amountKurus)}
                  </div>
                  {row.paidAmountKurus > 0 ? (
                    <div className="text-xs text-slate-500">
                      Ödenen: {formatMoneyTRY(row.paidAmountKurus)}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <PaymentStatusBadge status={row.displayStatus} />
                </td>
                <td className="px-3 py-2">
                  {isPaid || isCancelled ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Bu vadeyi tamamen ödendi olarak işaretlensin mi?",
                            )
                          )
                            return;
                          const fd = new FormData();
                          fd.set("writeAccounting", "1");
                          start(() =>
                            markPaymentScheduleItemPaidAction(row.id, fd),
                          );
                        }}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Ödendi
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const input = window.prompt(
                            `Şimdiye kadar ödenen toplam tutar (₺) — toplam ${formatMoneyTRY(
                              row.amountKurus,
                            )}`,
                            (row.paidAmountKurus / 100).toFixed(2),
                          );
                          if (!input) return;
                          const fd = new FormData();
                          fd.set("paidAmount", input);
                          start(() =>
                            markPaymentScheduleItemPartialAction(row.id, fd),
                          );
                        }}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Kısmi
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const reason = window.prompt(
                            "İptal sebebi (opsiyonel)",
                            "",
                          );
                          if (reason === null) return;
                          const fd = new FormData();
                          if (reason) fd.set("reason", reason);
                          start(() =>
                            cancelPaymentScheduleItemAction(row.id, fd),
                          );
                        }}
                        className="rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        İptal
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
