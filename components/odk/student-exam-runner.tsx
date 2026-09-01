"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check, ChevronLeft, ChevronRight, FileText, ListChecks, Loader2, Send, Wifi, WifiOff } from "lucide-react";

type Option = "A" | "B" | "C" | "D" | "E";
type Answer = { selectedOption: Option | null; isMarked: boolean; revision: number };
type Question = { id: string; questionNumber: number };
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

export function StudentExamRunner({ examId, attemptId, deadlineAt, serverNow, questions, initialAnswers }: { examId: string; attemptId: string; deadlineAt: string; serverNow: string; questions: Question[]; initialAnswers: Record<string, Answer> }) {
  const router = useRouter();
  const clockOffset = useMemo(() => new Date(serverNow).getTime() - Date.now(), [serverNow]);
  const [remaining, setRemaining] = useState(() => new Date(deadlineAt).getTime() - (Date.now() + clockOffset));
  const [answers, setAnswers] = useState<Record<string, Answer>>(initialAnswers);
  const [saveState, setSaveState] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [online, setOnline] = useState(true);
  const [mobileView, setMobileView] = useState<"booklet" | "answers">("booklet");
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
  const eventQueue = useRef<Array<{ type: string; sequence: number; clientOccurredAt: string; questionId?: string | null; metadata?: Record<string, unknown> }>>([]);

  const closeLocally = useCallback(() => { submittedRef.current = true; router.replace(`/panel/odk/ogrenci/denemeler/${examId}`); router.refresh(); }, [examId, router]);

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

  const pushEvent = useCallback((type: string, questionId?: string | null, metadata?: Record<string, unknown>) => {
    eventQueue.current.push({
      type,
      sequence: sequenceRef.current++,
      clientOccurredAt: new Date().toISOString(),
      questionId: questionId || null,
      metadata,
    });
    if (eventQueue.current.length >= 8) void flushEvents();
  }, [flushEvents]);

  const flushTiming = useCallback(async (questionId: string, activeDurationMs: number) => {
    if (activeDurationMs <= 0) return;
    try {
      await fetch(`/api/odk/student/attempts/${attemptId}/timings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timings: [{ questionId, activeDurationMs, leftAt: new Date().toISOString() }] }),
      });
    } catch {
      // best-effort
    }
  }, [attemptId]);

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

  const startQuestionFocus = useCallback((questionId: string) => {
    endQuestionFocus();
    focusQuestionId.current = questionId;
    focusStartedAt.current = Date.now();
    setVisited((current) => ({ ...current, [questionId]: true }));
    pushEvent("QUESTION_OPENED", questionId);
  }, [endQuestionFocus, pushEvent]);

  const sendAnswer = useCallback(async (payload: AnswerPayload) => {
    let response: Response | null = null;
    for (let retry = 0; retry < 3; retry += 1) {
      try {
        response = await fetch(`/api/odk/student/attempts/${attemptId}/answers`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (response.status < 500) break;
      } catch { response = null; }
      await new Promise((resolve) => window.setTimeout(resolve, 400 * 2 ** retry));
    }
    if (!response) { setOnline(false); setSaveState((current) => ({ ...current, [payload.questionId]: "error" })); return; }
    const result = await response.json().catch(() => ({}));
    if (result.answer) setAnswers((current) => current[payload.questionId]?.revision > result.answer.revision ? current : ({ ...current, [payload.questionId]: { selectedOption: result.answer.selectedOption, isMarked: result.answer.isMarked, revision: result.answer.revision } }));
    if (pending.current[payload.questionId]?.revision === payload.revision && (response.ok || result.code === "REVISION_CONFLICT")) delete pending.current[payload.questionId];
    setOnline(response.ok || response.status < 500);
    setSaveState((current) => ({ ...current, [payload.questionId]: response.ok ? "saved" : "error" }));
    if (result.code === "ATTEMPT_CLOSED") closeLocally();
  }, [attemptId, closeLocally]);

  const submit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true; setSubmitting(true); setSubmitError("");
    endQuestionFocus();
    pushEvent(auto ? "AUTO_SUBMITTED" : "EXAM_SUBMITTED");
    await flushEvents();
    await Promise.all(Object.values(queues.current));
    if (!auto && Object.keys(pending.current).length) { submittedRef.current = false; setSubmitting(false); setSubmitError("Kaydedilemeyen cevaplar var. Bağlantınızı kontrol edip tekrar deneyin."); return; }
    try {
      const response = await fetch(`/api/odk/student/attempts/${attemptId}/submit`, { method: "POST" });
      if (!response.ok) {
        submittedRef.current = false;
        setSubmitting(false);
        setSubmitError(auto ? "Süre doldu. Teslim sunucuda doğrulanıyor; bağlantı gelince otomatik yeniden denenecek." : "Teslim işlemi tamamlanamadı. Tekrar deneyin.");
        return;
      }
      closeLocally();
    } catch {
      submittedRef.current = false;
      setSubmitting(false);
      setOnline(false);
      setSubmitError(auto ? "Süre doldu. Bağlantı gelince teslim otomatik yeniden denenecek." : "Bağlantı kurulamadı. Cevapların korunuyor; teslimi tekrar deneyin.");
    }
  }, [attemptId, closeLocally, endQuestionFocus, flushEvents, pushEvent]);

  useEffect(() => {
    pushEvent("EXAM_STARTED");
    const interval = window.setInterval(() => {
      const next = new Date(deadlineAt).getTime() - (Date.now() + clockOffset);
      setRemaining(next);
      if (next <= 0 && !submittedRef.current && Date.now() - lastAutoSubmitAttemptRef.current >= 5_000) {
        lastAutoSubmitAttemptRef.current = Date.now();
        void submit(true);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [clockOffset, deadlineAt, pushEvent, submit]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (!submittedRef.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  useEffect(() => {
    const heartbeat = async () => {
      try {
        const response = await fetch(`/api/odk/student/attempts/${attemptId}/heartbeat`, { method: "POST" });
        const result = await response.json().catch(() => ({}));
        setOnline(response.ok);
        if (result.code === "ATTEMPT_CLOSED") closeLocally();
      } catch { setOnline(false); }
    };
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void heartbeat(); }, 30_000);
    const eventsInterval = window.setInterval(() => { void flushEvents(); }, 8_000);
    return () => { window.clearInterval(interval); window.clearInterval(eventsInterval); };
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
      if (target?.closest?.("[data-odk-exam-surface]")) pushEvent("CONTEXT_MENU", focusQuestionId.current);
    };
    const onOffline = () => { setOnline(false); pushEvent("NETWORK_OFFLINE"); };
    const onOnline = () => {
      setOnline(true);
      pushEvent("NETWORK_ONLINE");
      for (const payload of Object.values(pending.current)) queues.current[payload.questionId] = (queues.current[payload.questionId] || Promise.resolve()).then(() => sendAnswer(payload));
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
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [currentIndex, endQuestionFocus, pushEvent, questions, sendAnswer, startQuestionFocus]);

  useEffect(() => {
    const question = questions[currentIndex];
    if (question) startQuestionFocus(question.id);
  }, [currentIndex, questions, startQuestionFocus]);

  function save(questionId: string, patch: Partial<Answer>) {
    const previous = answers[questionId] || { selectedOption: null, isMarked: false, revision: 0 };
    const next = { ...previous, ...patch, revision: previous.revision + 1 };
    if (patch.selectedOption !== undefined && patch.selectedOption !== previous.selectedOption) {
      pushEvent(previous.selectedOption ? "ANSWER_CHANGED" : "ANSWER_SELECTED", questionId, { selectedOption: patch.selectedOption });
    }
    if (patch.isMarked !== undefined && patch.isMarked !== previous.isMarked) {
      pushEvent("QUESTION_FLAGGED", questionId, { isMarked: patch.isMarked });
    }
    setAnswers((current) => ({ ...current, [questionId]: next })); setSaveState((current) => ({ ...current, [questionId]: "saving" }));
    const payload = { questionId, ...next }; pending.current[questionId] = payload;
    queues.current[questionId] = (queues.current[questionId] || Promise.resolve()).then(() => sendAnswer(payload), () => sendAnswer(payload));
  }

  const answered = questions.filter((question) => answers[question.id]?.selectedOption).length;
  const blank = questions.length - answered;
  const marked = questions.filter((question) => answers[question.id]?.isMarked).length;
  const savingCount = Object.values(saveState).filter((state) => state === "saving").length;
  const errorCount = Object.values(saveState).filter((state) => state === "error").length;
  const currentQuestion = questions[Math.min(currentIndex, Math.max(questions.length - 1, 0))];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || { selectedOption: null, isMarked: false, revision: 0 } : null;
  const currentState = currentQuestion ? saveState[currentQuestion.id] : undefined;

  function confirmSubmit() {
    const ok = window.confirm(`Sınavı bitirmek üzeresin.\n\n${questions.length} soru\n${answered} cevaplı\n${blank} boş\n${marked} işaretli\n\nSınavı teslim ettikten sonra cevaplarını değiştiremezsin.`);
    if (ok) void submit();
  }

  return <div className="odk-panel-scope min-h-dvh bg-[#f5f3ec] text-[var(--site-ink)]" data-odk-exam-surface>
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-5">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-extrabold uppercase tracking-[.09em] text-[var(--brand-olive)] sm:text-xs">Online Deneme</p>
          <p className="mt-0.5 text-[11px] font-bold text-[var(--site-body)] sm:text-sm" aria-live="polite">{answered}/{questions.length} cevaplandı · {blank} boş · {marked} işaretli</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`rounded-xl px-3 py-2 text-base font-black tabular-nums sm:px-4 sm:text-lg ${remaining < 5 * 60_000 ? "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]" : "bg-[var(--panel-nav-active)] text-[var(--site-ink)]"}`} aria-label={`Kalan süre ${formatRemaining(remaining)}`} aria-live="off">{formatRemaining(remaining)}</div>
          <button type="button" aria-label="Denemeyi teslim et" onClick={confirmSubmit} disabled={submitting} className="panel-primary-button bg-[var(--site-ink)] px-3 sm:px-4">{submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}<span className="hidden sm:inline">Teslim et</span></button>
        </div>
      </div>
      {!online || errorCount || submitError ? <div className="mx-auto mt-2 max-w-[1600px] rounded-xl bg-[var(--pd-pastel-yellow-soft)] px-3 py-2 text-xs font-bold text-[var(--pd-pastel-yellow-ink)]" role={submitError ? "alert" : "status"}>{submitError || (!online ? "Bağlantı yok. Bekleyen cevaplar internet geri geldiğinde yeniden gönderilecek." : `${errorCount} cevap henüz kaydedilemedi. Bağlantını kontrol et.`)}</div> : null}
    </header>

    <nav aria-label="Mobil sınav görünümü" className="sticky top-[65px] z-20 grid grid-cols-2 gap-2 border-b border-[var(--site-line)] bg-white p-2 lg:hidden">
      <button type="button" onClick={() => setMobileView("booklet")} aria-pressed={mobileView === "booklet"} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-extrabold ${mobileView === "booklet" ? "bg-[var(--brand-olive)] text-white" : "bg-[var(--site-bg-warm)] text-[var(--site-body)]"}`}><FileText size={15} /> Kitapçık</button>
      <button type="button" onClick={() => setMobileView("answers")} aria-pressed={mobileView === "answers"} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-extrabold ${mobileView === "answers" ? "bg-[var(--brand-olive)] text-white" : "bg-[var(--site-bg-warm)] text-[var(--site-body)]"}`}><ListChecks size={15} /> Cevaplar ({answered}/{questions.length})</button>
    </nav>

    <main className="mx-auto grid min-h-[calc(100dvh-70px)] max-w-[1600px] lg:grid-cols-[minmax(0,1fr)_430px]">
      <section className={`${mobileView === "booklet" ? "block" : "hidden"} min-h-[70dvh] border-r border-black/10 bg-slate-200 p-2 sm:p-4 lg:block`}>
        <iframe title="Deneme kitapçığı" src={`/api/odk/student/exams/${examId}/booklet#toolbar=1&navpanes=0`} className="h-[calc(100dvh-132px)] min-h-[620px] w-full rounded-xl bg-white shadow-sm lg:h-[calc(100dvh-102px)]" />
        <a href={`/api/odk/student/exams/${examId}/booklet`} target="_blank" rel="noreferrer" className="panel-secondary-button mt-2 w-full lg:hidden">PDF ayrı sekmede aç</a>
      </section>

      <aside className={`${mobileView === "answers" ? "block" : "hidden"} bg-white p-4 sm:p-5 lg:block`}>
        <div className={`mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${!online || errorCount ? "bg-[var(--pd-pastel-yellow-soft)] text-[var(--pd-pastel-yellow-ink)]" : "bg-[var(--site-bg-warm)] text-[var(--site-muted)]"}`}>
          {!online ? <WifiOff size={14} /> : <Wifi size={14} />}
          {!online ? "Çevrimdışı · kayıtlar bekliyor" : errorCount ? `${errorCount} kayıt yeniden denenecek` : savingCount ? `${savingCount} cevap kaydediliyor…` : "Tüm cevaplar kaydedildi"}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-[.08em] text-[var(--site-muted)]">Soru navigatörü</h2>
            <span className="text-[10px] text-[var(--site-muted)]" aria-hidden>✓</span>
          </div>
          <p className="mt-1 text-[10px] text-[var(--site-muted)]">✓ cevaplı · ? işaretli · ● görüldü · - boş</p>
          <div className="panel-nav-scroll mt-3 flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible" role="list" aria-label="Soru listesi">
            {questions.map((question, index) => {
              const answer = answers[question.id];
              const selected = index === currentIndex;
              const symbol = navSymbol(answer, Boolean(visited[question.id]));
              return (
                <button
                  type="button"
                  key={question.id}
                  role="listitem"
                  onClick={() => { setCurrentIndex(index); setMobileView("answers"); }}
                  aria-current={selected ? "step" : undefined}
                  aria-label={`Soru ${question.questionNumber}, ${symbol === "✓" ? "cevaplandı" : symbol === "?" ? "işaretli" : symbol === "●" ? "görüntülendi" : "boş"}`}
                  className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-xs font-extrabold ${selected ? "border-[var(--brand-olive)] bg-[var(--brand-olive)] text-white" : answer?.selectedOption ? "border-[var(--brand-olive)] bg-[var(--panel-nav-active)] text-[var(--brand-olive)]" : answer?.isMarked ? "border-amber-400 bg-amber-50 text-amber-900" : visited[question.id] ? "border-slate-400 bg-slate-50 text-slate-700" : "border-[var(--site-line)] bg-white text-[var(--site-body)]"}`}
                >
                  <span className="sr-only">{symbol}</span>
                  {question.questionNumber}
                  <span aria-hidden className="absolute bottom-0.5 right-1 text-[9px] opacity-80">{symbol}</span>
                </button>
              );
            })}
          </div>
        </div>

        {currentQuestion && currentAnswer ? (
          <article className={`mt-5 rounded-2xl border p-4 ${currentAnswer.isMarked ? "border-amber-300 bg-amber-50" : "border-[var(--site-line)] bg-white"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-[var(--brand-olive)]">{currentIndex + 1}/{questions.length}</p>
                <h2 className="mt-1 text-lg font-extrabold">Soru {currentQuestion.questionNumber}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold ${currentState === "error" ? "text-red-700" : "text-[var(--site-muted)]"}`}>{currentState === "saving" ? "Kaydediliyor…" : currentState === "saved" ? "Kaydedildi" : currentState === "error" ? "Kayıt hatası" : ""}</span>
                <button type="button" onClick={() => save(currentQuestion.id, { isMarked: !currentAnswer.isMarked })} aria-label={currentAnswer.isMarked ? "İşareti kaldır" : "Sonra bakmak için işaretle"} className={`grid h-11 w-11 place-items-center rounded-xl ${currentAnswer.isMarked ? "bg-amber-200 text-amber-800" : "bg-slate-100 text-slate-500"}`}><Bookmark size={17} fill={currentAnswer.isMarked ? "currentColor" : "none"} /></button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2" role="group" aria-label={`Soru ${currentQuestion.questionNumber} seçenekleri`}>
              {(["A", "B", "C", "D", "E"] as Option[]).map((option) => (
                <button type="button" key={option} onClick={() => save(currentQuestion.id, { selectedOption: option })} aria-pressed={currentAnswer.selectedOption === option} className={`h-12 rounded-xl text-sm font-black ${currentAnswer.selectedOption === option ? "bg-[var(--brand-olive)] text-white" : "bg-slate-100 text-[var(--site-ink)] hover:bg-slate-200"}`}>
                  {currentAnswer.selectedOption === option ? <Check size={13} className="mr-1 inline" /> : null}{option}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))} disabled={currentIndex === 0} className="panel-secondary-button px-3"><ChevronLeft size={15} /> Önceki</button>
              <button type="button" onClick={() => save(currentQuestion.id, { selectedOption: null })} className="min-h-11 px-2 text-xs font-bold text-[var(--site-muted)]">Cevabı temizle</button>
              <button type="button" onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))} disabled={currentIndex === questions.length - 1} className="panel-secondary-button px-3">Sonraki <ChevronRight size={15} /></button>
            </div>
          </article>
        ) : null}
      </aside>
    </main>
  </div>;
}
