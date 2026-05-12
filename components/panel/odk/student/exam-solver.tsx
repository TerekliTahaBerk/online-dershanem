"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCheatTracker, type CheatEventType } from "./use-cheat-tracker";

type Section = { id: string; title: string; fromQ: number; toQ: number };
type AnswerOption = "A" | "B" | "C" | "D" | "E";
type SavedAnswer = { sectionId: string; questionNumber: number; selectedOption: string };

type ExamSettings = {
  blockCopyPaste?: boolean;
  warnOnViolation?: boolean;
  fullscreenRequired?: boolean;
  autoSubmitOnFullscreenExit?: boolean;
};

type Props = {
  attemptId: string;
  examTitle: string;
  durationMinutes: number;
  startedAt: string; // ISO
  bookletUrl: string | null;
  sections: Section[];
  totalQuestions: number;
  initialAnswers: SavedAnswer[];
  initialViolations?: number;
  examSettings?: Record<string, unknown> | null;
};

const OPTIONS: AnswerOption[] = ["A", "B", "C", "D", "E"];
const AUTOSAVE_DEBOUNCE_MS = 1500;

export function ExamSolver({
  attemptId, examTitle, durationMinutes, startedAt,
  bookletUrl, sections, totalQuestions, initialAnswers,
  initialViolations = 0, examSettings,
}: Props) {
  const router = useRouter();
  const settings = (examSettings ?? {}) as ExamSettings;

  // Map<questionNumber, AnswerOption>
  const initialMap = useMemo(() => {
    const m = new Map<number, AnswerOption>();
    for (const a of initialAnswers) {
      if ((OPTIONS as string[]).includes(a.selectedOption)) {
        m.set(a.questionNumber, a.selectedOption as AnswerOption);
      }
    }
    return m;
  }, [initialAnswers]);

  const [answers, setAnswers] = useState<Map<number, AnswerOption>>(initialMap);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id ?? "");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [autoSubmittedReason, setAutoSubmittedReason] = useState<string | null>(null);
  const [warningToast, setWarningToast] = useState<string | null>(null);

  // Cheat tracker
  const cheatTracker = useCheatTracker({
    attemptId,
    enabled: !submitting && autoSubmittedReason === null,
    blockCopyPaste: settings.blockCopyPaste !== false,
    onViolation: (type, total) => {
      if (settings.warnOnViolation === false) return;
      const msg = warningTextFor(type);
      if (msg) {
        setWarningToast(`${msg} (${total} ihlal)`);
        setTimeout(() => setWarningToast(null), 4000);
      }
      if (settings.autoSubmitOnFullscreenExit && type === "FULLSCREEN_EXIT") {
        setAutoSubmittedReason("Tam ekrandan çıkıldı — otomatik teslim ediliyor.");
        void submitRef.current?.(true, "FULLSCREEN_EXIT");
      }
    },
  });
  const totalViolations = Math.max(initialViolations, cheatTracker.totalViolations);

  // Pending changes buffer (q -> option|null)
  const pendingRef = useRef<Map<number, AnswerOption | null>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitRef = useRef<((auto: boolean, reason?: string) => Promise<void>) | null>(null);

  // Calculate end time from server-provided startedAt + duration
  const endTime = useMemo(() => {
    return new Date(new Date(startedAt).getTime() + durationMinutes * 60 * 1000);
  }, [startedAt, durationMinutes]);

  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingSec = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
  const remainingMin = Math.floor(remainingSec / 60);
  const remainingSecOnly = remainingSec % 60;
  const isOvertime = remainingSec === 0;

  const flushSave = useCallback(async () => {
    if (pendingRef.current.size === 0) return;
    const batch = Array.from(pendingRef.current.entries()).map(([qn, opt]) => ({
      questionNumber: qn,
      selectedOption: opt,
    }));
    pendingRef.current.clear();
    setSaveState("saving");
    try {
      const res = await fetch(`/api/v1/odk/student/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: batch }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error ?? "Kaydedilemedi");
      setSaveState("saved");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1200);
    } catch {
      // Tekrar denemek için pending'e geri yaz
      for (const a of batch) {
        if (!pendingRef.current.has(a.questionNumber)) {
          pendingRef.current.set(a.questionNumber, a.selectedOption);
        }
      }
      setSaveState("error");
    }
  }, [attemptId]);

  const queueAutosave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void flushSave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [flushSave]);

  // Sayfa kapanırken save flush et
  useEffect(() => {
    const handler = () => {
      if (pendingRef.current.size === 0) return;
      const batch = Array.from(pendingRef.current.entries()).map(([qn, opt]) => ({
        questionNumber: qn,
        selectedOption: opt,
      }));
      const blob = new Blob([JSON.stringify({ answers: batch })], { type: "application/json" });
      navigator.sendBeacon?.(`/api/v1/odk/student/attempts/${attemptId}`, blob);
    };
    window.addEventListener("beforeunload", handler);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") handler();
    });
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [attemptId]);

  const submit = useCallback(async (auto: boolean, reason?: string) => {
    if (submitting) return;
    setSubmitting(true);
    // Önce pending kayıtları gönder
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await flushSave();
    try {
      const res = await fetch(`/api/v1/odk/student/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSubmitted: auto, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error ?? "Gönderilemedi");
      router.replace(`/panel/ogrenci/odk/sonuc/${attemptId}`);
    } catch (err) {
      setSubmitting(false);
      alert(err instanceof Error ? err.message : "Gönderim sırasında hata.");
    }
  }, [attemptId, flushSave, router, submitting]);

  // submit fonksiyonunu ref'e bağla (cheat tracker callback'i için)
  useEffect(() => { submitRef.current = submit; }, [submit]);

  // Süre bitince auto-submit
  useEffect(() => {
    if (isOvertime && !submitting) {
      setAutoSubmittedReason("Süre doldu — otomatik teslim ediliyor.");
      void submit(true, "TIME_UP");
    }
  }, [isOvertime, submit, submitting]);

  const setAnswer = useCallback((qn: number, opt: AnswerOption | null) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      if (opt === null) next.delete(qn);
      else next.set(qn, opt);
      return next;
    });
    pendingRef.current.set(qn, opt);
    queueAutosave();
  }, [queueAutosave]);

  const answeredCount = answers.size;
  const blankCount = totalQuestions - answeredCount;

  return (
    <div className="odk-solver">
      {/* Topbar */}
      <header className="odk-solver__top">
        <div className="odk-solver__title">
          <strong>{examTitle}</strong>
          <span className="od-muted" style={{ fontSize: 12, marginLeft: 8 }}>
            {totalQuestions} soru · {durationMinutes} dk
          </span>
        </div>
        <div className="odk-solver__meta">
          <SaveBadge state={saveState} />
          {totalViolations > 0 ? (
            <span className="odk-solver__violations" title="Tespit edilen ihlal sayısı">
              ⚠ {totalViolations}
            </span>
          ) : null}
          <Timer remainingSec={remainingSec} remainingMin={remainingMin} remainingSecOnly={remainingSecOnly} />
          <button
            type="button"
            className="od-btn od-btn-primary"
            onClick={() => setShowSubmitConfirm(true)}
            disabled={submitting}
          >
            Sınavı Bitir
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="odk-solver__body">
        {/* PDF */}
        <div className="odk-solver__pdf">
          {bookletUrl ? (
            <iframe
              src={bookletUrl}
              title="Soru Kitapçığı"
              className="odk-solver__iframe"
            />
          ) : (
            <div className="odk-solver__no-pdf">
              <strong>Soru kitapçığı henüz yüklenmemiş.</strong>
              <p className="od-muted">Lütfen yöneticiye bildir.</p>
            </div>
          )}
        </div>

        {/* Optical panel */}
        <aside className="odk-solver__optic">
          <div className="odk-solver__optic-header">
            <div role="tablist" className="odk-solver__tabs">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSectionId === s.id}
                  className={`odk-solver__tab ${activeSectionId === s.id ? "is-active" : ""}`}
                  onClick={() => setActiveSectionId(s.id)}
                >
                  {s.title}
                </button>
              ))}
            </div>
            <div className="odk-solver__counts">
              <span>İşaretli: <strong>{answeredCount}</strong></span>
              <span className="od-muted"> · Boş: {blankCount}</span>
            </div>
          </div>

          <div className="odk-solver__grid">
            {sections.filter((s) => s.id === activeSectionId).map((s) => (
              <SectionGrid
                key={s.id}
                section={s}
                answers={answers}
                onPick={setAnswer}
              />
            ))}
          </div>
        </aside>
      </div>

      {/* Submit confirm modal */}
      {showSubmitConfirm ? (
        <div className="odk-solver__modal-bg" onClick={() => setShowSubmitConfirm(false)}>
          <div className="odk-solver__modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sınavı bitirmek istediğine emin misin?</h3>
            <p>
              <strong>{answeredCount}</strong> soru işaretledin, <strong>{blankCount}</strong> soru boş kaldı.
              Gönderdikten sonra geri dönüş yok.
            </p>
            <div className="odk-solver__modal-actions">
              <button className="od-btn od-btn-ghost" type="button" onClick={() => setShowSubmitConfirm(false)} disabled={submitting}>
                Devam Et
              </button>
              <button className="od-btn od-btn-primary" type="button" onClick={() => submit(false)} disabled={submitting}>
                {submitting ? "Gönderiliyor…" : "Sınavı Bitir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {autoSubmittedReason ? (
        <div className="odk-solver__autosubmit">
          {autoSubmittedReason}
        </div>
      ) : null}

      {warningToast ? (
        <div className="odk-solver__warning" role="alert">
          {warningToast}
        </div>
      ) : null}
    </div>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  const map = {
    idle: { label: "Otomatik kayıt aktif", color: "var(--pd-ink-3)" },
    saving: { label: "Kaydediliyor…", color: "#0369a1" },
    saved: { label: "Kaydedildi ✓", color: "#16a34a" },
    error: { label: "Kayıt hatası — tekrar denenecek", color: "#dc2626" },
  };
  const v = map[state];
  return <span style={{ fontSize: 12, color: v.color }}>{v.label}</span>;
}

