"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  ListChecks,
  Loader2,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";

type Option = "A" | "B" | "C" | "D" | "E";
type Answer = {
  selectedOption: Option | null;
  isMarked: boolean;
  revision: number;
};
type Question = { id: string; questionNumber: number; sectionTitle?: string; sessionKey?: string | null };
type RunnerSession = {
  phase: "SESSION" | "BREAK";
  currentKey: string;
  currentTitle: string;
  isLast: boolean;
  /** Açık oturumun bitişi (phase=SESSION) ya da aradan sonra açılacak oturumun bitişi. */
  deadlineAt: string;
  breakEndsAt: string | null;
  sessions: Array<{ key: string; title: string; status: "LOCKED" | "ACTIVE" | "UPCOMING"; durationMinutes: number }>;
};
type AnswerPayload = Answer & { questionId: string };

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function navSymbol(answer: Answer | undefined, visited: boolean) {
  if (answer?.isMarked) return "?";
  if (answer?.selectedOption) return "✓";
  if (visited) return "●";
  return "-";
}

export function StudentExamRunner({
  examId,
  attemptId,
  deadlineAt,
  serverNow,
  questions: allQuestions,
  initialAnswers,
  session = null,
}: {
  examId: string;
  attemptId: string;
  deadlineAt: string;
  serverNow: string;
  questions: Question[];
  initialAnswers: Record<string, Answer>;
  /** Oturumlu sınav (LGS). Yoksa tek oturumlu eski akış. */
  session?: RunnerSession | null;
}) {
  const router = useRouter();
  // Oturumlu sınavda yalnız açık oturumun soruları yazılır; önceki oturumlar kilitli.
  const questions = useMemo(
    () => (session ? allQuestions.filter((question) => question.sessionKey === session.currentKey) : allQuestions),
    [allQuestions, session],
  );
  const lockedQuestions = useMemo(
    () =>
      session
        ? allQuestions.filter((question) =>
            session.sessions.some((item) => item.status === "LOCKED" && item.key === question.sessionKey),
          )
        : [],
    [allQuestions, session],
  );
  const timerDeadline = session && session.phase === "SESSION" ? session.deadlineAt : deadlineAt;
  const clockOffset = useMemo(
    () => new Date(serverNow).getTime() - Date.now(),
    [serverNow],
  );
  const [remaining, setRemaining] = useState(
    () => new Date(timerDeadline).getTime() - (Date.now() + clockOffset),
  );
  const [breakRemaining, setBreakRemaining] = useState(() =>
    session?.breakEndsAt ? new Date(session.breakEndsAt).getTime() - (Date.now() + clockOffset) : 0,
  );
  const [closingSession, setClosingSession] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const sessionRefreshRef = useRef(0);
  const [answers, setAnswers] =
    useState<Record<string, Answer>>(initialAnswers);
  const [saveState, setSaveState] = useState<
    Record<string, "saving" | "saved" | "error">
  >({});
  const [online, setOnline] = useState(true);
  const [mobileView, setMobileView] = useState<"booklet" | "answers">(
    "booklet",
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const submittedRef = useRef(false);
  const lastAutoSubmitAttemptRef = useRef(0);
  const queues = useRef<Record<string, Promise<void>>>({});
  const pending = useRef<Record<string, AnswerPayload>>({});
  const sequenceRef = useRef(1);
  const focusStartedAt = useRef<number | null>(null);
  const focusQuestionId = useRef<string | null>(null);
  const eventQueue = useRef<
    Array<{
      type: string;
      sequence: number;
      clientOccurredAt: string;
      questionId?: string | null;
      metadata?: Record<string, unknown>;
    }>
  >([]);

  const closeLocally = useCallback(() => {
    submittedRef.current = true;
    router.replace(`/panel/odk/ogrenci/denemeler/${examId}`);
    router.refresh();
  }, [examId, router]);

  const flushEvents = useCallback(async () => {
    if (!eventQueue.current.length) return;
    const batch = eventQueue.current.splice(0, 50);
    try {
      await fetch(`/api/odk/student/attempts/${attemptId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });
    } catch {
      eventQueue.current.unshift(...batch);
    }
  }, [attemptId]);

  const pushEvent = useCallback(
    (
      type: string,
      questionId?: string | null,
      metadata?: Record<string, unknown>,
    ) => {
      eventQueue.current.push({
        type,
        sequence: sequenceRef.current++,
        clientOccurredAt: new Date().toISOString(),
        questionId: questionId || null,
        metadata,
      });
      if (eventQueue.current.length >= 8) void flushEvents();
    },
    [flushEvents],
  );

  const flushTiming = useCallback(
    async (questionId: string, activeDurationMs: number) => {
      if (activeDurationMs <= 0) return;
      try {
        await fetch(`/api/odk/student/attempts/${attemptId}/timings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timings: [
              {
                questionId,
                activeDurationMs,
                leftAt: new Date().toISOString(),
              },
            ],
          }),
        });
      } catch {
        // best-effort
      }
    },
    [attemptId],
  );

  const endQuestionFocus = useCallback(() => {
    if (!focusQuestionId.current || focusStartedAt.current == null) return;
    const questionId = focusQuestionId.current;
    const started = focusStartedAt.current;
    const visible = document.visibilityState === "visible";
    const elapsed = visible ? Math.max(0, Date.now() - started) : 0;
    pushEvent("QUESTION_CLOSED", questionId, { durationMs: elapsed });
    void flushTiming(questionId, elapsed);
    focusQuestionId.current = null;
    focusStartedAt.current = null;
  }, [flushTiming, pushEvent]);

  const startQuestionFocus = useCallback(
    (questionId: string) => {
      endQuestionFocus();
      focusQuestionId.current = questionId;
      focusStartedAt.current = Date.now();
      setVisited((current) => ({ ...current, [questionId]: true }));
      pushEvent("QUESTION_OPENED", questionId);
    },
    [endQuestionFocus, pushEvent],
  );

  const sendAnswer = useCallback(
    async (payload: AnswerPayload) => {
      let response: Response | null = null;
      for (let retry = 0; retry < 3; retry += 1) {
        try {
          response = await fetch(
            `/api/odk/student/attempts/${attemptId}/answers`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );
          if (response.status < 500) break;
        } catch {
          response = null;
        }
        await new Promise((resolve) =>
          window.setTimeout(resolve, 400 * 2 ** retry),
        );
      }
      if (!response) {
        setOnline(false);
        setSaveState((current) => ({
          ...current,
          [payload.questionId]: "error",
        }));
        return;
      }
      const result = await response.json().catch(() => ({}));
      if (result.answer)
        setAnswers((current) =>
          current[payload.questionId]?.revision > result.answer.revision
            ? current
            : {
                ...current,
                [payload.questionId]: {
                  selectedOption: result.answer.selectedOption,
                  isMarked: result.answer.isMarked,
                  revision: result.answer.revision,
                },
              },
        );
      if (
        pending.current[payload.questionId]?.revision === payload.revision &&
        (response.ok || result.code === "REVISION_CONFLICT")
      )
        delete pending.current[payload.questionId];
      setOnline(response.ok || response.status < 500);
      setSaveState((current) => ({
        ...current,
        [payload.questionId]: response.ok ? "saved" : "error",
      }));
      if (result.code === "ATTEMPT_CLOSED") closeLocally();
      // Oturum kapandı ya da aradayız: bekleyen kaydı bırak, güncel oturumu sunucudan al.
      if (result.code === "SESSION_LOCKED" || result.code === "SESSION_BREAK") {
        delete pending.current[payload.questionId];
        router.refresh();
      }
    },
    [attemptId, closeLocally, router],
  );

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setSubmitError("");
      endQuestionFocus();
      pushEvent(auto ? "AUTO_SUBMITTED" : "EXAM_SUBMITTED");
      await flushEvents();
      await Promise.all(Object.values(queues.current));
      if (!auto && Object.keys(pending.current).length) {
        submittedRef.current = false;
        setSubmitting(false);
        setSubmitError(
          "Kaydedilemeyen cevaplar var. Bağlantınızı kontrol edip tekrar deneyin.",
        );
        return;
      }
      try {
        const response = await fetch(
          `/api/odk/student/attempts/${attemptId}/submit`,
          { method: "POST" },
        );
        if (!response.ok) {
          submittedRef.current = false;
          setSubmitting(false);
          setSubmitError(
            auto
              ? "Süre doldu. Teslim sunucuda doğrulanıyor; bağlantı gelince otomatik yeniden denenecek."
              : "Teslim işlemi tamamlanamadı. Tekrar deneyin.",
          );
          return;
        }
        closeLocally();
      } catch {
        submittedRef.current = false;
        setSubmitting(false);
        setOnline(false);
        setSubmitError(
          auto
            ? "Süre doldu. Bağlantı gelince teslim otomatik yeniden denenecek."
            : "Bağlantı kurulamadı. Cevapların korunuyor; teslimi tekrar deneyin.",
        );
      }
    },
    [attemptId, closeLocally, endQuestionFocus, flushEvents, pushEvent],
  );

  useEffect(() => {
    pushEvent("EXAM_STARTED");
    const interval = window.setInterval(() => {
      const next = new Date(timerDeadline).getTime() - (Date.now() + clockOffset);
      setRemaining(next);
      if (session?.breakEndsAt) {
        const breakNext = new Date(session.breakEndsAt).getTime() - (Date.now() + clockOffset);
        setBreakRemaining(breakNext);
        // Ara bitti: sıradaki oturum sunucuda açıldı; sayfayı yenile.
        if (session.phase === "BREAK" && breakNext <= 0 && Date.now() - sessionRefreshRef.current >= 5_000) {
          sessionRefreshRef.current = Date.now();
          router.refresh();
        }
      }
      // Ara oturumun süresi bitti: oturum sunucuda kilitlendi; teslim değil yenileme.
      if (session && session.phase === "SESSION" && !session.isLast) {
        if (next <= 0 && Date.now() - sessionRefreshRef.current >= 5_000) {
          sessionRefreshRef.current = Date.now();
          router.refresh();
        }
        return;
      }
      if (session?.phase === "BREAK") return;
      if (
        next <= 0 &&
        !submittedRef.current &&
        Date.now() - lastAutoSubmitAttemptRef.current >= 5_000
      ) {
        lastAutoSubmitAttemptRef.current = Date.now();
        void submit(true);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [clockOffset, timerDeadline, pushEvent, router, session, submit]);

  // Oturum değişince (ara → yeni oturum) gezinme yeni oturumun ilk sorusundan başlar.
  useEffect(() => {
    setCurrentIndex(0);
    setClosingSession(false);
  }, [session?.currentKey, session?.phase]);

  const closeSession = useCallback(async () => {
    if (!session || sessionBusy) return;
    setSessionBusy(true);
    setSubmitError("");
    endQuestionFocus();
    await flushEvents();
    await Promise.all(Object.values(queues.current));
    if (Object.keys(pending.current).length) {
      setSessionBusy(false);
      setSubmitError("Kaydedilemeyen cevaplar var. Bağlantınızı kontrol edip tekrar deneyin.");
      return;
    }
    try {
      const response = await fetch(`/api/odk/student/attempts/${attemptId}/sessions/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: session.currentKey }),
      });
      const result = await response.json().catch(() => ({}));
      if (result.code === "ATTEMPT_CLOSED") return closeLocally();
      if (!response.ok) {
        setSubmitError(result.error || "Oturum kapatılamadı. Tekrar deneyin.");
        return;
      }
      setClosingSession(false);
      router.refresh();
    } catch {
      setOnline(false);
      setSubmitError("Bağlantı kurulamadı. Cevapların korunuyor; tekrar deneyin.");
    } finally {
      setSessionBusy(false);
    }
  }, [attemptId, closeLocally, endQuestionFocus, flushEvents, router, session, sessionBusy]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!submittedRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  useEffect(() => {
    const heartbeat = async () => {
      try {
        const response = await fetch(
          `/api/odk/student/attempts/${attemptId}/heartbeat`,
          { method: "POST" },
        );
        const result = await response.json().catch(() => ({}));
        setOnline(response.ok);
        if (result.code === "ATTEMPT_CLOSED") closeLocally();
      } catch {
        setOnline(false);
      }
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void heartbeat();
    }, 30_000);
    const eventsInterval = window.setInterval(() => {
      void flushEvents();
    }, 8_000);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(eventsInterval);
    };
  }, [attemptId, closeLocally, flushEvents]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        pushEvent("TAB_HIDDEN", focusQuestionId.current, { durationMs: 0 });
        endQuestionFocus();
      } else {
        pushEvent("TAB_VISIBLE");
        const question = questions[currentIndex];
        if (question) startQuestionFocus(question.id);
      }
    };
    const onBlur = () => pushEvent("WINDOW_BLUR", focusQuestionId.current);
    const onFocus = () => pushEvent("WINDOW_FOCUS", focusQuestionId.current);
    const onCopy = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-odk-exam-surface]")) {
        pushEvent("COPY_ATTEMPT", focusQuestionId.current);
      }
    };
    const onPaste = () => pushEvent("PASTE_ATTEMPT", focusQuestionId.current);
    const onContext = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-odk-exam-surface]"))
        pushEvent("CONTEXT_MENU", focusQuestionId.current);
    };
    const onOffline = () => {
      setOnline(false);
      pushEvent("NETWORK_OFFLINE");
    };
    const onOnline = () => {
      setOnline(true);
      pushEvent("NETWORK_ONLINE");
      for (const payload of Object.values(pending.current))
        queues.current[payload.questionId] = (
          queues.current[payload.questionId] || Promise.resolve()
        ).then(() => sendAnswer(payload));
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur-sm", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [
    currentIndex,
    endQuestionFocus,
    pushEvent,
    questions,
    sendAnswer,
    startQuestionFocus,
  ]);

  useEffect(() => {
    const question = questions[currentIndex];
    if (question) startQuestionFocus(question.id);
  }, [currentIndex, questions, startQuestionFocus]);

  function save(questionId: string, patch: Partial<Answer>) {
    const previous = answers[questionId] || {
      selectedOption: null,
      isMarked: false,
      revision: 0,
    };
    const next = { ...previous, ...patch, revision: previous.revision + 1 };
    if (
      patch.selectedOption !== undefined &&
      patch.selectedOption !== previous.selectedOption
    ) {
      pushEvent(
        previous.selectedOption ? "ANSWER_CHANGED" : "ANSWER_SELECTED",
        questionId,
        { selectedOption: patch.selectedOption },
      );
    }
    if (patch.isMarked !== undefined && patch.isMarked !== previous.isMarked) {
      pushEvent("QUESTION_FLAGGED", questionId, { isMarked: patch.isMarked });
    }
    setAnswers((current) => ({ ...current, [questionId]: next }));
    setSaveState((current) => ({ ...current, [questionId]: "saving" }));
    const payload = { questionId, ...next };
    pending.current[questionId] = payload;
    queues.current[questionId] = (
      queues.current[questionId] || Promise.resolve()
    ).then(
      () => sendAnswer(payload),
      () => sendAnswer(payload),
    );
  }

  const answered = questions.filter(
    (question) => answers[question.id]?.selectedOption,
  ).length;
  const blank = questions.length - answered;
  const marked = questions.filter(
    (question) => answers[question.id]?.isMarked,
  ).length;
  const savingCount = Object.values(saveState).filter(
    (state) => state === "saving",
  ).length;
  const errorCount = Object.values(saveState).filter(
    (state) => state === "error",
  ).length;
  const currentQuestion =
    questions[Math.min(currentIndex, Math.max(questions.length - 1, 0))];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] || {
        selectedOption: null,
        isMarked: false,
        revision: 0,
      }
    : null;
  const currentState = currentQuestion
    ? saveState[currentQuestion.id]
    : undefined;

  function confirmSubmit() {
    const ok = window.confirm(
      `Sınavı bitirmek üzeresin.\n\n${questions.length} soru\n${answered} cevaplı\n${blank} boş\n${marked} işaretli\n\nSınavı teslim ettikten sonra cevaplarını değiştiremezsin.`,
    );
    if (ok) void submit();
  }

  const lockedAnswered = lockedQuestions.filter((question) => answers[question.id]?.selectedOption).length;
  const saveLabel = !online
    ? "Çevrimdışı · kayıtlar bekliyor"
    : errorCount
      ? `${errorCount} kayıt yeniden denenecek`
      : savingCount
        ? `${savingCount} cevap kaydediliyor…`
        : "Tüm cevaplar kaydedildi";
  const lowTime = remaining < 5 * 60_000;
  const nextSession = session ? session.sessions.find((item) => item.status === "UPCOMING") : null;
  const timeOf = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date(iso)) : "";

  /* ── ARA: cevap arayüzü yok; yalnız geri sayım (roadmap §11.4 LGS) ── */
  if (session?.phase === "BREAK") {
    const finished = session.sessions.filter((item) => item.status === "LOCKED");
    return (
      <div className="odk-panel-scope flex min-h-dvh flex-col bg-[#f4f5f4] text-[#14201c]" data-odk-exam-surface>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/10 bg-white px-4">
          <p className="text-[13px] font-semibold text-[#3d4a45]">Deneme Ligi · Oturum arası</p>
          <span className={`text-[12px] ${!online ? "text-[#8a5a00]" : "text-[#5b6863]"}`}>{saveLabel}</span>
        </header>
        <main className="grid flex-1 place-items-center px-4 py-10">
          <section aria-labelledby="ara-baslik" className="w-full max-w-[520px] text-center">
            <p className="text-[14px] font-medium text-[#3d4a45]">
              {finished.map((item) => item.title).join(" ve ")} tamamlandı
            </p>
            <h1 id="ara-baslik" className="mt-2 text-[24px] font-semibold leading-tight">
              {session.currentTitle} {timeOf(session.breakEndsAt)}&apos;da açılır
            </h1>
            <p
              className="mt-6 font-mono text-[56px] font-semibold leading-none tabular-nums"
              aria-label={`Oturumun açılmasına kalan süre ${formatRemaining(breakRemaining)}`}
              role="timer"
            >
              {formatRemaining(breakRemaining)}
            </p>
            <p className="mt-6 text-[14px] leading-6 text-[#3d4a45]">
              {lockedAnswered}/{lockedQuestions.length} soruyu cevapladın; bu cevaplar kilitlendi. Ara bitince{" "}
              {session.currentTitle} oturumu {session.sessions.find((item) => item.key === session.currentKey)?.durationMinutes ?? ""} dakikalık
              yeni süreyle kendiliğinden açılır.
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="odk-panel-scope flex h-dvh flex-col overflow-hidden bg-[#f4f5f4] text-[#14201c]" data-odk-exam-surface>
      <header className="sticky top-0 z-30 shrink-0 border-b border-black/10 bg-white px-3 sm:px-5">
        <div className="mx-auto flex h-14 max-w-[1760px] items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-[#3d4a45] sm:text-[13px]">
              {session ? `Deneme Ligi · ${session.currentTitle} oturumu` : "Deneme Ligi"}
            </p>
            <p className="truncate text-[12px] text-[#5b6863] sm:text-[13px]" aria-live="polite">
              {answered}/{questions.length} cevaplandı · {blank} boş · {marked} işaretli
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={`hidden w-[190px] text-right text-[12px] transition-opacity duration-300 md:inline ${!online || errorCount ? "text-[#8a5a00]" : "text-[#5b6863]"}`}
            >
              {saveLabel}
            </span>
            <div
              className={`min-w-[92px] rounded-md px-3 py-1.5 text-center font-mono text-[18px] font-semibold tabular-nums sm:min-w-[108px] sm:text-[20px] ${lowTime ? "bg-[#fde8e6] text-[#9f1c12]" : "bg-[#eef1ef] text-[#14201c]"}`}
              aria-label={`Kalan süre ${formatRemaining(remaining)}`}
              aria-live="off"
            >
              {formatRemaining(remaining)}
            </div>
            {session && !session.isLast ? (
              <button
                type="button"
                aria-label="Oturumu bitir"
                onClick={() => setClosingSession(true)}
                disabled={sessionBusy}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[#14201c] px-3 text-[13px] font-semibold text-white disabled:opacity-60 sm:px-4"
              >
                {sessionBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} aria-hidden="true" />}
                <span className="hidden sm:inline">Oturumu bitir</span>
              </button>
            ) : (
              <button
                type="button"
                aria-label="Denemeyi teslim et"
                onClick={confirmSubmit}
                disabled={submitting}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[#14201c] px-3 text-[13px] font-semibold text-white disabled:opacity-60 sm:px-4"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} aria-hidden="true" />}
                <span className="hidden sm:inline">Teslim et</span>
              </button>
            )}
          </div>
        </div>
        {!online || errorCount || submitError ? (
          <div
            className="mx-auto mb-2 max-w-[1760px] rounded-md bg-[#fff4d6] px-3 py-2 text-[13px] font-medium text-[#6b4700]"
            role={submitError ? "alert" : "status"}
          >
            {submitError ||
              (!online
                ? "Bağlantı yok. Bekleyen cevaplar internet geri geldiğinde yeniden gönderilecek."
                : `${errorCount} cevap henüz kaydedilemedi. Bağlantını kontrol et.`)}
          </div>
        ) : null}
      </header>

      <nav aria-label="Mobil sınav görünümü" className="grid shrink-0 grid-cols-2 gap-1 border-b border-black/10 bg-white p-1.5 md:hidden">
        <button
          type="button"
          onClick={() => setMobileView("booklet")}
          aria-pressed={mobileView === "booklet"}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-md text-[13px] font-semibold ${mobileView === "booklet" ? "bg-[#14201c] text-white" : "bg-[#eef1ef] text-[#3d4a45]"}`}
        >
          <FileText size={15} aria-hidden="true" /> Kitapçık
        </button>
        <button
          type="button"
          onClick={() => setMobileView("answers")}
          aria-pressed={mobileView === "answers"}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-md text-[13px] font-semibold ${mobileView === "answers" ? "bg-[#14201c] text-white" : "bg-[#eef1ef] text-[#3d4a45]"}`}
        >
          <ListChecks size={15} aria-hidden="true" /> Cevaplar ({answered}/{questions.length})
        </button>
      </nav>

      {/* Masaüstü ≥1280: kitapçık %62 | cevaplar %38 · yatay tablet ≥1024: 50/50 · dikey tablet: kitapçık üstte 60vh · telefon: sekme. */}
      <main className="mx-auto grid min-h-0 w-full max-w-[1760px] flex-1 grid-rows-1 md:grid-rows-[60vh_minmax(0,1fr)] lg:grid-cols-2 lg:grid-rows-1 xl:grid-cols-[62fr_38fr]">
        <section
          aria-label="Deneme kitapçığı"
          className={`${mobileView === "booklet" ? "flex" : "hidden"} min-h-0 flex-col bg-[#e3e7e5] p-2 md:flex lg:border-r lg:border-black/10 lg:p-3`}
        >
          <p className="mb-2 rounded-md bg-white/70 px-3 py-2 text-[12.5px] text-[#3d4a45] md:hidden">
            Kitapçığı kâğıttan çözüyorsan Cevaplar görünümünü kullan.
          </p>
          <iframe
            title="Deneme kitapçığı"
            src={`/api/odk/student/exams/${examId}/booklet#toolbar=1&navpanes=0`}
            className="min-h-[480px] w-full flex-1 rounded-md bg-white md:min-h-0"
          />
          <a
            href={`/api/odk/student/exams/${examId}/booklet`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-md border border-black/15 bg-white text-[13px] font-semibold md:hidden"
          >
            PDF ayrı sekmede aç
          </a>
        </section>

        <aside
          aria-label="Cevap paneli"
          className={`${mobileView === "answers" ? "block" : "hidden"} min-h-0 overflow-y-auto border-t border-black/10 bg-white p-4 md:block lg:border-t-0 lg:p-5`}
        >
          {closingSession && session ? (
            <section aria-labelledby="oturum-bitir-baslik" className="mx-auto max-w-[460px] py-4">
              <h2 id="oturum-bitir-baslik" className="text-[18px] font-semibold">
                {session.currentTitle} oturumunu bitir
              </h2>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Cevaplı", answered],
                  ["Boş", blank],
                  ["İşaretli", marked],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-black/10 py-3">
                    <dt className="text-[12px] text-[#5b6863]">{label}</dt>
                    <dd className="font-mono text-[22px] font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[14px] leading-6 text-[#3d4a45]">
                Oturumu kapattığında bu oturumun cevapları kilitlenir ve değiştirilemez.
                {nextSession ? ` Ardından ara başlar; ${nextSession.title} oturumu aradan sonra kendi süresiyle açılır.` : ""}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void closeSession()}
                  disabled={sessionBusy}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[#14201c] px-4 text-[14px] font-semibold text-white disabled:opacity-60"
                >
                  {sessionBusy ? <Loader2 size={16} className="animate-spin" /> : null}
                  Oturumu kapat
                </button>
                <button
                  type="button"
                  onClick={() => setClosingSession(false)}
                  disabled={sessionBusy}
                  className="inline-flex min-h-11 items-center rounded-md border border-black/15 px-4 text-[14px] font-semibold"
                >
                  Sorulara dön
                </button>
              </div>
            </section>
          ) : (
            <>
              <p
                className={`mb-3 flex min-h-8 items-center gap-2 text-[12.5px] md:hidden ${!online || errorCount ? "text-[#8a5a00]" : "text-[#5b6863]"}`}
              >
                {!online ? <WifiOff size={14} aria-hidden="true" /> : <Wifi size={14} aria-hidden="true" />}
                {saveLabel}
              </p>

              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-[13px] font-semibold text-[#3d4a45]">
                    {session ? `${session.currentTitle} soruları` : "Soru navigatörü"}
                  </h2>
                  <p className="text-[11.5px] text-[#5b6863]">✓ cevaplı · ? işaretli · ● görüldü · - boş</p>
                </div>
                <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10" role="list" aria-label="Soru listesi">
                  {questions.map((question, index) => {
                    const answer = answers[question.id];
                    const selected = index === currentIndex;
                    const symbol = navSymbol(answer, Boolean(visited[question.id]));
                    // Liste öğesi sarmalayıcıdır; `role="listitem"` düğmenin kendisinde
                    // olunca ekran okuyucu ve klavye kullanıcısı onu düğme olarak duymuyordu.
                    return (
                      <div role="listitem" key={question.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentIndex(index);
                            setMobileView("answers");
                          }}
                          aria-current={selected ? "step" : undefined}
                          aria-label={`Soru ${question.questionNumber}, ${
                            symbol === "✓" ? "cevaplandı" : symbol === "?" ? "işaretli" : symbol === "●" ? "görüntülendi" : "boş"
                          }`}
                          className={`relative grid h-11 w-full place-items-center rounded-md border text-[13px] font-semibold tabular-nums ${
                            selected
                              ? "border-[#14201c] bg-[#14201c] text-white"
                              : answer?.isMarked
                                ? "border-[#c98a00] bg-[#fff4d6] text-[#6b4700]"
                                : answer?.selectedOption
                                  ? "border-[#0c7c57] bg-[#e6f4ee] text-[#0a5a40]"
                                  : visited[question.id]
                                    ? "border-[#9aa5a0] bg-[#f4f5f4] text-[#3d4a45]"
                                    : "border-black/15 bg-white text-[#3d4a45]"
                          }`}
                        >
                          <span className="sr-only">{symbol}</span>
                          {question.questionNumber}
                          <span aria-hidden className="absolute bottom-0 right-1 text-[9px] opacity-80">
                            {symbol}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {currentQuestion && currentAnswer ? (
                <article
                  className={`mt-5 rounded-md border p-4 ${currentAnswer.isMarked ? "border-[#c98a00] bg-[#fffaf0]" : "border-black/10 bg-white"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] text-[#5b6863] tabular-nums">
                        {currentIndex + 1}/{questions.length}
                        {currentQuestion.sectionTitle ? ` · ${currentQuestion.sectionTitle}` : ""}
                      </p>
                      <h2 className="mt-0.5 text-[20px] font-semibold">Soru {currentQuestion.questionNumber}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Sabit genişlik: kayıt durumu değişince düzen kaymaz. */}
                      <span
                        className={`w-[92px] text-right text-[12px] transition-opacity duration-300 ${currentState ? "opacity-100" : "opacity-0"} ${currentState === "error" ? "text-[#9f1c12]" : "text-[#5b6863]"}`}
                      >
                        {currentState === "saving"
                          ? "Kaydediliyor…"
                          : currentState === "saved"
                            ? "Kaydedildi"
                            : currentState === "error"
                              ? "Kayıt hatası"
                              : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => save(currentQuestion.id, { isMarked: !currentAnswer.isMarked })}
                        aria-label={currentAnswer.isMarked ? "İşareti kaldır" : "Sonra bakmak için işaretle"}
                        className={`grid h-11 w-11 place-items-center rounded-md border ${currentAnswer.isMarked ? "border-[#c98a00] bg-[#fff4d6] text-[#6b4700]" : "border-black/15 bg-white text-[#5b6863]"}`}
                      >
                        <Bookmark size={17} fill={currentAnswer.isMarked ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-5 gap-2" role="group" aria-label={`Soru ${currentQuestion.questionNumber} seçenekleri`}>
                    {(["A", "B", "C", "D", "E"] as Option[]).map((option) => (
                      <button
                        type="button"
                        key={option}
                        onClick={() => save(currentQuestion.id, { selectedOption: option })}
                        aria-pressed={currentAnswer.selectedOption === option}
                        className={`flex h-14 items-center justify-center rounded-md border text-[17px] font-semibold ${currentAnswer.selectedOption === option ? "border-[#14201c] bg-[#14201c] text-white" : "border-black/15 bg-white text-[#14201c] hover:bg-[#eef1ef]"}`}
                      >
                        {currentAnswer.selectedOption === option ? <Check size={14} className="mr-1" aria-hidden="true" /> : null}
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                      disabled={currentIndex === 0}
                      className="inline-flex min-h-11 items-center gap-1 rounded-md border border-black/15 px-3 text-[13px] font-semibold disabled:opacity-40"
                    >
                      <ChevronLeft size={15} aria-hidden="true" /> Önceki
                    </button>
                    <button
                      type="button"
                      onClick={() => save(currentQuestion.id, { selectedOption: null })}
                      className="min-h-11 px-2 text-[13px] font-medium text-[#5b6863] hover:text-[#14201c]"
                    >
                      Cevabı temizle
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}
                      disabled={currentIndex === questions.length - 1}
                      className="inline-flex min-h-11 items-center gap-1 rounded-md border border-black/15 px-3 text-[13px] font-semibold disabled:opacity-40"
                    >
                      Sonraki <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ) : null}

              {lockedQuestions.length ? (
                <details className="mt-5 rounded-md border border-black/10">
                  <summary className="flex min-h-11 cursor-pointer items-center justify-between px-4 text-[13px] font-semibold text-[#3d4a45]">
                    {session?.sessions.filter((item) => item.status === "LOCKED").map((item) => item.title).join(", ")} cevapların · kilitli
                    <span className="font-normal text-[#5b6863]">
                      {lockedAnswered}/{lockedQuestions.length}
                    </span>
                  </summary>
                  <ul aria-label="Kilitli oturum cevapları" className="grid grid-cols-5 gap-1.5 border-t border-black/10 p-3 sm:grid-cols-8 md:grid-cols-10">
                    {lockedQuestions.map((question) => (
                      <li
                        key={question.id}
                        className="grid h-11 place-items-center rounded-md bg-[#eef1ef] text-[12px] tabular-nums text-[#3d4a45]"
                        aria-label={`Soru ${question.questionNumber}, ${answers[question.id]?.selectedOption ? `cevabın ${answers[question.id]?.selectedOption}` : "boş"}, kilitli`}
                      >
                        <span aria-hidden="true">
                          {question.questionNumber}
                          <span className="ml-0.5 font-semibold">{answers[question.id]?.selectedOption ?? "–"}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
