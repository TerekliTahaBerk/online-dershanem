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
      <div className="od-empty-soft">Henüz tanımlanmış kural yok.</div>
    );
  }
  return (
    <div className="premium-table" style={{ overflowX: "auto" }}>
      <table className="od-table">
        <thead>
          <tr>
            <th>Öğretmen</th>
            <th>Kapsam</th>
            <th>Saatlik</th>
            <th>Aralık</th>
            <th>Aktif</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={row.isActive ? "" : "od-finance-row-alert is-cancelled"}
            >
              <td style={{ fontWeight: 500 }}>{row.teacherName}</td>
              <td className="od-money-muted">{scopeLabel(row)}</td>
              <td className="od-money-positive">
                {formatPayrollMoney(row.hourlyRateKurus)} / saat
              </td>
              <td className="od-money-muted" style={{ fontSize: 11.5 }}>
                {row.startsAt
                  ? new Date(row.startsAt).toLocaleDateString("tr-TR")
                  : "—"}
                {" → "}
                {row.endsAt
                  ? new Date(row.endsAt).toLocaleDateString("tr-TR")
                  : "—"}
              </td>
              <td>
                <span className={`soft-pill ${row.isActive ? "is-mint" : ""}`.trim()}>
                  {row.isActive ? "Aktif" : "Pasif"}
                </span>
              </td>
              <td>
                <div className="od-finance-inline-actions">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(() => toggleCompensationRuleActiveAction(row.id))
                    }
                    className="od-btn ghost sm"
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
                    className="od-btn ghost sm"
                    style={{ color: "var(--pd-pastel-blush-ink, #B25758)" }}
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
