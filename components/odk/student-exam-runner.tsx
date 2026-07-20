"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check, Loader2, Send, Wifi } from "lucide-react";

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

export function StudentExamRunner({ examId, attemptId, deadlineAt, serverNow, questions, initialAnswers }: { examId: string; attemptId: string; deadlineAt: string; serverNow: string; questions: Question[]; initialAnswers: Record<string, Answer> }) {
  const router = useRouter();
  const clockOffset = useMemo(() => new Date(serverNow).getTime() - Date.now(), [serverNow]);
  const [remaining, setRemaining] = useState(() => new Date(deadlineAt).getTime() - (Date.now() + clockOffset));
  const [answers, setAnswers] = useState<Record<string, Answer>>(initialAnswers);
  const [saveState, setSaveState] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [online, setOnline] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const queues = useRef<Record<string, Promise<void>>>({});
  const pending = useRef<Record<string, AnswerPayload>>({});

  const closeLocally = useCallback(() => { submittedRef.current = true; router.replace(`/panel/odk/ogrenci/denemeler/${examId}`); router.refresh(); }, [examId, router]);

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
    await Promise.all(Object.values(queues.current));
    if (!auto && Object.keys(pending.current).length) { submittedRef.current = false; setSubmitting(false); setSubmitError("Kaydedilemeyen cevaplar var. Bağlantınızı kontrol edip tekrar deneyin."); return; }
    const response = await fetch(`/api/odk/student/attempts/${attemptId}/submit`, { method: "POST" });
    if (!response.ok && !auto) { submittedRef.current = false; setSubmitting(false); setSubmitError("Teslim işlemi tamamlanamadı. Tekrar deneyin."); return; }
    closeLocally();
  }, [attemptId, closeLocally]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = new Date(deadlineAt).getTime() - (Date.now() + clockOffset);
      setRemaining(next);
      if (next <= 0) { window.clearInterval(interval); void submit(true); }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [clockOffset, deadlineAt, submit]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (!submittedRef.current) event.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, []);
  useEffect(() => {
    const heartbeat = async () => { try { const response = await fetch(`/api/odk/student/attempts/${attemptId}/heartbeat`, { method: "POST" }); const result = await response.json().catch(() => ({})); setOnline(response.ok); if (result.code === "ATTEMPT_CLOSED") closeLocally(); } catch { setOnline(false); } };
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void heartbeat(); }, 30_000);
    return () => window.clearInterval(interval);
  }, [attemptId, closeLocally]);
  useEffect(() => {
    const flush = () => { setOnline(true); for (const payload of Object.values(pending.current)) queues.current[payload.questionId] = (queues.current[payload.questionId] || Promise.resolve()).then(() => sendAnswer(payload)); };
    const offline = () => setOnline(false);
    window.addEventListener("online", flush); window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", flush); window.removeEventListener("offline", offline); };
  }, [sendAnswer]);

  function save(questionId: string, patch: Partial<Answer>) {
    const previous = answers[questionId] || { selectedOption: null, isMarked: false, revision: 0 };
    const next = { ...previous, ...patch, revision: previous.revision + 1 };
    setAnswers((current) => ({ ...current, [questionId]: next })); setSaveState((current) => ({ ...current, [questionId]: "saving" }));
    const payload = { questionId, ...next }; pending.current[questionId] = payload;
    queues.current[questionId] = (queues.current[questionId] || Promise.resolve()).then(() => sendAnswer(payload), () => sendAnswer(payload));
  }

  const answered = questions.filter((question) => answers[question.id]?.selectedOption).length;
  const marked = questions.filter((question) => answers[question.id]?.isMarked).length;
  return <div className="min-h-screen bg-[#f5f3ec]">
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <div><p className="text-xs font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]">Canlı matematik denemesi</p><p className="mt-1 text-sm font-bold text-[var(--site-ink)]">{answered}/{questions.length} cevaplandı · {marked} işaretli</p>{!online ? <p role="status" className="mt-1 text-xs font-bold text-amber-700">Bağlantı yok · cevaplar yeniden denenecek</p> : null}{submitError ? <p role="alert" className="mt-1 text-xs font-bold text-red-700">{submitError}</p> : null}</div>
      <div className={`rounded-xl px-4 py-2 text-lg font-black tabular-nums ${remaining < 5 * 60_000 ? "bg-red-50 text-red-700" : "bg-[var(--panel-nav-active)] text-[var(--site-ink)]"}`} aria-live="polite">{formatRemaining(remaining)}</div>
      <button type="button" onClick={() => { if (window.confirm(`${questions.length - answered} boş cevabın var. Denemeyi teslim etmek istiyor musun?`)) void submit(); }} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-[var(--site-ink)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Teslim et</button>
    </header>
    <main className="grid min-h-[calc(100vh-74px)] lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-h-[60vh] border-r border-black/10 bg-slate-200 p-2 sm:p-4"><iframe title="Deneme kitapçığı" src={`/api/odk/student/exams/${examId}/booklet#toolbar=1&navpanes=0`} className="h-[calc(100vh-110px)] w-full rounded-xl bg-white shadow-sm" /></section>
      <aside className="bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold text-[var(--site-muted)]"><Wifi size={14} /> Her seçim otomatik kaydedilir</div>
        <div className="space-y-3">{questions.map((question) => { const answer = answers[question.id] || { selectedOption: null, isMarked: false, revision: 0 }; const state = saveState[question.id]; return <article key={question.id} className={`rounded-2xl border p-3 ${answer.isMarked ? "border-amber-300 bg-amber-50" : "border-[var(--site-border)]"}`}>
          <div className="flex items-center justify-between"><span className="font-extrabold text-[var(--site-ink)]">Soru {question.questionNumber}</span><div className="flex items-center gap-2"><span className={`text-[11px] font-bold ${state === "error" ? "text-red-600" : "text-[var(--site-muted)]"}`}>{state === "saving" ? "Kaydediliyor…" : state === "saved" ? "Kaydedildi" : state === "error" ? "Kayıt hatası" : ""}</span><button type="button" onClick={() => save(question.id, { isMarked: !answer.isMarked })} aria-label={answer.isMarked ? "İşareti kaldır" : "Sonra bakmak için işaretle"} className={`grid h-8 w-8 place-items-center rounded-lg ${answer.isMarked ? "bg-amber-200 text-amber-800" : "bg-slate-100 text-slate-500"}`}><Bookmark size={15} fill={answer.isMarked ? "currentColor" : "none"} /></button></div></div>
          <div className="mt-3 grid grid-cols-6 gap-2">{(["A", "B", "C", "D", "E"] as Option[]).map((option) => <button type="button" key={option} onClick={() => save(question.id, { selectedOption: option })} aria-pressed={answer.selectedOption === option} className={`h-10 rounded-xl text-sm font-black ${answer.selectedOption === option ? "bg-[var(--brand-olive)] text-white" : "bg-slate-100 text-[var(--site-ink)] hover:bg-slate-200"}`}>{answer.selectedOption === option && <Check size={13} className="mr-1 inline" />}{option}</button>)}<button type="button" onClick={() => save(question.id, { selectedOption: null })} className="h-10 rounded-xl bg-white text-xs font-bold text-[var(--site-muted)] ring-1 ring-inset ring-slate-200">Temizle</button></div>
        </article>; })}</div>
      </aside>
    </main>
  </div>;
}
