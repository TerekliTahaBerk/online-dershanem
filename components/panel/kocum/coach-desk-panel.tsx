"use client";

import { useState } from "react";
import { CopyPlus, FilePlus2, NotebookPen, ScrollText } from "lucide-react";

type TemplateOption = { id: string; title: string };

type Props = {
  studentId: string;
  studentName: string;
  planId: string | null;
  planVersion: number;
  weekStartIso: string;
  templates: TemplateOption[];
  planCompletionPct?: number | null;
};

const taskKinds = [
  { value: "QUESTION_PRACTICE", label: "Soru çözümü" },
  { value: "TOPIC_STUDY", label: "Konu çalışması" },
  { value: "REVIEW", label: "Tekrar" },
  { value: "VIDEO", label: "Video" },
  { value: "MATERIAL_READ", label: "Materyal" },
  { value: "CLASSIC_ASSIGNMENT", label: "Klasik ödev" },
  { value: "MOCK_EXAM", label: "Deneme" },
  { value: "ERROR_ANALYSIS", label: "Yanlış analizi" },
  { value: "PERSONAL_GOAL", label: "Bireysel hedef" },
  { value: "CUSTOM", label: "Özel görev" },
] as const;

/**
 * Koç masaüstü: görev ekle, şablon uygula, plan kopyala, not ve haftalık özet.
 * API'ler mevcut; bu bileşen UI kablosunu tamamlar.
 */
