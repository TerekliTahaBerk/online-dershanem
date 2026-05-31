"use client";

/**
 * Phase 3 / Session 4 — D4: Teacher classroom assignment manager.
 *
 * Inline edit/remove for ClassroomTeacher rows (subject + isLead),
 * plus an "add classroom" combobox for the unlinked classrooms.
 */

import { useState, useTransition } from "react";
import {
  assignClassroomToTeacherAction,
  updateClassroomAssignmentAction,
  removeClassroomFromTeacherAction,
} from "@/app/panel/admin/ogretmenler/_actions";
import { useToast } from "@/components/ui/toast";

type Linked = {
  classroomId: string;
  classroomName: string;
  classroomBranch: string | null;
  classroomLevel: string | null;
  subject: string | null;
  isLead: boolean;
};
type Available = { id: string; name: string; branch: string | null };

type Props = {
  teacherId: string;
  linked: Linked[];
  available: Available[];
};

export function TeacherClassroomManager({ teacherId, linked, available }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [addCid, setAddCid] = useState(available[0]?.id ?? "");
  const [addSubject, setAddSubject] = useState("");
  const [addIsLead, setAddIsLead] = useState(false);

  const [editing, setEditing] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editIsLead, setEditIsLead] = useState(false);

  const run = (label: string, fn: () => Promise<unknown>) => {
    startTransition(async () => {
      try {
        await fn();
        toast.success(label);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Hata");
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {linked.length === 0 ? (
        <div className="od-empty-soft" style={{ padding: 12, fontSize: 13 }}>
          Henüz sınıf atanmamış.
        </div>
      ) : (
        <table className="od-table">
          <thead>
            <tr>
              <th>Sınıf</th>
              <th>Şube</th>
              <th>Seviye</th>
              <th>Ders / branş</th>
              <th>Lider</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {linked.map((row) => {
              const isEditing = editing === row.classroomId;
              return (
                <tr key={row.classroomId}>
                  <td style={{ fontWeight: 500 }}>{row.classroomName}</td>
                  <td className="od-muted">{row.classroomBranch ?? "—"}</td>
                  <td className="od-muted">{row.classroomLevel ?? "—"}</td>
                  <td>
                    {isEditing ? (
                      <input
                        className="od-input"
                        style={{ fontSize: 13, padding: "4px 8px" }}
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        placeholder="Matematik"
                      />
                    ) : (
                      <span className="od-muted">{row.subject ?? "—"}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={editIsLead}
                        onChange={(e) => setEditIsLead(e.target.checked)}
                      />
                    ) : (
                      row.isLead ? "✓" : "—"
                    )}
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="od-btn dark sm"
                          disabled={pending}
                          onClick={() => {
                            const fd = new FormData();
                            if (editSubject) fd.append("subject", editSubject);
                            if (editIsLead) fd.append("isLead", "on");
                            run("Atama güncellendi", () =>
                              updateClassroomAssignmentAction(teacherId, row.classroomId, fd),
                            );
                            setEditing(null);
                          }}
                        >
                          Kaydet
                        </button>
                        <button type="button" className="od-btn ghost sm" onClick={() => setEditing(null)}>
                          İptal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="od-btn ghost sm"
                          onClick={() => {
                            setEditing(row.classroomId);
                            setEditSubject(row.subject ?? "");
                            setEditIsLead(row.isLead);
                          }}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className="od-btn ghost sm"
                          style={{ color: "var(--pd-bad)" }}
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`${row.classroomName} sınıfından kaldırılsın mı?`)) return;
                            run("Sınıf kaldırıldı", () =>
                              removeClassroomFromTeacherAction(teacherId, row.classroomId),
                            );
                          }}
                        >
                          Kaldır
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {available.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 10,
            border: "1px solid var(--pd-line)",
            borderRadius: 10,
            gridTemplateColumns: "1fr 1fr auto auto",
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Sınıf ekle</label>
            <select
              className="od-select"
              value={addCid}
              onChange={(e) => setAddCid(e.target.value)}
              style={{ width: "100%", padding: "6px 8px" }}
            >
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.branch ? ` · ${c.branch}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Ders / branş</label>
            <input
              className="od-input"
              value={addSubject}
              onChange={(e) => setAddSubject(e.target.value)}
              placeholder="Matematik"
              style={{ width: "100%", padding: "6px 8px" }}
            />
          </div>
          <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={addIsLead} onChange={(e) => setAddIsLead(e.target.checked)} />
            Lider
          </label>
          <button
            type="button"
            className="od-btn dark sm"
            disabled={pending || !addCid}
            onClick={() => {
              const fd = new FormData();
              fd.append("classroomId", addCid);
              if (addSubject) fd.append("subject", addSubject);
              if (addIsLead) fd.append("isLead", "on");
              run("Sınıf atandı", () => assignClassroomToTeacherAction(teacherId, fd));
              setAddSubject("");
              setAddIsLead(false);
            }}
          >
            Ata
          </button>
        </div>
      ) : null}
    </div>
  );
}
