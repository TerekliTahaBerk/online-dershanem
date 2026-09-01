"use client";

import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";

type Preview = {
  kind: string;
  disclaimer: string;
  createsAttempt: false;
  studentExam?: {
    durationMinutes: number;
    questionCount: number;
    sections: Array<{ code: string; title: string; questionCount: number }>;
    securityNotes: string[];
    startBlockedReason: string;
  };
  teacherReport?: { visibleFields: string[]; hiddenFields: string[]; sampleNote: string };
  parentReport?: { visibleFields: string[]; hiddenFields: string[]; sampleNote: string };
};

const kinds = [
  { id: "STUDENT_EXAM", label: "Öğrenci sınav deneyimi" },
  { id: "TEACHER_REPORT", label: "Öğretmen raporu" },
  { id: "PARENT_REPORT", label: "Veli raporu" },
] as const;

export function AdminPreviewPanel({ examId }: { examId: string }) {
  const [kind, setKind] = useState<(typeof kinds)[number]["id"]>("STUDENT_EXAM");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(nextKind = kind) {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/odk/admin/exams/${examId}/preview?kind=${nextKind}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Önizleme alınamadı.");
        return;
      }
      setPreview(result.preview);
    } catch {
      setError("Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="adim-9" className="panel-surface scroll-mt-36 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="panel-metric-icon panel-tone-sky"><Eye size={17} /></span>
        <div>
          <h2 className="text-sm font-extrabold">9. Önizleme</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Gerçek attempt oluşturmaz. Öğrenci önizlemesiyle yanlışlıkla sınava başlanamaz.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {kinds.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-xl px-3 py-2 text-xs font-extrabold ${kind === item.id ? "bg-[var(--brand-olive)] text-white" : "bg-[var(--site-bg-warm)]"}`}
            onClick={() => { setKind(item.id); void load(item.id); }}
          >
            {item.label}
          </button>
        ))}
        <button type="button" disabled={busy} className="panel-secondary-button" onClick={() => void load()}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Önizlemeyi aç
        </button>
      </div>
      {error ? <p role="alert" className="mt-3 rounded-xl bg-[var(--pd-pastel-blush-soft)] p-3 text-xs font-bold text-[var(--pd-pastel-blush-ink)]">{error}</p> : null}
      {preview ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4">
          <p className="text-xs font-bold text-[var(--brand-olive)]">{preview.disclaimer}</p>
          {preview.studentExam ? (
            <div className="mt-3 space-y-2 text-xs">
              <p><strong>{preview.studentExam.questionCount}</strong> soru · {preview.studentExam.durationMinutes} dk</p>
              <p>{preview.studentExam.sections.map((section) => `${section.title} (${section.questionCount})`).join(" · ")}</p>
              <ul className="space-y-1">{preview.studentExam.securityNotes.map((note) => <li key={note}>• {note}</li>)}</ul>
              <p className="font-extrabold text-[var(--pd-pastel-blush-ink)]">{preview.studentExam.startBlockedReason}</p>
            </div>
          ) : null}
          {preview.teacherReport ? (
            <div className="mt-3 space-y-2 text-xs">
              <p><strong>Görünür:</strong> {preview.teacherReport.visibleFields.join(", ")}</p>
              <p><strong>Gizli:</strong> {preview.teacherReport.hiddenFields.join(", ")}</p>
              <p>{preview.teacherReport.sampleNote}</p>
            </div>
          ) : null}
          {preview.parentReport ? (
            <div className="mt-3 space-y-2 text-xs">
              <p><strong>Görünür:</strong> {preview.parentReport.visibleFields.join(", ")}</p>
              <p><strong>Gizli:</strong> {preview.parentReport.hiddenFields.join(", ")}</p>
              <p>{preview.parentReport.sampleNote}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
