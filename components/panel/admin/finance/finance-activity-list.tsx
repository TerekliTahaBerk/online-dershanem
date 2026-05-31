/**
 * Phase 2 / Session 14 — Finance activity list (recent AccountingEntry).
 *
 * Server component, read-only. Cross-links to `/panel/admin/muhasebe`.
 *
 * Stage 3H: migrated to v2 `od-finance-card` + `od-finance-timeline` + soft-pill.
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
    <section className="od-finance-card">
      <div className="od-finance-card-header">
        <h3 className="od-finance-card-title">Son finans hareketleri</h3>
        <Link
          href="/panel/admin/muhasebe?service=OD"
          className="od-btn ghost sm"
        >
          Muhasebe defterine git →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="od-money-muted" style={{ fontSize: 13 }}>Hareket yok.</p>
      ) : (
        <ul className="od-finance-timeline">
          {rows.map((r) => {
            const isIncome = r.type === "INCOME";
            const subject =
              r.studentName ?? r.teacherName ?? r.packageName ?? r.description ?? "—";
            return (
              <li key={r.id}>
                <div className="od-finance-timeline-body">
                  <div className="od-finance-timeline-title">
                    <span className={`soft-pill ${isIncome ? "is-mint" : "is-blush"}`}>
                      {isIncome ? "Gelir" : "Gider"}
                    </span>
                    <span style={{ fontWeight: 500 }}>
                      {getEntryCategoryLabel(r.category)}
                    </span>
                    <span className="od-money-muted" style={{ fontSize: 11.5 }}>
                      {getAccessServiceLabel(r.service)}
                    </span>
                  </div>
                  <div className="od-finance-timeline-meta">
                    {DATETIME_FMT.format(r.occurredAt)} · {subject}
                  </div>
                </div>
                <div
                  className={`od-finance-timeline-amount ${
                    isIncome ? "od-money-positive" : "od-money-negative"
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
