/**
 * Phase 2 / Session 14 — Receivables table (overdue + upcoming).
 *
 * Server component. Read-only. Each row deep-links to the admin payment-
 * schedule page with the row id as a search param so the existing list view
 * can scroll to / highlight it. We don't introduce a new detail route here.
 */
import Link from "next/link";
import {
  formatFinanceMoney,
  type ReceivableRow,
} from "@/lib/panel/admin-finance-reports-display";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function statusLabel(s: ReceivableRow["status"]): string {
  switch (s) {
    case "OVERDUE":
      return "Gecikti";
    case "PARTIAL":
      return "Kısmi";
    case "PAID":
      return "Ödendi";
    case "CANCELLED":
      return "İptal";
    default:
      return "Bekliyor";
  }
}

function statusToneClass(s: ReceivableRow["status"]): string {
  switch (s) {
    case "OVERDUE":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "PARTIAL":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "PAID":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-sky-50 text-sky-700 ring-sky-200";
  }
}

export function FinanceReceivablesTable({
  title,
  rows,
  emptyLabel,
  variant,
}: {
  title: string;
  rows: ReceivableRow[];
  emptyLabel: string;
  variant: "overdue" | "upcoming";
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <Link
          href="/panel/admin/odemeler"
          className="text-xs font-medium text-sky-700 hover:underline"
        >
          Tüm vadeli ödemeler →
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-1 pr-3">Başlık</th>
                <th className="py-1 pr-3">Öğrenci / Veli</th>
                <th className="py-1 pr-3">Vade</th>
                <th className="py-1 pr-3 text-right">Tutar</th>
                <th className="py-1 pr-3 text-right">Kalan</th>
                <th className="py-1 pr-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const dt = DATE_FMT.format(r.dueDate);
                const dueLabel =
                  variant === "overdue"
                    ? `${dt} (${Math.abs(r.daysUntilDue)} gün gecikti)`
                    : r.daysUntilDue === 0
                      ? `${dt} (bugün)`
                      : `${dt} (${r.daysUntilDue} gün)`;
                const who =
                  r.studentFullName ?? r.parentFullName ?? "—";
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3 text-slate-700">
                      {r.title}
                      {r.packageName ? (
                        <span className="ml-2 text-xs text-slate-500">{r.packageName}</span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-700">{who}</td>
                    <td className="py-1.5 pr-3 text-slate-600">{dueLabel}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-slate-800">
                      {formatFinanceMoney(r.amountKurus)}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums font-medium text-slate-900">
                      {formatFinanceMoney(r.remainingKurus)}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
