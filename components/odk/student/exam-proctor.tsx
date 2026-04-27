"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from "react";
import { startExam, submitAttempt, recordTabSwitch, recordAnswer } from "@/app/odk/panel/actions";
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
  Loader2,
  CloudOff,
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
  serverNow: number;
  examStartsAt: string | null;
};

const OPTIONS = ["A", "B", "C", "D", "E"];

// ── Local storage backup ──────────────────────────────────────────────────────
// Keyed by attemptId, persists answers across reloads / network failures so the
// student never loses work even if recordAnswer fails server-side.

type AnswersMap = Record<string, Record<number, string>>;

// Backup includes both answers and violation count so a browser crash doesn't
// reset the anti-cheat counter.
type Backup = { answers: AnswersMap; violations?: number };

const BACKUP_KEY = (attemptId: string) => `odk-attempt-backup-${attemptId}`;

function loadBackup(attemptId: string): Backup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BACKUP_KEY(attemptId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Backup | AnswersMap;
    // Handle old format (plain AnswersMap before this change)
    if (parsed && typeof parsed === "object" && !("answers" in parsed)) {
      return { answers: parsed as AnswersMap };
    }
    return parsed as Backup;
  } catch {
    return null;
  }
}

function saveBackup(attemptId: string, answers: AnswersMap, violations: number) {
  if (typeof window === "undefined") return;
  try {
    const backup: Backup = { answers, violations };
    window.localStorage.setItem(BACKUP_KEY(attemptId), JSON.stringify(backup));
  } catch {
    // quota exceeded — ignore
  }
}

function clearBackup(attemptId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BACKUP_KEY(attemptId));
  } catch {
    // ignore
  }
}

// Merge two answer maps; second one wins on conflict.
function mergeAnswers(a: AnswersMap, b: AnswersMap): AnswersMap {
  const out: AnswersMap = { ...a };
  for (const [secId, secAns] of Object.entries(b)) {
    out[secId] = { ...(out[secId] ?? {}), ...secAns };
  }
  return out;
}

// ── Retry helper ──────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 500,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

// ── Timer ─────────────────────────────────────────────────────────────────────

