"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAssignmentAction } from "../actions";

export function AssignmentCreateForm({
  classrooms,
  students,
}: {
  classrooms: { id: string; name: string }[];
  students: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [target, setTarget] = useState<"classroom" | "student">("classroom");

  function handleSubmit(formData: FormData) {
    setErr(null);
    startTransition(async () => {
      try {
        const res = await createAssignmentAction({
          title: String(formData.get("title") ?? ""),
          description: (formData.get("description") as string) || null,
          subject: (formData.get("subject") as string) || null,
          dueAt: (formData.get("dueAt") as string) || null,
          maxScore: formData.get("maxScore") ? Number(formData.get("maxScore")) : null,
          attachmentUrl: (formData.get("attachmentUrl") as string) || null,
          classroomId: target === "classroom" ? (formData.get("classroomId") as string) : null,
          studentId: target === "student" ? (formData.get("studentId") as string) : null,
        });
        router.push(`/ogretmen/odevler/${res.id}`);
      } catch (e: any) {
        setErr(e.message ?? "Hata");
      }
    });
  }

  return (
    <form action={handleSubmit} className="pd-card" style={{ padding: 20, maxWidth: 720 }}>
      <label className="pd-field">
        <span>Başlık *</span>
        <input name="title" className="pd-input" required maxLength={200} />
      </label>
      <label className="pd-field">
        <span>Açıklama</span>
        <textarea name="description" className="pd-input" rows={4} maxLength={2000} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <label className="pd-field">
          <span>Konu</span>
          <input name="subject" className="pd-input" maxLength={100} />
        </label>
        <label className="pd-field">
          <span>Son Tarih</span>
          <input name="dueAt" type="datetime-local" className="pd-input" />
        </label>
        <label className="pd-field">
          <span>Maksimum Puan</span>
          <input name="maxScore" type="number" min={1} max={1000} className="pd-input" defaultValue={100} />
        </label>
      </div>
      <label className="pd-field">
        <span>Ek Dosya URL (opsiyonel)</span>
        <input name="attachmentUrl" type="url" className="pd-input" />
      </label>

      <fieldset style={{ border: "1px solid var(--pd-line)", borderRadius: 6, padding: 12, marginTop: 12 }}>
        <legend style={{ fontSize: 12, padding: "0 6px" }}>Hedef</legend>
        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="radio"
              checked={target === "classroom"}
              onChange={() => setTarget("classroom")}
            />
            Sınıf
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="radio"
              checked={target === "student"}
              onChange={() => setTarget("student")}
            />
            Tek öğrenci
          </label>
        </div>
        {target === "classroom" ? (
          <select name="classroomId" className="pd-input" required>
            <option value="">— Sınıf seç —</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <select name="studentId" className="pd-input" required>
            <option value="">— Öğrenci seç —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        )}
      </fieldset>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={pending} className="pd-btn-accent">
          {pending ? "Kaydediliyor…" : "Ödevi Oluştur"}
        </button>
        {err && <span style={{ fontSize: 13, color: "#ef4444" }}>{err}</span>}
      </div>
    </form>
  );
}
