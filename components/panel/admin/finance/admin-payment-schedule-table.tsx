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
      <div className="od-empty-soft">Bu filtreyle eşleşen vade kaydı yok.</div>
    );
  }

  return (
    <div className="premium-table" style={{ overflowX: "auto" }}>
      <table className="od-table">
        <thead>
          <tr>
            <th>Başlık</th>
            <th>Öğrenci / Veli</th>
            <th>Vade</th>
            <th>Tutar</th>
            <th>Durum</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isPaid = row.displayStatus === "PAID";
            const isCancelled = row.displayStatus === "CANCELLED";
            const isOverdue = row.displayStatus === "OVERDUE";
            const rowAlertClass = isPaid
              ? "od-finance-row-alert is-paid"
              : isCancelled
                ? "od-finance-row-alert is-cancelled"
                : isOverdue
                  ? "od-finance-row-alert is-overdue"
                  : "";
            return (
              <tr key={row.id} className={rowAlertClass}>
                <td>
                  <div style={{ fontWeight: 500, color: "#14140F" }}>
                    {row.title}
                  </div>
                  {row.packageName ? (
                    <div className="od-money-muted" style={{ fontSize: 11.5 }}>
                      {row.packageName}
                    </div>
                  ) : null}
                  {row.note ? (
                    <div className="od-money-muted" style={{ fontSize: 11.5 }}>
                      Not: {row.note}
                    </div>
                  ) : null}
                </td>
                <td className="od-money-muted">
                  {row.studentFullName ?? "—"}
                </td>
                <td className={isOverdue ? "od-money-negative" : "od-money-muted"}>
                  {dueLabel(row)}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: "#14140F" }}>
                    {formatMoneyTRY(row.amountKurus)}
                  </div>
                  {row.paidAmountKurus > 0 ? (
                    <div className="od-money-muted" style={{ fontSize: 11.5 }}>
                      Ödenen: {formatMoneyTRY(row.paidAmountKurus)}
                    </div>
                  ) : null}
                </td>
                <td>
                  <PaymentStatusBadge status={row.displayStatus} />
                </td>
                <td>
                  {isPaid || isCancelled ? (
                    <span className="od-money-muted">—</span>
                  ) : (
                    <div className="od-finance-inline-actions">
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
                        className="od-btn dark sm"
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
                        className="od-btn ghost sm"
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
                        className="od-btn ghost sm"
                        style={{ color: "var(--pd-pastel-blush-ink, #B25758)" }}
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
