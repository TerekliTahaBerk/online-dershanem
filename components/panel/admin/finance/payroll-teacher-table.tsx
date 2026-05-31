/**
 * Phase 2 / Session 11 — Per-teacher payroll roll-up table.
 * Shown on the admin period detail page.
 * Stage 3H: migrated to v2 `premium-table` + `od-table`.
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
      <div className="od-empty-soft">
        Bu dönem için hakediş verisi yok. Önce &quot;Üret&quot; butonuna basın.
      </div>
    );
  }
  return (
    <div className="premium-table" style={{ overflowX: "auto" }}>
      <table className="od-table">
        <thead>
          <tr>
            <th>Öğretmen</th>
            <th>Ders</th>
            <th>Saat</th>
            <th>Tahmini</th>
            <th>Onaylı</th>
            <th>Ödenen</th>
            <th>Eksik</th>
            <th>Durum</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hours = (row.totalMinutes / 60).toLocaleString("tr-TR", {
              maximumFractionDigits: 1,
            });
            const issueCount = row.rateMissingCount + row.attendanceMissingCount;
            return (
              <tr key={row.teacherId}>
                <td style={{ fontWeight: 500 }}>{row.teacherName}</td>
                <td className="od-money-muted">{row.lessonCount}</td>
                <td className="od-money-muted">{hours} sa</td>
                <td className="od-money-positive">
                  {formatPayrollMoney(row.estimatedKurus)}
                </td>
                <td>{formatPayrollMoney(row.approvedKurus)}</td>
                <td className="od-money-positive">
                  {formatPayrollMoney(row.paidKurus)}
                </td>
                <td>
                  {issueCount > 0 ? (
                    <span className="od-finance-flag-chip">
                      {row.rateMissingCount > 0 ? `Ücret: ${row.rateMissingCount}` : ""}
                      {row.rateMissingCount > 0 && row.attendanceMissingCount > 0 ? " · " : ""}
                      {row.attendanceMissingCount > 0
                        ? `Yoklama: ${row.attendanceMissingCount}`
                        : ""}
                    </span>
                  ) : (
                    <span className="od-money-muted">—</span>
                  )}
                </td>
                <td>
                  <PayrollStatusBadge status={row.status} />
                </td>
                <td>
                  <Link
                    href={`/panel/admin/ogretmen-hakedisleri/${periodId}?teacherId=${row.teacherId}`}
                    className="od-btn ghost sm"
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
