"use client";

import { useState, useTransition } from "react";
import { startExam, submitAttempt } from "@/app/odk/panel/actions";

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
  attemptId: string | null;
  sections: Section[];
  durationMinutes: number;
};

const OPTIONS = ["A", "B", "C", "D", "E"];

export function ExamAttemptForm({ examId, attemptId, sections, durationMinutes }: Props) {
  // Per-section answer state: sectionId → { qNum → option }
  const [answers, setAnswers] = useState<Record<string, Record<number, string>>>(() => {
    const init: Record<string, Record<number, string>> = {};
    for (const sec of sections) {
      init[sec.id] = { ...sec.existingAnswers };
    }
    return init;
  });

  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const totalAnswered = Object.values(answers).reduce(
    (sum, secAnswers) => sum + Object.keys(secAnswers).length,
    0,
  );
  const totalQuestions = sections.reduce((s, sec) => s + sec.questionCount, 0);

  function setAnswer(sectionId: string, qNum: number, option: string) {
    setAnswers((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [qNum]: option,
      },
    }));
  }

  function clearAnswer(sectionId: string, qNum: number) {
    setAnswers((prev) => {
      const updated = { ...prev[sectionId] };
      delete updated[qNum];
      return { ...prev, [sectionId]: updated };
    });
  }

  if (!attemptId) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => { await startExam(examId); })}
        className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
      >
        {pending ? "Başlatılıyor..." : "Sınava Başla"}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-5 py-3">
        <p className="text-sm text-stone-600">
          <span className="font-semibold text-stone-900">{totalAnswered}</span> / {totalQuestions} soru işaretlendi
        </p>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      {sections.map((sec) => (
        <div key={sec.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <div className="border-b border-stone-100 px-5 py-3.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900">{sec.title}</h3>
            <span className="text-xs text-stone-400">{sec.questionCount} soru</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: sec.questionCount }, (_, i) => i + 1).map((qNum) => {
                const selected = answers[sec.id]?.[qNum];
                return (
                  <div key={qNum} className="flex items-center gap-2">
                    <span className="w-6 text-right text-xs font-mono text-stone-400">{qNum}</span>
                    <div className="flex gap-1">
                      {OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            selected === opt ? clearAnswer(sec.id, qNum) : setAnswer(sec.id, qNum, opt)
                          }
                          className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition ${
                            selected === opt
                              ? "bg-emerald-600 text-white"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Submit */}
      {submitError && (
        <p className="text-sm text-red-600">{submitError}</p>
      )}

      {!confirmOpen ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
        >
          Cevapları Gönder
        </button>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900">
            Emin misin? Gönderildikten sonra cevaplarını değiştiremezsin.
            {totalAnswered < totalQuestions && (
              <span className="text-amber-700"> ({totalQuestions - totalAnswered} soru boş kalacak.)</span>
            )}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setSubmitError(null);
                startTransition(async () => {
                  try {
                    await submitAttempt(attemptId, answers);
                  } catch {
                    setSubmitError("Bir hata oluştu. Tekrar dene.");
                  }
                });
              }}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              {pending ? "Gönderiliyor..." : "Evet, Gönder"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-lg border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              Geri Dön
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
