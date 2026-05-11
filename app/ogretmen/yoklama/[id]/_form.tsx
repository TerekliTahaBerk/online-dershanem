"use client";
import { useState, useTransition } from "react";
import { saveAttendanceAction } from "../actions";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: "PRESENT", label: "Geldi", color: "#10b981" },
  { value: "ABSENT", label: "Gelmedi", color: "#ef4444" },
  { value: "LATE", label: "Geç", color: "#f59e0b" },
  { value: "EXCUSED", label: "Mazeretli", color: "#6366f1" },
];

export function AttendanceForm({
  classroomId,
  students,
}: {
  classroomId: string;
  students: { id: string; fullName: string }[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<Record<string, { status: Status; notes: string }>>(
    () => Object.fromEntries(students.map((s) => [s.id, { status: "PRESENT" as Status, notes: "" }])),
  );
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function setStatus(id: string, status: Status) {
    setRows((r) => ({ ...r, [id]: { ...r[id], status } }));
  }
  function setNote(id: string, notes: string) {
    setRows((r) => ({ ...r, [id]: { ...r[id], notes } }));
  }
  function setAll(status: Status) {
    setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, status }])));
  }

  function handleSave() {
    setMsg(null);
    startTransition(async () => {
      try {
        const res = await saveAttendanceAction({
          classroomId,
          sessionDate: new Date(date + "T08:00:00").toISOString(),
          rows: students.map((s) => ({
            studentId: s.id,
            status: rows[s.id].status,
            notes: rows[s.id].notes || null,
          })),
        });
        setMsg(`✓ ${res.created} kayıt eklendi · ${res.notified} bildirim gönderildi`);
      } catch (e: any) {
        setMsg(`Hata: ${e.message}`);
      }
    });
  }

  return (
    <div className="pd-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <label className="pd-field" style={{ margin: 0 }}>
          <span>Tarih</span>
          <input type="date" className="pd-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--pd-muted-2)" }}>Hepsini işaretle:</span>
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setAll(o.value)}
              className="pd-btn-ghost"
              style={{ fontSize: 12, padding: "4px 8px" }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--pd-bg-2)" }}>
            <th style={{ padding: 8, textAlign: "left" }}>Öğrenci</th>
            <th style={{ padding: 8, textAlign: "left" }}>Durum</th>
            <th style={{ padding: 8, textAlign: "left" }}>Not</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid var(--pd-line)" }}>
              <td style={{ padding: 8 }}>{s.fullName}</td>
              <td style={{ padding: 8 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {STATUS_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setStatus(s.id, o.value)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        border: "1px solid var(--pd-line)",
                        borderRadius: 4,
                        background: rows[s.id]?.status === o.value ? o.color : "transparent",
                        color: rows[s.id]?.status === o.value ? "#fff" : "var(--pd-ink)",
                        cursor: "pointer",
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </td>
              <td style={{ padding: 8 }}>
                <input
                  type="text"
                  className="pd-input"
                  style={{ width: "100%", fontSize: 12 }}
                  value={rows[s.id]?.notes ?? ""}
                  onChange={(e) => setNote(s.id, e.target.value)}
                  placeholder="Opsiyonel not"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <button type="button" onClick={handleSave} disabled={pending} className="pd-btn-accent">
          {pending ? "Kaydediliyor…" : "Yoklamayı Kaydet"}
        </button>
        {msg && <span style={{ fontSize: 13, color: "var(--pd-ink-3)" }}>{msg}</span>}
      </div>
    </div>
  );
}
