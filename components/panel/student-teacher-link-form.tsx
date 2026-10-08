"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PersonOption = { id: string; name: string };

export function StudentTeacherLinkForm({
  studentId,
  teacherId,
  teachers,
  students,
}: {
  studentId?: string;
  teacherId?: string;
  teachers?: PersonOption[];
  students?: PersonOption[];
}) {
  const router = useRouter();
  const [selectedTeacherId, setSelectedTeacherId] = useState(teacherId ?? "");
  const [selectedStudentId, setSelectedStudentId] = useState(studentId ?? "");
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
        body: JSON.stringify({
          studentId: studentId || selectedStudentId,
          teacherId: teacherId || selectedTeacherId,
          subject,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Bağlantı kurulamadı.");
        setPending(false);
        return;
      }
      if (!teacherId) setSelectedTeacherId("");
      if (!studentId) setSelectedStudentId("");
      setSubject("");
      setPending(false);
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı.");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
    >
      {!studentId ? (
        <select
          required
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          disabled={pending}
          aria-label="Bağlanacak öğrenci"
          className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">Öğrenci seçin</option>
          {(students || []).map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      ) : null}
      {!teacherId ? (
        <select
          required
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          disabled={pending}
          aria-label="Bağlanacak öğretmen"
          className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">Öğretmen seçin</option>
          {(teachers || []).map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
      ) : null}
      <input
        required
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        disabled={pending}
        aria-label="Branş"
        className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        placeholder="Branş (ör. Matematik)"
      />
      <button
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-8 px-2.5 text-[13px]"
      >
        Bağla
      </button>
      {error ? (
        <p
          className="sm:col-span-3 text-sm font-semibold text-(--brand-danger,#b42318)"
          role="alert"
        >
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
      className="text-[12.5px] font-semibold text-(--site-muted) underline-offset-2 hover:underline"
    >
      Kaldır
    </button>
  );
}
