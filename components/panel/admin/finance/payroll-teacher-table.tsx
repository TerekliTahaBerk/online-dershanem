/**
 * Phase 2 / Session 11 — Per-teacher payroll roll-up table.
 * Shown on the admin period detail page.
 */
import Link from "next/link";
import {
  formatPayrollMoney,
  type PayrollTeacherRow,
} from "@/lib/panel/teacher-payroll-display";
import { PayrollStatusBadge } from "@/components/panel/finance/payroll-status-badge";

export function PayrollTeacherTable({
  rows,
  periodId,
}: {
  rows: PayrollTeacherRow[];
  periodId: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Bu dönem için hakediş verisi yok. Önce &quot;Üret&quot; butonuna basın.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">Öğretmen</th>
            <th className="px-3 py-2">Ders</th>
            <th className="px-3 py-2">Saat</th>
            <th className="px-3 py-2">Tahmini</th>
            <th className="px-3 py-2">Onaylı</th>
            <th className="px-3 py-2">Ödenen</th>
            <th className="px-3 py-2">Eksik</th>
            <th className="px-3 py-2">Durum</th>
            <th className="px-3 py-2">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => {
            const hours = (row.totalMinutes / 60).toLocaleString("tr-TR", {
              maximumFractionDigits: 1,
            });
            const issueCount = row.rateMissingCount + row.attendanceMissingCount;
            return (
              <tr key={row.teacherId}>
                <td className="px-3 py-2 font-medium text-slate-900">
                  {row.teacherName}
                </td>
                <td className="px-3 py-2 text-slate-600">{row.lessonCount}</td>
                <td className="px-3 py-2 text-slate-600">{hours} sa</td>
                <td className="px-3 py-2 font-semibold text-slate-900">
                  {formatPayrollMoney(row.estimatedKurus)}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {formatPayrollMoney(row.approvedKurus)}
                </td>
                <td className="px-3 py-2 text-emerald-700">
                  {formatPayrollMoney(row.paidKurus)}
                </td>
                <td className="px-3 py-2">
                  {issueCount > 0 ? (
                    <span className="text-amber-700">
                      {row.rateMissingCount > 0 ? `Ücret: ${row.rateMissingCount}` : ""}
                      {row.rateMissingCount > 0 && row.attendanceMissingCount > 0 ? " • " : ""}
                      {row.attendanceMissingCount > 0
                        ? `Yoklama: ${row.attendanceMissingCount}`
                        : ""}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <PayrollStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/panel/admin/ogretmen-hakedisleri/${periodId}?teacherId=${row.teacherId}`}
                    className="text-xs font-medium text-sky-700 hover:underline"
                  >
                    Detay →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
