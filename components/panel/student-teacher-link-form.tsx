"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TeacherOption = { id: string; name: string };

export function StudentTeacherLinkForm({
  studentId,
  teachers,
}: {
  studentId: string;
  teachers: TeacherOption[];
}) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState("");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/panel/student-teachers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId, teacherId, subject }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Bağlantı kurulamadı.");
        setPending(false);
        return;
      }
      setTeacherId("");
      setSubject("");
      setPending(false);
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <select
        required
        value={teacherId}
        onChange={(e) => setTeacherId(e.target.value)}
        disabled={pending}
        className="panel-input"
      >
        <option value="">Öğretmen seçin</option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.name}
          </option>
        ))}
      </select>
      <input
        required
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        disabled={pending}
        className="panel-input"
        placeholder="Branş (ör. Matematik)"
      />
      <button disabled={pending} className="site-btn site-btn-primary site-btn-sm">
        Bağla
      </button>
      {error ? (
        <p className="sm:col-span-3 text-sm font-semibold text-[var(--brand-danger,#b42318)]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function StudentTeacherUnlinkButton({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await fetch("/api/panel/student-teachers", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: linkId }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void onClick()}
      className="text-[12.5px] font-semibold text-[var(--site-muted)] underline-offset-2 hover:underline"
    >
      Kaldır
    </button>
  );
}
