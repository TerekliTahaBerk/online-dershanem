/**
 * Phase 2 / Session 11 — Teacher-facing read-only payroll summary.
 * Stage 3H: migrated to v2 `mini-kpi-card` + `premium-table` + soft warning.
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
      <div className="od-empty-soft">
        Henüz oluşturulmuş bir hakediş kaydınız yok. Yönetim bordro üretimini
        çalıştırdığında dersleriniz burada listelenir.
      </div>
    );
  }
  const p = data.currentPeriod;
  const issueCount = p.rateMissingCount + p.attendanceMissingCount;
  return (
    <div className="space-y-4">
      <div className="od-payroll-status-row">
        <PayrollStatusBadge status={p.status} />
        <strong>{p.title}</strong>
        <span className="od-money-muted">
          {new Date(p.startsAt).toLocaleDateString("tr-TR")} —{" "}
          {new Date(p.endsAt).toLocaleDateString("tr-TR")}
        </span>
      </div>
      <div className="od-finance-kpi-grid">
        <div className="mini-kpi-card">
          <div className="k-label">Tahmini</div>
          <div className="k-value">{formatPayrollMoney(p.estimatedKurus)}</div>
          <div className="k-meta">{p.lessonCount} ders</div>
        </div>
        <div className="mini-kpi-card">
          <div className="k-label">Onaylı</div>
          <div className="k-value">{formatPayrollMoney(p.approvedKurus)}</div>
        </div>
        <div className="mini-kpi-card">
          <div className="k-label">Ödenen</div>
          <div className="k-value od-money-positive">
            {formatPayrollMoney(p.paidKurus)}
          </div>
        </div>
      </div>

      {issueCount > 0 ? (
        <div className="od-finance-warning">
          ⚠{" "}
          {p.rateMissingCount > 0
            ? `${p.rateMissingCount} ders için saatlik ücret tanımlı değil.`
            : ""}
          {p.rateMissingCount > 0 && p.attendanceMissingCount > 0 ? " " : ""}
          {p.attendanceMissingCount > 0
            ? `${p.attendanceMissingCount} ders için yoklama eksik — yönetim incelemesi gerekiyor.`
            : ""}
        </div>
      ) : null}

      {data.recentItems.length > 0 ? (
        <div className="premium-table" style={{ overflowX: "auto" }}>
          <table className="od-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Ders</th>
                <th>Dakika</th>
                <th>Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {data.recentItems.map((it) => (
                <tr key={it.id}>
                  <td className="od-money-muted">
                    {it.scheduledAt
                      ? new Date(it.scheduledAt).toLocaleDateString("tr-TR")
                      : "—"}
                  </td>
                  <td>
                    {it.lessonTitle ?? it.courseTitle ?? "Manuel satır"}
                    {it.studentName ? (
                      <span className="od-money-muted" style={{ fontSize: 11.5 }}>
                        {" "}• {it.studentName}
                      </span>
                    ) : null}
                  </td>
                  <td className="od-money-muted">{it.minutes}</td>
                  <td className="od-money-positive">
                    {formatPayrollMoney(it.finalAmountKurus)}
                  </td>
                  <td>
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
