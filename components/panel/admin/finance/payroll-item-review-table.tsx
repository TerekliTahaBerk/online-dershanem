/**
 * Phase 2 / Session 11 — Per-item review table for the period detail page.
 * Allows admin to approve / review / exclude / adjust / mark paid.
 * Stage 3H: migrated to v2 `premium-table` + soft action buttons.
 */
"use client";

import { useTransition } from "react";
import {
  formatPayrollMoney,
  type PayrollItemRow,
} from "@/lib/panel/teacher-payroll-display";
import { PayrollStatusBadge } from "@/components/panel/finance/payroll-status-badge";
import {
  approvePayrollItemAction,
  reviewPayrollItemAction,
  excludePayrollItemAction,
  adjustPayrollItemAction,
  markPayrollItemPaidAction,
} from "@/app/panel/admin/ogretmen-hakedisleri/_actions";

export function PayrollItemReviewTable({
  rows,
  locked = false,
}: {
  rows: PayrollItemRow[];
  /** When the parent period is LOCKED or PAID, hide mutation buttons. */
  locked?: boolean;
}) {
  const [pending, start] = useTransition();
  if (rows.length === 0) {
    return (
      <div className="od-empty-soft">Bu filtreyle eşleşen satır yok.</div>
    );
  }
  return (
    <div className="premium-table" style={{ overflowX: "auto" }}>
      <table className="od-table">
        <thead>
          <tr>
            <th>Öğretmen / Ders</th>
            <th>Tarih</th>
            <th>Dakika</th>
            <th>Saatlik</th>
            <th>Brüt</th>
            <th>Düzeltme</th>
            <th>Net</th>
            <th>Durum</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const flags: string[] = [];
            if (row.rateMissing) flags.push("Saatlik ücret yok");
            if (row.attendanceMissing) flags.push("Yoklama eksik");
            const canMutate =
              !locked && row.status !== "PAID" && row.status !== "EXCLUDED";
            const canApprove = canMutate && !row.rateMissing;
            const isExcluded = row.status === "EXCLUDED";
            return (
              <tr
                key={row.id}
                className={
                  isExcluded
                    ? "od-finance-row-alert is-cancelled"
                    : row.status === "PAID"
                      ? "od-finance-row-alert is-paid"
                      : ""
                }
              >
                <td>
                  <div style={{ fontWeight: 500, color: "#14140F" }}>
                    {row.teacherName}
                  </div>
                  <div className="od-money-muted" style={{ fontSize: 11.5 }}>
                    {row.lessonTitle ?? row.courseTitle ?? "Manuel satır"}
                    {row.classroomName ? ` • ${row.classroomName}` : ""}
                    {row.studentName ? ` • ${row.studentName}` : ""}
                  </div>
                  {flags.length > 0 ? (
                    <div style={{ marginTop: 4 }}>
                      <span className="od-finance-flag-chip">
                        ⚠ {flags.join(" · ")}
                      </span>
                    </div>
                  ) : null}
                  {row.note ? (
                    <div className="od-money-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                      Not: {row.note}
                    </div>
                  ) : null}
                </td>
                <td className="od-money-muted">
                  {row.scheduledAt
                    ? new Date(row.scheduledAt).toLocaleDateString("tr-TR")
                    : "—"}
                </td>
                <td className="od-money-muted">{row.minutes}</td>
                <td className="od-money-muted">
                  {row.rateMissing
                    ? "—"
                    : formatPayrollMoney(row.hourlyRateKurus)}
                </td>
                <td>{formatPayrollMoney(row.grossAmountKurus)}</td>
                <td>
                  {row.adjustmentAmountKurus !== 0
                    ? formatPayrollMoney(row.adjustmentAmountKurus)
                    : "—"}
                </td>
                <td className="od-money-positive">
                  {formatPayrollMoney(row.finalAmountKurus)}
                </td>
                <td>
                  <PayrollStatusBadge status={row.status} />
                </td>
                <td>
                  {!canMutate ? (
                    <span className="od-money-muted">—</span>
                  ) : (
                    <div className="od-finance-inline-actions">
                      {canApprove ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            start(() => approvePayrollItemAction(row.id))
                          }
                          className="od-btn dark sm"
                        >
                          Onayla
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          start(() => reviewPayrollItemAction(row.id))
                        }
                        className="od-btn ghost sm"
                      >
                        İncele
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const v = window.prompt(
                            "Düzeltme tutarı (₺, eksi olabilir):",
                            (row.adjustmentAmountKurus / 100).toFixed(2),
                          );
                          if (v === null) return;
                          const fd = new FormData();
                          fd.set("adjustment", v);
                          start(() => adjustPayrollItemAction(row.id, fd));
                        }}
                        className="od-btn ghost sm"
                      >
                        Düzelt
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const r = window.prompt("Hariç tutma sebebi:", "");
                          if (r === null) return;
                          const fd = new FormData();
                          if (r) fd.set("reason", r);
                          start(() => excludePayrollItemAction(row.id, fd));
                        }}
                        className="od-btn ghost sm"
                        style={{ color: "var(--pd-pastel-blush-ink, #B25758)" }}
                      >
                        Hariç
                      </button>
                      {row.status === "APPROVED" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                "Bu satır ödendi olarak işaretlensin ve muhasebe gideri yazılsın mı?",
                              )
                            )
                              return;
                            const fd = new FormData();
                            fd.set("writeAccounting", "1");
                            start(() =>
                              markPayrollItemPaidAction(row.id, fd),
                            );
                          }}
                          className="od-btn dark sm"
                        >
                          Ödendi
                        </button>
                      ) : null}
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
