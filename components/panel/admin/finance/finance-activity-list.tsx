/**
 * Phase 2 / Session 14 — Finance activity list (recent AccountingEntry).
 *
 * Server component, read-only. Cross-links to `/panel/admin/muhasebe`.
 */
import Link from "next/link";
import {
  formatFinanceMoney,
  getAccessServiceLabel,
  getEntryCategoryLabel,
  type FinanceActivityRow,
} from "@/lib/panel/admin-finance-reports-display";

const DATETIME_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function FinanceActivityList({ rows }: { rows: FinanceActivityRow[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Son finans hareketleri</h3>
        <Link
          href="/panel/admin/muhasebe?service=OD"
          className="text-xs font-medium text-sky-700 hover:underline"
        >
          Muhasebe defterine git →
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Hareket yok.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {rows.map((r) => {
            const isIncome = r.type === "INCOME";
            const subject =
              r.studentName ?? r.teacherName ?? r.packageName ?? r.description ?? "—";
            return (
              <li
                key={r.id}
                className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-slate-900">
                    <span
                      className={`mr-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                        isIncome
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-rose-50 text-rose-700 ring-rose-200"
                      }`}
                    >
                      {isIncome ? "Gelir" : "Gider"}
                    </span>
                    <span className="font-medium">{getEntryCategoryLabel(r.category)}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {getAccessServiceLabel(r.service)}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {DATETIME_FMT.format(r.occurredAt)} · {subject}
                  </div>
                </div>
                <div
                  className={`shrink-0 text-right tabular-nums font-medium ${
                    isIncome ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {isIncome ? "+" : "−"}
                  {formatFinanceMoney(r.amountKurus)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
