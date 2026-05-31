/**
 * Phase 2 / Session 11 — Compensation rule list table.
 */
"use client";

import { useTransition } from "react";
import {
  formatPayrollMoney,
  type CompensationRuleRow,
} from "@/lib/panel/teacher-payroll-display";
import {
  toggleCompensationRuleActiveAction,
  deleteCompensationRuleAction,
} from "@/app/panel/admin/ogretmen-hakedisleri/_actions";

function scopeLabel(row: CompensationRuleRow): string {
  const parts: string[] = [];
  if (row.courseTitle) parts.push(row.courseTitle);
  if (row.classroomName) parts.push(row.classroomName);
  return parts.length === 0 ? "Varsayılan" : parts.join(" • ");
}

export function CompensationRuleTable({
  rows,
}: {
  rows: CompensationRuleRow[];
}) {
  const [pending, start] = useTransition();
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Henüz tanımlanmış kural yok.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">Öğretmen</th>
            <th className="px-3 py-2">Kapsam</th>
            <th className="px-3 py-2">Saatlik</th>
            <th className="px-3 py-2">Aralık</th>
            <th className="px-3 py-2">Aktif</th>
            <th className="px-3 py-2">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => (
            <tr key={row.id} className={row.isActive ? "" : "bg-slate-50/60"}>
              <td className="px-3 py-2 font-medium text-slate-900">
                {row.teacherName}
              </td>
              <td className="px-3 py-2 text-slate-600">{scopeLabel(row)}</td>
              <td className="px-3 py-2 font-semibold text-slate-900">
                {formatPayrollMoney(row.hourlyRateKurus)} / saat
              </td>
              <td className="px-3 py-2 text-xs text-slate-500">
                {row.startsAt
                  ? new Date(row.startsAt).toLocaleDateString("tr-TR")
                  : "—"}
                {" → "}
                {row.endsAt
                  ? new Date(row.endsAt).toLocaleDateString("tr-TR")
                  : "—"}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    row.isActive
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  {row.isActive ? "Aktif" : "Pasif"}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(() => toggleCompensationRuleActiveAction(row.id))
                    }
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {row.isActive ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Bu kural silinsin mi? (Kullanılmışsa pasif yapılır.)",
                        )
                      )
                        return;
                      start(() => deleteCompensationRuleAction(row.id));
                    }}
                    className="rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    Sil
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
