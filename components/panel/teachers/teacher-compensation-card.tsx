"use client";

/**
 * Phase 3 / Session 4 — D4/D8: Teacher compensation rules card.
 *
 * Lists existing rules + inline create form. Calls
 * `createTeacherCompensationRuleAction` and
 * `deactivateTeacherCompensationRuleAction`. The richer rule editor
 * (start/end dates, etc.) lives at /panel/admin/ogretmen-hakedisleri/kurallar.
 */

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/panel/ui/badge";
import {
  createTeacherCompensationRuleAction,
  deactivateTeacherCompensationRuleAction,
} from "@/app/panel/admin/ogretmenler/_actions";
import { useToast } from "@/components/ui/toast";

type Rule = {
  id: string;
  hourlyRate: number;
  isActive: boolean;
  courseId: string | null;
  courseTitle: string | null;
  classroomId: string | null;
  classroomName: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  note: string | null;
};
type CourseOpt = { id: string; title: string };
type ClassroomOpt = { id: string; name: string; branch: string | null };

type Props = {
  teacherId: string;
  rules: Rule[];
  courses: CourseOpt[];
  classrooms: ClassroomOpt[];
};

function fmtMoney(kurus: number): string {
  return `₺${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR");
}

export function TeacherCompensationCard({ teacherId, rules, courses, classrooms }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [hourlyRate, setHourlyRate] = useState("");
  const [courseId, setCourseId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [note, setNote] = useState("");

  const activeRules = rules.filter((r) => r.isActive);
  const hasActive = activeRules.length > 0;

  const submit = () => {
    if (!hourlyRate.trim()) {
      toast.error("Saatlik ücret zorunlu");
      return;
    }
    const fd = new FormData();
    fd.append("hourlyRate", hourlyRate);
    if (courseId) fd.append("courseId", courseId);
    if (classroomId) fd.append("classroomId", classroomId);
    if (startsAt) fd.append("startsAt", startsAt);
    if (endsAt) fd.append("endsAt", endsAt);
    if (note) fd.append("note", note);
    startTransition(async () => {
      try {
        await createTeacherCompensationRuleAction(teacherId, fd);
        toast.success("Hakediş kuralı oluşturuldu");
        setHourlyRate("");
        setCourseId("");
        setClassroomId("");
        setStartsAt("");
        setEndsAt("");
        setNote("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Hata");
      }
    });
  };

  const deactivate = (ruleId: string) => {
    if (!confirm("Kural devre dışı bırakılsın mı? (Geçmiş bordrolar etkilenmez.)")) return;
    startTransition(async () => {
      try {
        await deactivateTeacherCompensationRuleAction(teacherId, ruleId);
        toast.success("Kural devre dışı");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Hata");
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!hasActive ? (
        <div className="od-soft-alert">
          <b>Aktif hakediş kuralı yok.</b> Bordro hesaplarken saatlik ücret alınamayacak — en az bir varsayılan kural tanımlayın.
        </div>
      ) : null}

      {rules.length > 0 ? (
        <table className="od-table">
          <thead>
            <tr>
              <th>Saatlik</th>
              <th>Kapsam</th>
              <th>Başlangıç / Bitiş</th>
              <th>Durum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{fmtMoney(r.hourlyRate)}</td>
                <td className="od-muted" style={{ fontSize: 13 }}>
                  {r.courseTitle ? `Ders: ${r.courseTitle}` : null}
                  {r.courseTitle && r.classroomName ? " · " : null}
                  {r.classroomName ? `Sınıf: ${r.classroomName}` : null}
                  {!r.courseTitle && !r.classroomName ? "Varsayılan (tüm dersler)" : null}
                </td>
                <td className="od-muted" style={{ fontSize: 13 }}>
                  {fmtDate(r.startsAt)} → {fmtDate(r.endsAt)}
                </td>
                <td>
                  <Badge tone={r.isActive ? "ok" : "neutral"}>{r.isActive ? "Aktif" : "Pasif"}</Badge>
                </td>
                <td>
                  {r.isActive ? (
                    <button
                      type="button"
                      className="od-btn ghost sm"
                      style={{ color: "var(--pd-bad)" }}
                      disabled={pending}
                      onClick={() => deactivate(r.id)}
                    >
                      Devre dışı
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {/* Inline create */}
      <div className="od-form-card">
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Yeni hakediş kuralı</h4>
        <div className="od-form-grid">
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Saatlik ücret (₺) *</label>
            <input className="od-input" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="750" inputMode="decimal" style={{ width: "100%", padding: "6px 8px" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Başlangıç</label>
            <input className="od-input" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={{ width: "100%", padding: "6px 8px" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Bitiş</label>
            <input className="od-input" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={{ width: "100%", padding: "6px 8px" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Yalnızca bu ders için</label>
            <select className="od-select" value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ width: "100%", padding: "6px 8px" }}>
              <option value="">Tümü</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Yalnızca bu sınıf için</label>
            <select className="od-select" value={classroomId} onChange={(e) => setClassroomId(e.target.value)} style={{ width: "100%", padding: "6px 8px" }}>
              <option value="">Tümü</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.branch ? ` · ${c.branch}` : ""}</option>
              ))}
            </select>
          </div>
          <div className="full">
            <label style={{ fontSize: 12, fontWeight: 600 }}>Not</label>
            <input className="od-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Yeni dönem zammı" style={{ width: "100%", padding: "6px 8px" }} />
          </div>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="od-btn dark sm" disabled={pending || !hourlyRate} onClick={submit}>
            {pending ? "Oluşturuluyor…" : "Kural oluştur"}
          </button>
          <Link href="/panel/admin/ogretmen-hakedisleri/kurallar" className="od-link" style={{ fontSize: 12 }}>
            Tüm kuralları yönet →
          </Link>
        </div>
      </div>
    </div>
  );
}
