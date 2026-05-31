/**
 * Parent-facing "vadeler" list. Used for both upcoming and overdue
 * sections. Read-only — parents cannot mark paid here.
 */
import {
  formatMoneyTRY,
  type PaymentScheduleRow,
} from "@/lib/panel/parent-finance-display";
import { PaymentStatusBadge } from "@/components/panel/finance/payment-status-badge";

function dueLabel(row: PaymentScheduleRow): string {
  const dt = new Date(row.dueDate).toLocaleDateString("tr-TR");
  if (row.displayStatus === "OVERDUE") {
    const days = Math.abs(row.daysUntilDue);
    return `${dt} (${days} gün gecikti)`;
  }
  if (row.daysUntilDue === 0) return `${dt} (bugün)`;
  if (row.daysUntilDue > 0) return `${dt} (${row.daysUntilDue} gün kaldı)`;
  return dt;
}

export function ParentDueList({
  title,
  rows,
  emptyText,
  highlight = false,
}: {
  title: string;
  rows: PaymentScheduleRow[];
  emptyText: string;
  highlight?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border ${
        highlight ? "border-rose-200 bg-rose-50/30" : "border-slate-200 bg-white"
      } p-4`}
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {rows.map((row) => {
            const remaining = row.remainingKurus;
            return (
              <li
                key={row.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {row.title}
                    </span>
                    <PaymentStatusBadge status={row.displayStatus} />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {row.studentFullName ? `${row.studentFullName} • ` : ""}
                    {row.packageName ? `${row.packageName} • ` : ""}
                    Vade: {dueLabel(row)}
                  </div>
                  {row.note ? (
                    <div className="mt-0.5 text-xs text-slate-500">
                      Not: {row.note}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-start sm:items-end">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatMoneyTRY(remaining)}
                  </div>
                  {row.paidAmountKurus > 0 && row.paidAmountKurus < row.amountKurus ? (
                    <div className="text-xs text-slate-500">
                      Ödenen: {formatMoneyTRY(row.paidAmountKurus)} /{" "}
                      {formatMoneyTRY(row.amountKurus)}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      Toplam: {formatMoneyTRY(row.amountKurus)}
                    </div>
                  )}
                  {row.paymentLink ? (
                    <a
                      href={row.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-xs font-medium text-sky-700 hover:underline"
                    >
                      Ödeme bağlantısı →
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
