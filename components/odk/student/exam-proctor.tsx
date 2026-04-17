"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from "react";
import { startExam, submitAttempt, recordTabSwitch } from "@/app/odk/panel/actions";
import {
  AlertTriangle,
  Maximize2,
  Clock,
  CheckCircle2,
  ExternalLink,
  Video,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";

type Section = {
  id: string;
  title: string;
  questionCount: number;
  orderIndex: number;
  existingAnswers: Record<number, string>;
  officialAnswerCount: number;
};

type Props = {
  examId: string;
  examTitle: string;
  durationMinutes: number;
  attemptId: string | null;
  attemptStartedAt: string | null;
  sections: Section[];
  bookletUrl: string | null;
  googleMeetLink: string | null;
};

const OPTIONS = ["A", "B", "C", "D", "E"];

// ── Timer ─────────────────────────────────────────────────────────────────────

function useExamTimer(
  durationMinutes: number,
  startedAt: string | null,
  onExpire: () => void,
) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!startedAt) return;
    const startMs = new Date(startedAt).getTime();
    const limitMs = durationMinutes * 60 * 1000;

    const tick = () => {
      const elapsed = Date.now() - startMs;
      const left = Math.max(0, limitMs - elapsed);
      setRemaining(left);
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, durationMinutes, onExpire]);

  return remaining;
}

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Pre-exam screen ───────────────────────────────────────────────────────────

