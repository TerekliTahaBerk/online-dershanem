/**
 * Phase 2 / Session 11 — Per-item review table for the period detail page.
 * Allows admin to approve / review / exclude / adjust / mark paid.
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
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Bu filtreyle eşleşen satır yok.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">Öğretmen / Ders</th>
            <th className="px-3 py-2">Tarih</th>
            <th className="px-3 py-2">Dakika</th>
            <th className="px-3 py-2">Saatlik</th>
            <th className="px-3 py-2">Brüt</th>
            <th className="px-3 py-2">Düzeltme</th>
            <th className="px-3 py-2">Net</th>
            <th className="px-3 py-2">Durum</th>
            <th className="px-3 py-2">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => {
            const flags: string[] = [];
            if (row.rateMissing) flags.push("Saatlik ücret yok");
            if (row.attendanceMissing) flags.push("Yoklama eksik");
            const canMutate =
              !locked && row.status !== "PAID" && row.status !== "EXCLUDED";
            const canApprove = canMutate && !row.rateMissing;
            return (
              <tr key={row.id}>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">
                    {row.teacherName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.lessonTitle ?? row.courseTitle ?? "Manuel satır"}
                    {row.classroomName ? ` • ${row.classroomName}` : ""}
                    {row.studentName ? ` • ${row.studentName}` : ""}
                  </div>
                  {flags.length > 0 ? (
                    <div className="mt-0.5 text-xs text-amber-700">
                      ⚠ {flags.join(" • ")}
                    </div>
                  ) : null}
                  {row.note ? (
                    <div className="mt-0.5 text-xs text-slate-500">
                      Not: {row.note}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {row.scheduledAt
                    ? new Date(row.scheduledAt).toLocaleDateString("tr-TR")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-slate-600">{row.minutes}</td>
                <td className="px-3 py-2 text-slate-600">
                  {row.rateMissing
                    ? "—"
                    : formatPayrollMoney(row.hourlyRateKurus)}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {formatPayrollMoney(row.grossAmountKurus)}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {row.adjustmentAmountKurus !== 0
                    ? formatPayrollMoney(row.adjustmentAmountKurus)
                    : "—"}
                </td>
                <td className="px-3 py-2 font-semibold text-slate-900">
                  {formatPayrollMoney(row.finalAmountKurus)}
                </td>
                <td className="px-3 py-2">
                  <PayrollStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2">
                  {!canMutate ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {canApprove ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            start(() => approvePayrollItemAction(row.id))
                          }
                          className="rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
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
                        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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
                        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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
                        className="rounded-md border border-rose-300 bg-white px-2 py-0.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
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
                          className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
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
