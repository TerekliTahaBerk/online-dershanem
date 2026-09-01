"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export type InterventionCreateStudentOption = {
  id: string;
  name: string;
};

const REASON_OPTIONS = [
  { value: "TEACHER_OBSERVED", label: "Gözlem / diğer" },
  { value: "ATTENDANCE_PATTERN", label: "Katılım" },
  { value: "OVERDUE_WORK", label: "Gecikmiş çalışma" },
  { value: "REPEATED_REVIEW_DIFFICULTY", label: "Tekrar güçlüğü" },
  { value: "PLAN_STALLED", label: "Plan geride" },
] as const;

function defaultFollowUpDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function InterventionCreateForm({
  students,
  initialStudentId = "",
  compact = false,
}: {
  students: InterventionCreateStudentOption[];
  initialStudentId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(initialStudentId));
  const [studentId, setStudentId] = useState(initialStudentId || students[0]?.id || "");
  const [reasonCode, setReasonCode] = useState<(typeof REASON_OPTIONS)[number]["value"]>("TEACHER_OBSERVED");
  const [explanation, setExplanation] = useState("");
  const [suggestedAction, setSuggestedAction] = useState("");
  const [followUpDate, setFollowUpDate] = useState(defaultFollowUpDate);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(
    () => Boolean(studentId && explanation.trim().length >= 8 && suggestedAction.trim().length >= 4 && followUpDate),
    [studentId, explanation, suggestedAction, followUpDate],
  );

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/panel/interventions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId,
        reasonCode,
        explanation: explanation.trim(),
        suggestedAction: suggestedAction.trim(),
        followUpDate,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || "Müdahale oluşturulamadı.");
      setBusy(false);
      return;
    }
    setMessage("Müdahale kaydı oluşturuldu.");
    setExplanation("");
    setSuggestedAction("");
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  if (!students.length) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--site-line)] px-4 py-3 text-sm text-[var(--site-muted)]">
        Müdahale oluşturmak için kapsamınızda aktif öğrenci olmalı.
      </p>
    );
  }

  return (
    <div className={compact ? "" : "panel-surface p-5 sm:p-6"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.06em] text-[var(--brand-olive)]">
            Elle kayıt
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-[var(--site-ink)]">Müdahale oluştur</h2>
          <p className="mt-1 text-sm text-[var(--site-muted)]">
            Sorun tipi, kısa açıklama, aksiyon ve takip tarihi — tanı koymaz.
          </p>
        </div>
        <button
          type="button"
          className="panel-quick-action panel-quick-action-primary"
          onClick={() => setOpen((current) => !current)}
        >
          <Plus size={14} /> {open ? "Kapat" : "Yeni müdahale"}
        </button>
      </div>

      {open ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="panel-field text-xs font-bold">
            Öğrenci
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--site-line)] bg-white px-3 py-2 text-sm"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
          <label className="panel-field text-xs font-bold">
            Sorun tipi
            <select
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value as typeof reasonCode)}
              className="mt-2 w-full rounded-xl border border-[var(--site-line)] bg-white px-3 py-2 text-sm"
            >
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="panel-field text-xs font-bold sm:col-span-2">
            Kısa açıklama
            <textarea
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ne gördünüz? (öğrenci/veli görmez)"
              className="mt-2 w-full rounded-2xl border border-[var(--site-line)] bg-white p-3 text-sm"
            />
          </label>
          <label className="panel-field text-xs font-bold">
            Aksiyon
            <input
              value={suggestedAction}
              onChange={(event) => setSuggestedAction(event.target.value)}
              maxLength={300}
              placeholder="Örn. Kısa görüşme planla"
              className="mt-2 w-full rounded-xl border border-[var(--site-line)] bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="panel-field text-xs font-bold">
            Takip tarihi
            <input
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--site-line)] bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={() => void submit()}
              className="panel-quick-action panel-quick-action-primary"
            >
              Kaydı oluştur
            </button>
            {message ? (
              <p role="status" className="text-sm font-bold text-[var(--brand-olive)]">
                {message}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