function Timer({
  remainingSec, remainingMin, remainingSecOnly,
}: {
  remainingSec: number; remainingMin: number; remainingSecOnly: number;
}) {
  const danger = remainingSec <= 60;
  const warn = remainingSec <= 5 * 60 && !danger;
  const color = danger ? "#dc2626" : warn ? "#d97706" : "var(--pd-ink-1)";
  return (
    <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 18, color }}>
      {String(remainingMin).padStart(2, "0")}:{String(remainingSecOnly).padStart(2, "0")}
    </div>
  );
}

function SectionGrid({
  section, answers, onPick,
}: {
  section: Section;
  answers: Map<number, AnswerOption>;
  onPick: (qn: number, opt: AnswerOption | null) => void;
}) {
  const rows: number[] = [];
  for (let q = section.fromQ; q <= section.toQ; q++) rows.push(q);

  return (
    <div className="odk-section-grid">
      {rows.map((qn) => {
        const sel = answers.get(qn) ?? null;
        return (
          <div key={qn} className="odk-row">
            <span className="odk-row__num">{qn}</span>
            <div className="odk-row__opts">
              {OPTIONS.map((o) => {
                const isSel = sel === o;
                return (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={isSel}
                    className={`odk-bubble ${isSel ? "is-selected" : ""}`}
                    onClick={() => onPick(qn, isSel ? null : o)}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function warningTextFor(type: CheatEventType): string | null {
  switch (type) {
    case "TAB_BLUR": return "Sınav sekmesinden ayrıldın.";
    case "VISIBILITY_HIDDEN": return "Sınav sayfası gizlendi.";
    case "FULLSCREEN_EXIT": return "Tam ekran modundan çıkıldı.";
    case "COPY": return "Kopyalama engellendi.";
    case "PASTE": return "Yapıştırma engellendi.";
    case "CUT": return "Kesme engellendi.";
    case "PRINT": return "Yazdırma engellendi.";
    case "KEY_DEVTOOLS": return "Geliştirici araçları kısayolu engellendi.";
    default: return null;
  }
}
