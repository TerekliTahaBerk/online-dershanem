/**
 * Phase 2 / Session 14 — Receivables table (overdue + upcoming).
 *
 * Server component. Read-only. Each row deep-links to the admin payment-
 * schedule page with the row id as a search param so the existing list view
 * can scroll to / highlight it. We don't introduce a new detail route here.
 *
 * Stage 3H: migrated to v2 `od-finance-card` + `od-table` + soft-pill.
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

function statusPillClass(s: ReceivableRow["status"]): string {
  switch (s) {
    case "OVERDUE":
      return "is-blush";
    case "PARTIAL":
      return "is-yellow";
    case "PAID":
      return "is-mint";
    case "CANCELLED":
      return "";
    default:
      return "is-sky";
  }
}

function rowAlertClass(s: ReceivableRow["status"], variant: "overdue" | "upcoming"): string {
  if (s === "OVERDUE") return "od-finance-row-alert is-overdue";
  if (s === "PAID") return "od-finance-row-alert is-paid";
  if (s === "CANCELLED") return "od-finance-row-alert is-cancelled";
  if (variant === "upcoming") return "od-finance-row-alert is-upcoming";
  return "";
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
    <section className="od-finance-card">
      <div className="od-finance-card-header">
        <h3 className="od-finance-card-title">{title}</h3>
        <Link
          href="/panel/admin/odemeler"
          className="od-btn ghost sm"
        >
          Tüm vadeli ödemeler →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="od-money-muted" style={{ fontSize: 13 }}>{emptyLabel}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="od-table">
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Öğrenci / Veli</th>
                <th>Vade</th>
                <th style={{ textAlign: "right" }}>Tutar</th>
                <th style={{ textAlign: "right" }}>Kalan</th>
                <th>Durum</th>
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
                  <tr key={r.id} className={rowAlertClass(r.status, variant)}>
                    <td>
                      {r.title}
                      {r.packageName ? (
                        <span className="od-money-muted" style={{ marginLeft: 8, fontSize: 11.5 }}>
                          {r.packageName}
                        </span>
                      ) : null}
                    </td>
                    <td className="od-money-muted">{who}</td>
                    <td className={r.status === "OVERDUE" ? "od-money-negative" : "od-money-muted"}>
                      {dueLabel}
                    </td>
                    <td style={{ textAlign: "right", fontFeatureSettings: '"tnum"' }}>
                      {formatFinanceMoney(r.amountKurus)}
                    </td>
                    <td style={{ textAlign: "right", fontFeatureSettings: '"tnum"', fontWeight: 600 }}>
                      {formatFinanceMoney(r.remainingKurus)}
                    </td>
                    <td>
                      <span className={`soft-pill ${statusPillClass(r.status)}`.trim()}>
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
