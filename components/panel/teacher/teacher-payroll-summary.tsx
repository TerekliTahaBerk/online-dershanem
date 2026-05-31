/**
 * Phase 2 / Session 11 — Teacher-facing read-only payroll summary.
 */
import {
  formatPayrollMoney,
  type TeacherPayrollReadOnlySummary,
} from "@/lib/panel/teacher-payroll-display";
import { PayrollStatusBadge } from "@/components/panel/finance/payroll-status-badge";

export function TeacherPayrollSummary({
  data,
}: {
  data: TeacherPayrollReadOnlySummary;
}) {
  if (!data.hasData || !data.currentPeriod) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Henüz oluşturulmuş bir hakediş kaydınız yok. Yönetim bordro üretimini
        çalıştırdığında dersleriniz burada listelenir.
      </div>
    );
  }
  const p = data.currentPeriod;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
        <PayrollStatusBadge status={p.status} />
        <span className="font-medium">{p.title}</span>
        <span className="text-xs text-slate-400">
          {new Date(p.startsAt).toLocaleDateString("tr-TR")} —{" "}
          {new Date(p.endsAt).toLocaleDateString("tr-TR")}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Tahmini
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {formatPayrollMoney(p.estimatedKurus)}
          </div>
          <div className="text-xs text-slate-500">{p.lessonCount} ders</div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Onaylı
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {formatPayrollMoney(p.approvedKurus)}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Ödenen
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {formatPayrollMoney(p.paidKurus)}
          </div>
        </div>
      </div>

      {p.rateMissingCount + p.attendanceMissingCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          ⚠ {p.rateMissingCount > 0 ? `${p.rateMissingCount} ders için saatlik ücret tanımlı değil.` : ""}
          {p.rateMissingCount > 0 && p.attendanceMissingCount > 0 ? " " : ""}
          {p.attendanceMissingCount > 0
            ? `${p.attendanceMissingCount} ders için yoklama eksik — yönetim incelemesi gerekiyor.`
            : ""}
        </div>
      ) : null}

      {data.recentItems.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Ders</th>
                <th className="px-3 py-2">Dakika</th>
                <th className="px-3 py-2">Tutar</th>
                <th className="px-3 py-2">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.recentItems.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-slate-600">
                    {it.scheduledAt
                      ? new Date(it.scheduledAt).toLocaleDateString("tr-TR")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {it.lessonTitle ?? it.courseTitle ?? "Manuel satır"}
                    {it.studentName ? (
                      <span className="text-xs text-slate-500">
                        {" "}• {it.studentName}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{it.minutes}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {formatPayrollMoney(it.finalAmountKurus)}
                  </td>
                  <td className="px-3 py-2">
                    <PayrollStatusBadge status={it.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