export function CoachDeskPanel({
  studentId,
  studentName,
  planId,
  planVersion,
  weekStartIso,
  templates,
  planCompletionPct,
}: Props) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [taskKind, setTaskKind] =
    useState<(typeof taskKinds)[number]["value"]>("QUESTION_PRACTICE");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [targetValue, setTargetValue] = useState(40);
  const [scheduledFor, setScheduledFor] = useState(weekStartIso.slice(0, 10));
  const [templateId, setTemplateId] = useState(templates[0]?.id || "");
  const [noteBody, setNoteBody] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<
    "INTERNAL" | "STUDENT_VISIBLE" | "PARENT_VISIBLE"
  >("INTERNAL");
  const [summaryStrengths, setSummaryStrengths] = useState("");
  const [summaryFocus, setSummaryFocus] = useState("");
  const [summaryNext, setSummaryNext] = useState("");
  const [summaryParent, setSummaryParent] = useState("");
  const [summaryStudent, setSummaryStudent] = useState("");

  async function postJson(url: string, body: unknown) {
    setBusy(true);
    setMessage("");
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error || "İşlem başarısız.");
      return false;
    }
    return true;
  }

  async function addTask() {
    if (!title.trim()) return setMessage("Görev başlığı gerekli.");
    const ok = await postJson("/api/panel/kocum/tasks", {
      studentId,
      weekStart: weekStartIso,
      title: title.trim(),
      subject: subject.trim() || null,
      taskKind,
      scheduledFor: new Date(`${scheduledFor}T12:00:00+03:00`).toISOString(),
      durationMinutes,
      targetType:
        taskKind === "QUESTION_PRACTICE" || taskKind === "ERROR_ANALYSIS"
          ? "QUESTIONS"
          : "NONE",
      targetValue:
        taskKind === "QUESTION_PRACTICE" || taskKind === "ERROR_ANALYSIS"
          ? targetValue
          : null,
      sourceType: "MANUAL_COACH",
    });
    if (ok) {
      setTitle("");
      setMessage("Görev eklendi.");
      window.location.reload();
    }
  }

  async function applyTemplate() {
    if (!templateId) return setMessage("Şablon seçin.");
    const ok = await postJson(
      `/api/panel/kocum/templates/${templateId}/apply`,
      {
        studentId,
        weekStart: weekStartIso,
      },
    );
    if (ok) {
      setMessage("Şablon plana uygulandı (taslak).");
      window.location.reload();
    }
  }

  async function copyPlan() {
    if (!planId) return setMessage("Kopyalanacak plan yok.");
    const ok = await postJson(`/api/panel/kocum/plans/${planId}/copy`, {
      carryOverIncomplete: true,
    });
    if (ok) {
      setMessage("Plan kopyalandı; eksik görevler taşındı.");
      window.location.reload();
    }
  }

  async function saveNote() {
    if (!noteBody.trim()) return setMessage("Not metni gerekli.");
    const ok = await postJson("/api/panel/kocum/notes", {
      studentId,
      body: noteBody.trim(),
      visibility: noteVisibility,
    });
    if (ok) {
      setNoteBody("");
      setMessage(
        `Not kaydedildi (${noteVisibility === "INTERNAL" ? "iç not" : noteVisibility}).`,
      );
    }
  }

  async function publishSummary(publish: boolean) {
    const ok = await postJson("/api/panel/kocum/summaries", {
      studentId,
      weekStart: weekStartIso,
      planCompletionPct: planCompletionPct ?? null,
      strengths: summaryStrengths || null,
      focusAreas: summaryFocus || null,
      nextWeekFocus: summaryNext || null,
      studentVisibleText: summaryStudent || null,
      parentVisibleText: summaryParent || null,
      publish,
    });
    if (ok) {
      setMessage(
        publish
          ? "Haftalık özet yayınlandı."
          : "Haftalık özet taslak kaydedildi.",
      );
    }
  }

  return (
    <section
      className="overflow-hidden rounded-[10px] border border-pn-border bg-white p-5 sm:p-6"
      aria-labelledby={`coach-desk-${studentId}`}
    >
      <p className="text-xs font-extrabold uppercase tracking-[.07em] text-(--brand-olive)">
        Koç masaüstü
      </p>
      <h2
        id={`coach-desk-${studentId}`}
        className="mt-1 text-lg font-extrabold"
      >
        {studentName}
      </h2>
      <p className="mt-1 text-xs text-(--site-muted)">
        Plan sürümü v{planVersion}. Görev ekleyin, şablon uygulayın, özet
        yayınlayın.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-(--site-line) p-3">
          <p className="flex items-center gap-1 text-xs font-extrabold">
            <FilePlus2 size={14} /> Görev ekle
          </p>
          <label className="mt-2 block">
            <span className="block text-[12.5px] font-medium text-pn-text-secondary">Başlık</span>
            <input
              className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label>
              <span className="block text-[12.5px] font-medium text-pn-text-secondary">Ders</span>
              <input
                className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label>
              <span className="block text-[12.5px] font-medium text-pn-text-secondary">Tür</span>
              <select
                className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1"
                value={taskKind}
                onChange={(e) => setTaskKind(e.target.value as typeof taskKind)}
              >
                {taskKinds.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <label>
              <span className="block text-[12.5px] font-medium text-pn-text-secondary">Tarih</span>
              <input
                type="date"
                className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </label>
            <label>
              <span className="block text-[12.5px] font-medium text-pn-text-secondary">Süre (dk)</span>
              <input
                type="number"
                min={5}
                max={480}
                className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </label>
            <label>
              <span className="block text-[12.5px] font-medium text-pn-text-secondary">Soru hedefi</span>
              <input
                type="number"
                min={0}
                max={500}
                className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1"
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void addTask()}
            className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px] mt-3"
          >
            Görevi ekle
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-(--site-line) p-3">
            <p className="flex items-center gap-1 text-xs font-extrabold">
              <ScrollText size={14} /> Şablon uygula
            </p>
            {templates.length ? (
              <>
                <select
                  className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-2"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  aria-label="Haftalık plan şablonu"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void applyTemplate()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-[13.5px] mt-2"
                >
                  Şablonu plana uygula
                </button>
              </>
            ) : (
              <p className="mt-2 text-xs text-(--site-muted)">
                Hazır şablon yok.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-(--site-line) p-3">
            <p className="flex items-center gap-1 text-xs font-extrabold">
              <CopyPlus size={14} /> Plan kopyala
            </p>
            <p className="mt-1 text-[11px] text-(--site-muted)">
              Sonraki haftaya kopyalar; tamamlanmayan görevleri taşır.
            </p>
            <button
              type="button"
              disabled={busy || !planId}
              onClick={() => void copyPlan()}
              className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-[13.5px] mt-2"
            >
              Kopyala ve eksikleri taşı
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-(--site-line) p-3">
          <p className="flex items-center gap-1 text-xs font-extrabold">
            <NotebookPen size={14} /> Koç notu
          </p>
          <label className="mt-2 block">
            <span className="block text-[12.5px] font-medium text-pn-text-secondary">Görünürlük (varsayılan: iç not)</span>
            <select
              className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1"
              value={noteVisibility}
              onChange={(e) =>
                setNoteVisibility(e.target.value as typeof noteVisibility)
              }
            >
              <option value="INTERNAL">İç not (yalnız personel)</option>
              <option value="STUDENT_VISIBLE">Öğrenci görebilir</option>
              <option value="PARENT_VISIBLE">Veli görebilir</option>
            </select>
          </label>
          <textarea
            className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-2 min-h-[80px]"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Not"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveNote()}
            className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-[13.5px] mt-2"
          >
            Notu kaydet
          </button>
        </div>

        <div className="rounded-xl border border-(--site-line) p-3">
          <p className="text-xs font-extrabold">Haftalık özet</p>
          <label className="mt-2 block">
            <span className="block text-[12.5px] font-medium text-pn-text-secondary">Güçlü</span>
            <input
              className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1"
              value={summaryStrengths}
              onChange={(e) => setSummaryStrengths(e.target.value)}
            />
          </label>
          <label className="mt-2 block">
            <span className="block text-[12.5px] font-medium text-pn-text-secondary">Odak</span>
            <input
              className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1"
              value={summaryFocus}
              onChange={(e) => setSummaryFocus(e.target.value)}
            />
          </label>
          <label className="mt-2 block">
            <span className="block text-[12.5px] font-medium text-pn-text-secondary">Gelecek hafta</span>
            <input
              className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1"
              value={summaryNext}
              onChange={(e) => setSummaryNext(e.target.value)}
            />
          </label>
          <label className="mt-2 block">
            <span className="block text-[12.5px] font-medium text-pn-text-secondary">Öğrenci metni</span>
            <textarea
              className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1 min-h-[56px]"
              value={summaryStudent}
              onChange={(e) => setSummaryStudent(e.target.value)}
            />
          </label>
          <label className="mt-2 block">
            <span className="block text-[12.5px] font-medium text-pn-text-secondary">Veli metni</span>
            <textarea
              className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 mt-1 min-h-[56px]"
              value={summaryParent}
              onChange={(e) => setSummaryParent(e.target.value)}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void publishSummary(false)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-pn-border-strong bg-white text-pn-text hover:bg-pn-hover min-h-10 px-3.5 text-[13.5px]"
            >
              Taslak kaydet
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void publishSummary(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-dc-ink text-white hover:bg-black min-h-10 px-3.5 text-[13.5px]"
            >
              Yayınla
            </button>
          </div>
        </div>
      </div>

      <p
        aria-live="polite"
        className="mt-3 text-xs font-bold text-(--brand-olive)"
      >
        {message}
      </p>
    </section>
  );
}