function useExamTimer(
  durationMinutes: number,
  startedAt: string | null,
  clockOffset: number,
  onExpire: () => void,
) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!startedAt) return;
    const startMs = new Date(startedAt).getTime();
    const limitMs = durationMinutes * 60 * 1000;

    const tick = () => {
      const now = Date.now() + clockOffset;
      const elapsed = now - startMs;
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
  }, [startedAt, durationMinutes, clockOffset, onExpire]);

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
  examStartsAt,
  serverNow,
  onStart,
  pending,
}: {
  examTitle: string;
  durationMinutes: number;
  googleMeetLink: string | null;
  examStartsAt: string | null;
  serverNow: number;
  onStart: () => void;
  pending: boolean;
}) {
  const [meetConfirmed, setMeetConfirmed] = useState(!googleMeetLink);
  const [smallScreenAck, setSmallScreenAck] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const check = () => setIsSmallScreen(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const lateMinutes =
    examStartsAt && serverNow > new Date(examStartsAt).getTime()
      ? Math.floor((serverNow - new Date(examStartsAt).getTime()) / 60000)
      : 0;

  const adjustedMinutes = lateMinutes > 0
    ? Math.max(1, durationMinutes - lateMinutes)
    : durationMinutes;

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900">{examTitle}</h1>
          <p className="text-stone-500 mt-1">{durationMinutes} dakikalık sınav</p>
        </div>

        {/* Late joiner warning */}
        {lateMinutes > 0 && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-1">
            <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              Sınava {lateMinutes} dakika geç kaldın
            </p>
            <p className="text-sm text-orange-700">
              Kalan süren <strong>{adjustedMinutes} dakika</strong>. Sınav diğer öğrenciler için devam ediyor.
            </p>
          </div>
        )}

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

        {/* Small-screen warning */}
        {isSmallScreen && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Telefon Ekranı
            </p>
            <p className="text-sm text-rose-800">
              Bu sınav tablet/masaüstü için tasarlandı. Telefon ekranında soruları görmekte ve optikte
              tüm seçenekleri işaretlemekte zorlanabilirsin. <strong>Mümkünse tabletten veya
              bilgisayardan giriş yap.</strong>
            </p>
            <label className="flex items-start gap-2 text-sm text-rose-900 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={smallScreenAck}
                onChange={(e) => setSmallScreenAck(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-rose-400 shrink-0"
              />
              Anladım, yine de telefondan devam etmek istiyorum.
            </label>
          </div>
        )}

        <button
          disabled={!meetConfirmed || pending || (isSmallScreen && !smallScreenAck)}
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
// Escalation levels: 1-2 = warning, 3-4 = strong warning, ≥5 = terminal

function ViolationOverlay({
  count,
  onDismiss,
}: {
  count: number;
  onDismiss: () => void;
}) {
  const isStrong = count >= 3;
  const isTerminal = count >= 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
        <div className="flex justify-center">
          <div className={`rounded-full p-4 ${isTerminal ? "bg-red-200" : isStrong ? "bg-orange-100" : "bg-red-100"}`}>
            <AlertTriangle className={`h-8 w-8 ${isTerminal ? "text-red-700" : isStrong ? "text-orange-600" : "text-red-600"}`} />
          </div>
        </div>
        <h2 className="text-lg font-bold text-stone-900">
          {isTerminal ? "Sınav Sonlandırılıyor" : "Sınav İhlali Tespit Edildi!"}
        </h2>
        <p className="text-sm text-stone-600">
          {isTerminal
            ? "5 ihlal limitine ulaştın. Sınavın otomatik olarak gönderildi ve admin tarafından incelenecek."
            : "Başka sekmeye geçildi veya tam ekrandan çıkıldı."}{" "}
          <span className={`font-semibold ${isStrong ? "text-red-700" : "text-red-600"}`}>
            Toplam ihlal: {count}
          </span>
        </p>
        {isStrong && !isTerminal && (
          <p className="text-xs font-semibold text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
            ⚠️ 5 ihlale ulaşırsan sınavın otomatik gönderilecek!
          </p>
        )}
        <p className="text-xs text-stone-400">
          Bu ihlaller admin tarafından görülebilir. {!isTerminal && "Sınavın devam ediyor, geri dönmek için butona bas."}
        </p>
        {!isTerminal && (
          <button
            onClick={onDismiss}
            className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Sınava Dön
          </button>
        )}
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
  serverNow,
  examStartsAt,
}: Props) {
  const clockOffsetRef = useRef(serverNow - Date.now());
  const [phase, setPhase] = useState<"pre" | "exam" | "submitted">(
    initialAttemptId ? "exam" : "pre",
  );
  const [attemptId, setAttemptId] = useState<string | null>(initialAttemptId);
  const [startedAt, setStartedAt] = useState<string | null>(attemptStartedAt);
  const [pending, startTransition] = useTransition();

  // Answers state — initialised from server, then merged with localStorage backup
  // (backup wins so we recover answers that didn't make it to the server).
  const [answers, setAnswers] = useState<AnswersMap>(() => {
    const fromServer: AnswersMap = {};
    for (const sec of sections) {
      fromServer[sec.id] = { ...sec.existingAnswers };
    }
    if (initialAttemptId) {
      const backup = loadBackup(initialAttemptId);
      if (backup) return mergeAnswers(fromServer, backup.answers);
    }
    return fromServer;
  });

  // Per-answer save status
  type SaveStatus = "idle" | "saving" | "saved" | "error";
  const [saveStatus, setSaveStatus] = useState<Record<string, Record<number, SaveStatus>>>({});
  const saveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Per-answer timestamps for integrity analysis
  const answerTimestampsRef = useRef<Record<string, Record<number, number>>>({});

  // Active question for keyboard navigation
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  // Tab detection state — initialised from localStorage backup so violations
  // survive a browser crash or accidental page reload.
  const [violationCount, setViolationCount] = useState(() => {
    if (initialAttemptId) {
      const backup = loadBackup(initialAttemptId);
      return backup?.violations ?? 0;
    }
    return 0;
  });
  const [showViolation, setShowViolation] = useState(false);
  const violationRef = useRef(violationCount);

  // Persist answers + violation count to localStorage on every change.
  useEffect(() => {
    if (!attemptId) return;
    saveBackup(attemptId, answers, violationCount);
  }, [attemptId, answers, violationCount]);

  // Track whether fullscreen was ever rejected so we can log it as a violation.
  const [fullscreenDenied, setFullscreenDenied] = useState(false);

  // PDF pane state
  const [showPdf, setShowPdf] = useState(!!bookletUrl);
  const [activeSection, setActiveSection] = useState(0);

  // Mobile pane toggle — on screens <lg only one of {pdf, answers} is visible.
  const [mobileView, setMobileView] = useState<"pdf" | "answers">("answers");

  // Confirm submit
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Duplicate tab detection
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);

  // ── Tab detection ──────────────────────────────────────────────────────────

  // Forward ref so recordViolation can call handleTimerExpire before it's declared.
  const triggerAutoSubmitRef = useRef<(() => void) | null>(null);

  // Central violation recorder — updates ref, state, localStorage, server,
  // and triggers auto-submit escalation at threshold.
  const recordViolation = useCallback(() => {
    if (phase !== "exam" || !attemptId) return;
    violationRef.current += 1;
    const newCount = violationRef.current;
    setViolationCount(newCount);
    setShowViolation(true);
    // Persist violation count to localStorage so it survives a browser crash
    saveBackup(attemptId, answers, newCount);
    startTransition(() => recordTabSwitch(attemptId, newCount));
    // P1: escalation — auto-submit + admin flag at 5 violations
    if (newCount >= 5) {
      triggerAutoSubmitRef.current?.();
    }
  }, [phase, attemptId, answers]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) recordViolation();
  }, [recordViolation]);

  const handleBlur = useCallback(() => {
    recordViolation();
  }, [recordViolation]);

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
    if (!el.requestFullscreen) return;
    el.requestFullscreen().catch(() => {
      // User denied fullscreen — will be logged as a violation via the
      // fullscreenDenied effect below (needs exam phase to be active).
      setFullscreenDenied(true);
    });
  }, []);

  // Log fullscreen denial as a violation once the exam phase is active.
  useEffect(() => {
    if (fullscreenDenied && phase === "exam") {
      setFullscreenDenied(false);
      recordViolation();
    }
  }, [fullscreenDenied, phase, recordViolation]);

  const handleFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement) recordViolation();
  }, [recordViolation]);

  useEffect(() => {
    if (phase !== "exam") return;
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [phase, handleFullscreenChange]);

  // ── Duplicate tab detection ────────────────────────────────────────────────
  //
  // The *older* tab wins. New tab broadcasts HELLO; older tab replies with
  // INCUMBENT containing its own session timestamp. New tab receives that and
  // locks itself. This protects the in-progress tab from being kicked when a
  // student accidentally double-opens the link or restores a stale tab.
  //
  // Only active during the actual exam phase — pre/submitted screens don't
  // broadcast, so a finished tab can't lock an in-progress one.

  const tabSessionRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  );
  const tabStartedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (phase !== "exam") return;
    if (!attemptId) return;
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(`odk-exam-${examId}`);
    const myId = tabSessionRef.current;
    const myStarted = tabStartedAtRef.current;

    type Msg =
      | { type: "HELLO"; id: string; startedAt: number }
      | { type: "INCUMBENT"; id: string; startedAt: number };

    channel.onmessage = (event: MessageEvent<Msg>) => {
      const msg = event.data;
      if (!msg || msg.id === myId) return;
      if (msg.type === "HELLO") {
        // Someone new joined — tell them we're already here.
        channel.postMessage({ type: "INCUMBENT", id: myId, startedAt: myStarted } satisfies Msg);
      } else if (msg.type === "INCUMBENT") {
        // Older tab beat us. We lock if they really are older.
        if (msg.startedAt <= myStarted) {
          setIsDuplicateTab(true);
        }
      }
    };

    channel.postMessage({ type: "HELLO", id: myId, startedAt: myStarted } satisfies Msg);

    return () => channel.close();
  }, [phase, examId, attemptId]);

  // ── Anti-cheat: block copy/paste/print/devtools/right-click ──────────────

  useEffect(() => {
    if (phase !== "exam") return;
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("copy", prevent);
    document.addEventListener("cut", prevent);
    document.addEventListener("paste", prevent);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("copy", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("paste", prevent);
    };
  }, [phase]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "exam") return;
    const currentSection = sections[activeSection];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentSection) return;

      // Block dangerous shortcuts
      if (e.key === "PrintScreen") { e.preventDefault(); return; }
      if (e.key === "F12") { e.preventDefault(); return; }
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ["u", "s", "p", "a"].includes(e.key.toLowerCase())) { e.preventDefault(); return; }
      if (ctrl && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) { e.preventDefault(); return; }

      // Answer selection: A–E
      const opt = e.key.toUpperCase();
      if (["A", "B", "C", "D", "E"].includes(opt) && activeQuestion !== null) {
        e.preventDefault();
        const cur = answers[currentSection.id]?.[activeQuestion];
        if (cur === opt) clearAnswer(currentSection.id, activeQuestion);
        else setAnswer(currentSection.id, activeQuestion, opt);
        return;
      }

      // Question navigation: ArrowDown / ArrowRight → next; ArrowUp / ArrowLeft → prev
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = (activeQuestion ?? 0) + 1;
        if (next <= currentSection.questionCount) {
          setActiveQuestion(next);
        } else if (activeSection < sections.length - 1) {
          setActiveSection((p) => p + 1);
          setActiveQuestion(1);
        }
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = (activeQuestion ?? 2) - 1;
        if (prev >= 1) {
          setActiveQuestion(prev);
        } else if (activeSection > 0) {
          const prevSec = sections[activeSection - 1];
          setActiveSection((p) => p - 1);
          setActiveQuestion(prevSec.questionCount);
        }
        return;
      }

      // Enter first question of section
      if (e.key === "Enter" && activeQuestion === null) {
        e.preventDefault();
        setActiveQuestion(1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [phase, activeSection, activeQuestion, answers, sections]);

  // ── Auto-submit on timer expire ────────────────────────────────────────────
  // Don't silently swallow errors — show a blocking overlay so the student can
  // retry manually. Per-answer recordAnswer calls have already persisted the
  // answers, so worst case the attempt stays IN_PROGRESS until they retry.

  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false);
  const [autoSubmitRetrying, setAutoSubmitRetrying] = useState(false);

  const runSubmit = useCallback(async () => {
    if (!attemptId) return;
    await withRetry(
      () => submitAttempt(attemptId, answers, answerTimestampsRef.current),
      3,
      800,
    );
    clearBackup(attemptId);
  }, [attemptId, answers]);

  const handleTimerExpire = useCallback(() => {
    if (!attemptId || phase !== "exam") return;
    setAutoSubmitRetrying(true);
    runSubmit()
      .then(() => {
        setAutoSubmitRetrying(false);
        setPhase("submitted");
      })
      .catch(() => {
        setAutoSubmitRetrying(false);
        setAutoSubmitFailed(true);
      });
  }, [attemptId, phase, runSubmit]);

  // Wire forward ref so recordViolation can call handleTimerExpire.
  useEffect(() => {
    triggerAutoSubmitRef.current = handleTimerExpire;
  }, [handleTimerExpire]);

  const remaining = useExamTimer(durationMinutes, startedAt, clockOffsetRef.current, handleTimerExpire);

  // ── Start exam ─────────────────────────────────────────────────────────────

  function handleStart() {
    startTransition(async () => {
      const result = await startExam(examId);
      if (result) {
        clockOffsetRef.current = result.serverNow - Date.now();
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
        // Flush any queued failed saves first so the final submit sees them.
        await drainSaveQueue();
        await runSubmit();
        setPhase("submitted");
      } catch {
        // Keep confirm dialog open so student can retry without losing context.
        setSubmitError(
          "Cevapların gönderilemedi. İnternet bağlantını kontrol edip tekrar dene. (Cevapların korunuyor.)",
        );
      }
    });
  }

  function retryAutoSubmit() {
    if (!attemptId) return;
    setAutoSubmitRetrying(true);
    runSubmit()
      .then(() => {
        setAutoSubmitRetrying(false);
        setAutoSubmitFailed(false);
        setPhase("submitted");
      })
      .catch(() => {
        setAutoSubmitRetrying(false);
      });
  }

  // ── Answer helpers with auto-save + retry queue ────────────────────────────
  //
  // Every answer change is persisted via recordAnswer. If a save fails after
  // retries, the answer goes into a queue that we drain whenever:
  //   1. A new save succeeds (proves connectivity)
  //   2. Every 15 seconds via interval
  //   3. Right before the user clicks Submit
  // The localStorage backup means even a complete network failure can't lose
  // answers — the next reload will recover them.

  type QueuedSave = { sectionId: string; qNum: number; option: string | null };
  const saveQueueRef = useRef<Map<string, QueuedSave>>(new Map());

  const drainSaveQueue = useCallback(async () => {
    if (!attemptId || saveQueueRef.current.size === 0) return;
    const items = Array.from(saveQueueRef.current.values());
    for (const item of items) {
      const key = `${item.sectionId}-${item.qNum}`;
      try {
        await withRetry(
          () => recordAnswer(attemptId, item.sectionId, item.qNum, item.option),
          2,
          400,
        );
        saveQueueRef.current.delete(key);
        setSaveStatus((prev) => ({
          ...prev,
          [item.sectionId]: { ...(prev[item.sectionId] ?? {}), [item.qNum]: "saved" },
        }));
      } catch {
        // Leave it queued for the next drain.
      }
    }
  }, [attemptId]);

  // Periodic drain — runs whenever there are queued saves.
  useEffect(() => {
    if (phase !== "exam") return;
    const id = setInterval(() => {
      void drainSaveQueue();
    }, 15000);
    return () => clearInterval(id);
  }, [phase, drainSaveQueue]);

  function scheduleAutoSave(sectionId: string, qNum: number, option: string | null) {
    if (!attemptId) return;
    const key = `${sectionId}-${qNum}`;
    clearTimeout(saveTimeoutsRef.current[key]);
    setSaveStatus((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] ?? {}), [qNum]: "saving" },
    }));
    saveTimeoutsRef.current[key] = setTimeout(async () => {
      try {
        await withRetry(
          () => recordAnswer(attemptId, sectionId, qNum, option),
          3,
          400,
        );
        saveQueueRef.current.delete(key);
        setSaveStatus((prev) => ({
          ...prev,
          [sectionId]: { ...(prev[sectionId] ?? {}), [qNum]: "saved" },
        }));
        // A successful save means we have connectivity — try to drain backlog.
        if (saveQueueRef.current.size > 0) void drainSaveQueue();
      } catch {
        saveQueueRef.current.set(key, { sectionId, qNum, option });
        setSaveStatus((prev) => ({
          ...prev,
          [sectionId]: { ...(prev[sectionId] ?? {}), [qNum]: "error" },
        }));
      }
    }, 400);
  }

  function setAnswer(sectionId: string, qNum: number, option: string) {
    // Record timestamp for integrity analysis
    answerTimestampsRef.current[sectionId] ??= {};
    answerTimestampsRef.current[sectionId][qNum] = Date.now();

    setAnswers((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [qNum]: option },
    }));
    scheduleAutoSave(sectionId, qNum, option);
  }

  function clearAnswer(sectionId: string, qNum: number) {
    setAnswers((prev) => {
      const updated = { ...prev[sectionId] };
      delete updated[qNum];
      return { ...prev, [sectionId]: updated };
    });
    scheduleAutoSave(sectionId, qNum, null);
  }

  const totalQuestions = sections.reduce((s, sec) => s + sec.questionCount, 0);
  const totalAnswered = Object.values(answers).reduce(
    (sum, sec) => sum + Object.keys(sec).length,
    0,
  );

  const allStatuses = Object.values(saveStatus).flatMap((sec) => Object.values(sec));
  const isSaving = allStatuses.some((s) => s === "saving");
  const hasSaveError = allStatuses.some((s) => s === "error");
  const queuedCount = allStatuses.filter((s) => s === "error").length;

  // ── Duplicate tab overlay ──────────────────────────────────────────────────

  if (isDuplicateTab) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-100 p-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-stone-900">Başka Sekmede Açık</h2>
          <p className="text-sm text-stone-600">
            Bu sınav başka bir sekmede zaten açık. Devam etmek için diğer sekmeyi kapatıp bu sayfayı yenile.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 transition"
          >
            Sayfayı Yenile
          </button>
        </div>
      </div>
    );
  }

  // ── Pre-exam screen ────────────────────────────────────────────────────────

  if (phase === "pre") {
    return (
      <PreExamScreen
        examTitle={examTitle}
        durationMinutes={durationMinutes}
        googleMeetLink={googleMeetLink}
        examStartsAt={examStartsAt}
        serverNow={serverNow}
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

      {/* Auto-submit failure overlay — blocks until student retries successfully */}
      {autoSubmitFailed && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <CloudOff className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-stone-900">Süre Doldu — Gönderim Başarısız</h2>
            <p className="text-sm text-stone-600">
              Cevapların sunucuya ulaşamadı. İnternet bağlantını kontrol et ve tekrar dene.
              <span className="block mt-1 text-xs text-stone-400">
                Cevapların kaydedildi, kaybolmadı.
              </span>
            </p>
            <button
              disabled={autoSubmitRetrying}
              onClick={retryAutoSubmit}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              {autoSubmitRetrying ? "Gönderiliyor..." : "Tekrar Dene"}
            </button>
          </div>
        </div>
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
          {/* Auto-save indicator */}
          {hasSaveError && (
            <button
              onClick={() => void drainSaveQueue()}
              title="Kaydedilemeyen cevapları tekrar dene"
              className="flex items-center gap-1 text-xs text-red-600 hover:underline"
            >
              <CloudOff className="h-3.5 w-3.5" /> {queuedCount} kaydedilemedi · tekrar dene
            </button>
          )}
          {isSaving && !hasSaveError && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Kaydediliyor
            </span>
          )}
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

      {/* Mobile pane toggle (hidden on lg+) */}
      {bookletUrl && showPdf && (
        <div className="lg:hidden shrink-0 flex items-stretch border-b border-stone-200 bg-white">
          <button
            onClick={() => setMobileView("pdf")}
            className={`flex-1 px-3 py-2 text-xs font-semibold transition ${
              mobileView === "pdf"
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-500 hover:bg-stone-50"
            }`}
          >
            Kitapçık
          </button>
          <button
            onClick={() => setMobileView("answers")}
            className={`flex-1 px-3 py-2 text-xs font-semibold transition ${
              mobileView === "answers"
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-500 hover:bg-stone-50"
            }`}
          >
            Optik ({totalAnswered}/{totalQuestions})
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF pane */}
        {showPdf && bookletUrl && (
          <div
            className={`flex-col w-full lg:w-1/2 border-r border-stone-200 bg-white ${
              mobileView === "pdf" ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-stone-100">
              <span className="text-xs font-medium text-stone-600 truncate">Sınav Kitapçığı</span>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={bookletUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50 transition"
                  title="Kitapçığı yeni sekmede aç"
                >
                  <ExternalLink className="h-3 w-3" /> Yeni sekme
                </a>
                <button
                  onClick={() => setShowPdf(false)}
                  className="rounded-md px-2 py-1 text-[11px] text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition"
                >
                  Gizle
                </button>
              </div>
            </div>
            <object
              data={bookletUrl}
              type="application/pdf"
              className="flex-1 w-full"
              aria-label="Sınav Kitapçığı"
            >
              <iframe src={bookletUrl} className="h-full w-full" title="Sınav Kitapçığı" />
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm font-medium text-stone-700">
                  Tarayıcın PDF&apos;i bu pencerede gösteremiyor.
                </p>
                <a
                  href={bookletUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  <ExternalLink className="h-4 w-4" /> Kitapçığı Yeni Sekmede Aç
                </a>
              </div>
            </object>
          </div>
        )}

        {/* Answer sheet pane */}
        <div
          className={`flex-col overflow-hidden w-full ${
            showPdf && bookletUrl ? "lg:w-1/2" : "lg:w-full"
          } ${
            !showPdf || !bookletUrl || mobileView === "answers"
              ? "flex"
              : "hidden lg:flex"
          }`}
        >
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

          {/* Question navigator strip */}
          {currentSection && (
            <div className="shrink-0 border-b border-stone-100 bg-stone-50 px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: currentSection.questionCount }, (_, i) => i + 1).map((qNum) => {
                  const isAnswered = !!answers[currentSection.id]?.[qNum];
                  const isActive = activeQuestion === qNum;
                  const status = saveStatus[currentSection.id]?.[qNum];
                  return (
                    <button
                      key={qNum}
                      onClick={() => setActiveQuestion(qNum)}
                      title={`Soru ${qNum}`}
                      className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold transition ${
                        isActive
                          ? "bg-blue-600 text-white ring-2 ring-blue-300"
                          : isAnswered
                          ? status === "error"
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-700"
                          : "bg-white border border-stone-200 text-stone-400 hover:border-stone-400"
                      }`}
                    >
                      {qNum}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[10px] text-stone-400">
                Ok tuşları ile gezin · A–E ile seç
              </p>
            </div>
          )}

          {/* Question grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24">
            {currentSection && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: currentSection.questionCount }, (_, i) => i + 1).map(
                  (qNum) => {
                    const selected = answers[currentSection.id]?.[qNum];
                    const isActive = activeQuestion === qNum;
                    const status = saveStatus[currentSection.id]?.[qNum];
                    return (
                      <div
                        key={qNum}
                        onClick={() => setActiveQuestion(qNum)}
                        className={`flex items-center gap-2 rounded-lg p-1 transition cursor-default ${
                          isActive ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-stone-50"
                        }`}
                      >
                        <span className={`w-6 text-right text-xs font-mono ${isActive ? "text-blue-600 font-bold" : "text-stone-400"}`}>
                          {qNum}
                        </span>
                        <div className="flex gap-1">
                          {OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveQuestion(qNum);
                                selected === opt
                                  ? clearAnswer(currentSection.id, qNum)
                                  : setAnswer(currentSection.id, qNum, opt);
                              }}
                              className={`flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-sm sm:text-xs font-bold transition active:scale-95 ${
                                selected === opt
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "bg-white border border-stone-200 text-stone-600 hover:border-emerald-400 hover:text-emerald-600"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {/* Per-answer save indicator */}
                        {status === "saving" && (
                          <Loader2 className="h-3 w-3 text-stone-300 animate-spin shrink-0" />
                        )}
                        {status === "error" && (
                          <CloudOff className="h-3 w-3 text-red-400 shrink-0" />
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {/* Section nav + submit */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
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
