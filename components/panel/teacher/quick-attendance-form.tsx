"use client";
import { useState } from "react";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATUS_LABEL: Record<Status, string> = {
  PRESENT: "Mevcut",
  ABSENT: "Yok",
  LATE: "Geç",
  EXCUSED: "İzinli",
};

export type AttendanceStudentRow = {
  studentId: string;
  fullName: string;
  classLevel: string | null;
  initial: Status;
  risk?: { score: number; level: "low" | "medium" | "high" } | null;
};

/**
 * Round 4 — Tek-tap toplu yoklama formu.
 * Native select yerine pill button group; "Tümünü mevcut/yok" preset bar;
 * risk badge'i yüksek riskli öğrencileri öne çıkarır.
 *
 * Form action prop'u server action ile gelir.
 */
export function QuickAttendanceForm({
  rows,
  classroomId,
  sessionDate,
  action,
}: {
  rows: AttendanceStudentRow[];
  classroomId: string;
  sessionDate: string;
  // Server action — bound on parent; not worth typing through generics here.
  action: any;
}) {
  const [statuses, setStatuses] = useState<Record<string, Status>>(() =>
    Object.fromEntries(rows.map((r) => [r.studentId, r.initial])),
  );

  const setAll = (s: Status) => {
    setStatuses(Object.fromEntries(rows.map((r) => [r.studentId, s])));
  };

  const stats = {
    present: Object.values(statuses).filter((s) => s === "PRESENT").length,
    absent: Object.values(statuses).filter((s) => s === "ABSENT").length,
    late: Object.values(statuses).filter((s) => s === "LATE").length,
    excused: Object.values(statuses).filter((s) => s === "EXCUSED").length,
  };

  return (
    <form action={action}>
      <input type="hidden" name="classroomId" value={classroomId} />
      <input type="hidden" name="sessionDate" value={sessionDate} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button type="button" onClick={() => setAll("PRESENT")} className="od-btn od-btn-ghost od-btn-sm">
          ✓ Tümünü mevcut
        </button>
        <button type="button" onClick={() => setAll("ABSENT")} className="od-btn od-btn-ghost od-btn-sm">
          ✗ Tümünü yok
        </button>
        <span className="od-muted" style={{ fontSize: 12, marginLeft: "auto" }}>
          Mevcut <strong>{stats.present}</strong> · Yok <strong>{stats.absent}</strong> · Geç <strong>{stats.late}</strong> · İzinli <strong>{stats.excused}</strong>
        </span>
      </div>

      <table className="od-table">
        <thead>
          <tr>
            <th>Öğrenci</th>
            <th>Sınıf</th>
            <th style={{ width: 320 }}>Durum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const cur = statuses[r.studentId] ?? r.initial;
            const riskTone =
              r.risk?.level === "high"
                ? { background: "rgba(239,68,68,0.12)", color: "#b91c1c" }
                : r.risk?.level === "medium"
                  ? { background: "rgba(245,158,11,0.12)", color: "#92400e" }
                  : null;
            return (
              <tr key={r.studentId}>
                <td>
                  {r.fullName}
                  {r.risk && r.risk.score > 0 && riskTone ? (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 999,
                        fontWeight: 700,
                        ...riskTone,
                      }}
                      title={`Risk skoru ${r.risk.score}/100`}
                    >
                      ⚠ {r.risk.score}
                    </span>
                  ) : null}
                </td>
                <td className="od-muted">{r.classLevel ?? "—"}</td>
                <td>
                  <input type="hidden" name={`status_${r.studentId}`} value={cur} />
                  <div role="group" aria-label="Durum" style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                    {(Object.keys(STATUS_LABEL) as Status[]).map((s) => {
                      const active = s === cur;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatuses((m) => ({ ...m, [r.studentId]: s }))}
                          className={`od-btn od-btn-sm ${active ? "od-btn-primary" : "od-btn-ghost"}`}
                          style={{ minWidth: 64, fontSize: 12, opacity: active ? 1 : 0.7 }}
                          aria-pressed={active}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button type="submit" className="od-btn od-btn-primary">
          Kaydet
        </button>
      </div>
    </form>
  );
}