function PreExamScreen({
  examTitle,
  durationMinutes,
  googleMeetLink,
  onStart,
  pending,
}: {
  examTitle: string;
  durationMinutes: number;
  googleMeetLink: string | null;
  onStart: () => void;
  pending: boolean;
}) {
  const [meetConfirmed, setMeetConfirmed] = useState(!googleMeetLink);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900">{examTitle}</h1>
          <p className="text-stone-500 mt-1">{durationMinutes} dakikalık sınav</p>
        </div>

        {/* Rules */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Sınav Kuralları
          </h2>
          <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
            <li>Sınav tam ekranda açılacak, lütfen tam ekranı kapatma.</li>
            <li>Başka sekme veya pencereye geçildiğinde ihlal kaydedilir.</li>
            <li>Süre dolduğunda cevaplar otomatik olarak gönderilir.</li>
            <li>Cevap anahtarı sınav tamamlandıktan sonra görünür olur.</li>
          </ul>
        </div>

        {/* Google Meet step */}
        {googleMeetLink && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
              <Video className="h-4 w-4" /> Kamera Bağlantısı Zorunlu
            </h2>
            <p className="text-sm text-blue-800">
              Sınava başlamadan önce aşağıdaki Google Meet bağlantısına katıl ve kameranı aç.
            </p>
            <a
              href={googleMeetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              <ExternalLink className="h-4 w-4" />
              Google Meet&apos;e Katıl
            </a>
            <label className="flex items-center gap-2.5 text-sm text-blue-800 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={meetConfirmed}
                onChange={(e) => setMeetConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-blue-400"
              />
              Katıldım ve kameramı açtım
            </label>
          </div>
        )}

        <button
          disabled={!meetConfirmed || pending}
          onClick={onStart}
          className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {pending ? "Başlatılıyor..." : "Sınava Başla →"}
        </button>
      </div>
    </div>
  );
}

// ── Violation overlay ─────────────────────────────────────────────────────────

function ViolationOverlay({
  count,
  onDismiss,
}: {
  count: number;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-stone-900">Sekme Değişikliği Tespit Edildi!</h2>
        <p className="text-sm text-stone-600">
          Başka sekmeye veya uygulamaya geçtiğin tespit edildi.{" "}
          <span className="font-semibold text-red-600">Toplam ihlal: {count}</span>
        </p>
        <p className="text-xs text-stone-400">
          Bu ihlaller admin tarafından görülebilir. Sınavın devam ediyor, geri dönmek için butona bas.
        </p>
        <button
          onClick={onDismiss}
          className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
        >
          Sınava Dön
        </button>
      </div>
    </div>
  );
}

// ── Main exam form ─────────────────────────────────────────────────────────────

export function ExamProctor({
  examId,
  examTitle,
  durationMinutes,
  attemptId: initialAttemptId,
  attemptStartedAt,
  sections,
  bookletUrl,
  googleMeetLink,
}: Props) {
  const [phase, setPhase] = useState<"pre" | "exam" | "submitted">(
    initialAttemptId ? "exam" : "pre",
  );
  const [attemptId, setAttemptId] = useState<string | null>(initialAttemptId);
  const [startedAt, setStartedAt] = useState<string | null>(attemptStartedAt);
  const [pending, startTransition] = useTransition();

  // Answers state
  const [answers, setAnswers] = useState<Record<string, Record<number, string>>>(() => {
    const init: Record<string, Record<number, string>> = {};
    for (const sec of sections) {
      init[sec.id] = { ...sec.existingAnswers };
    }
    return init;
  });

  // Tab detection state
  const [violationCount, setViolationCount] = useState(0);
  const [showViolation, setShowViolation] = useState(false);
  const violationRef = useRef(0);

  // PDF pane state
  const [showPdf, setShowPdf] = useState(!!bookletUrl);
  const [activeSection, setActiveSection] = useState(0);

  // Confirm submit
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Tab detection ──────────────────────────────────────────────────────────

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && phase === "exam" && attemptId) {
      violationRef.current += 1;
      setViolationCount(violationRef.current);
      setShowViolation(true);
      startTransition(() => recordTabSwitch(attemptId, violationRef.current));
    }
  }, [phase, attemptId]);

  const handleBlur = useCallback(() => {
    if (phase === "exam" && attemptId) {
      violationRef.current += 1;
      setViolationCount(violationRef.current);
      setShowViolation(true);
      startTransition(() => recordTabSwitch(attemptId, violationRef.current));
    }
  }, [phase, attemptId]);

  useEffect(() => {
    if (phase !== "exam") return;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [phase, handleVisibilityChange, handleBlur]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────

  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }, []);

  // ── Auto-submit on timer expire ────────────────────────────────────────────

  const handleTimerExpire = useCallback(() => {
    if (!attemptId || phase !== "exam") return;
    startTransition(async () => {
      try {
        await submitAttempt(attemptId, answers);
        setPhase("submitted");
      } catch {
        // ignore — page will refresh
      }
    });
  }, [attemptId, answers, phase]);

  const remaining = useExamTimer(durationMinutes, startedAt, handleTimerExpire);

  // ── Start exam ─────────────────────────────────────────────────────────────

  function handleStart() {
    startTransition(async () => {
      const result = await startExam(examId);
      if (result) {
        setAttemptId(result.attemptId);
        setStartedAt(result.startedAt);
      }
      setPhase("exam");
      requestFullscreen();
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!attemptId) return;
    setSubmitError(null);
    startTransition(async () => {
      try {
        await submitAttempt(attemptId, answers);
        setPhase("submitted");
      } catch {
        setSubmitError("Bir hata oluştu. Tekrar dene.");
        setConfirmOpen(false);
      }
    });
  }

  // ── Answer helpers ─────────────────────────────────────────────────────────

  function setAnswer(sectionId: string, qNum: number, option: string) {
    setAnswers((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [qNum]: option },
    }));
  }

  function clearAnswer(sectionId: string, qNum: number) {
    setAnswers((prev) => {
      const updated = { ...prev[sectionId] };
      delete updated[qNum];
      return { ...prev, [sectionId]: updated };
    });
  }

  const totalQuestions = sections.reduce((s, sec) => s + sec.questionCount, 0);
  const totalAnswered = Object.values(answers).reduce(
    (sum, sec) => sum + Object.keys(sec).length,
    0,
  );

  // ── Pre-exam screen ────────────────────────────────────────────────────────

  if (phase === "pre") {
    return (
      <PreExamScreen
        examTitle={examTitle}
        durationMinutes={durationMinutes}
        googleMeetLink={googleMeetLink}
        onStart={handleStart}
        pending={pending}
      />
    );
  }

  // ── Submitted screen ───────────────────────────────────────────────────────

  if (phase === "submitted") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 p-5">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Sınav Tamamlandı!</h1>
          <p className="text-stone-500">Cevapların başarıyla gönderildi. Sonuçlar sayfaya yüklenecek.</p>
          <a
            href={`/odk/panel/sinavlar/${examId}`}
            className="inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Sonuçları Gör
          </a>
        </div>
      </div>
    );
  }

  // ── Active exam UI ─────────────────────────────────────────────────────────

  const currentSection = sections[activeSection];
  const isLow = remaining !== null && remaining < 5 * 60 * 1000;
  const isCritical = remaining !== null && remaining < 2 * 60 * 1000;

  return (
    <div className="fixed inset-0 bg-stone-100 flex flex-col overflow-hidden">
      {/* Violation overlay */}
      {showViolation && (
        <ViolationOverlay
          count={violationCount}
          onDismiss={() => {
            setShowViolation(false);
            requestFullscreen();
          }}
        />
      )}

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-sm font-semibold text-stone-900 truncate">{examTitle}</h1>
          {violationCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {violationCount} ihlal
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">
            {totalAnswered}/{totalQuestions} işaretlendi
          </span>
          {remaining !== null && (
            <div
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-mono font-bold tabular-nums ${
                isCritical
                  ? "bg-red-600 text-white animate-pulse"
                  : isLow
                  ? "bg-amber-500 text-white"
                  : "bg-stone-100 text-stone-900"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(remaining)}
            </div>
          )}
          <button
            onClick={requestFullscreen}
            title="Tam Ekran"
            className="rounded-lg border border-stone-200 p-1.5 hover:bg-stone-50 transition"
          >
            <Maximize2 className="h-3.5 w-3.5 text-stone-500" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF pane */}
        {showPdf && bookletUrl && (
          <div className="flex flex-col w-1/2 border-r border-stone-200 bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100">
              <span className="text-xs font-medium text-stone-600">Sınav Kitapçığı</span>
              <button
                onClick={() => setShowPdf(false)}
                className="text-xs text-stone-400 hover:text-stone-600 transition"
              >
                Gizle
              </button>
            </div>
            <iframe
              src={bookletUrl}
              className="flex-1 w-full"
              title="Sınav Kitapçığı"
            />
          </div>
        )}

        {/* Answer sheet pane */}
        <div className={`flex flex-col overflow-hidden ${showPdf && bookletUrl ? "w-1/2" : "w-full"}`}>
          {/* Section tabs */}
          <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-stone-200 bg-white overflow-x-auto">
            {!showPdf && bookletUrl && (
              <button
                onClick={() => setShowPdf(true)}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition mr-2"
              >
                <ExternalLink className="h-3 w-3" /> Kitapçık
              </button>
            )}
            {sections.map((sec, idx) => {
              const answered = Object.keys(answers[sec.id] ?? {}).length;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(idx)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    idx === activeSection
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {sec.title} ({answered}/{sec.questionCount})
                </button>
              );
            })}
          </div>

          {/* Question grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {currentSection && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: currentSection.questionCount }, (_, i) => i + 1).map(
                  (qNum) => {
                    const selected = answers[currentSection.id]?.[qNum];
                    return (
                      <div key={qNum} className="flex items-center gap-2">
                        <span className="w-6 text-right text-xs font-mono text-stone-400">
                          {qNum}
                        </span>
                        <div className="flex gap-1">
                          {OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                selected === opt
                                  ? clearAnswer(currentSection.id, qNum)
                                  : setAnswer(currentSection.id, qNum, opt)
                              }
                              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                                selected === opt
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "bg-white border border-stone-200 text-stone-600 hover:border-emerald-400 hover:text-emerald-600"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {/* Section nav + submit */}
          <div className="shrink-0 flex items-center justify-between gap-3 border-t border-stone-200 bg-white px-4 py-3">
            <button
              disabled={activeSection === 0}
              onClick={() => setActiveSection((p) => p - 1)}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Önceki
            </button>

            {!confirmOpen ? (
              <button
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                <Send className="h-3.5 w-3.5" /> Cevapları Gönder
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">
                  Emin misin?{totalAnswered < totalQuestions && ` (${totalQuestions - totalAnswered} boş)`}
                </span>
                <button
                  disabled={pending}
                  onClick={handleSubmit}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                  {pending ? "Gönderiliyor..." : "Evet, Gönder"}
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 transition"
                >
                  İptal
                </button>
              </div>
            )}

            {submitError && (
              <span className="text-xs text-red-600">{submitError}</span>
            )}

            <button
              disabled={activeSection === sections.length - 1}
              onClick={() => setActiveSection((p) => p + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition"
            >
              Sonraki <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
