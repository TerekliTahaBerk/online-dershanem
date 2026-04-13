"use client";

import { useState, useTransition } from "react";
import { Check, Save } from "lucide-react";
import { saveOfficialAnswers, updateExamFiles } from "@/app/odk/admin/actions";

type Section = {
  id: string;
  title: string;
  questionCount: number;
  orderIndex: number;
  officialAnswers: { questionNumber: number; correctOption: string }[];
};

const OPTIONS = ["A", "B", "C", "D", "E"];
const inputCls = "w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100";

export function AnswerKeyEditor({ section }: { section: Section }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const initial: Record<number, string> = {};
  section.officialAnswers.forEach((a) => { initial[a.questionNumber] = a.correctOption; });
  const [answers, setAnswers] = useState<Record<number, string>>(initial);

  const handleSave = () => {
    startTransition(async () => {
      await saveOfficialAnswers(section.id, answers);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}>
        {Array.from({ length: section.questionCount }, (_, i) => i + 1).map((num) => (
          <div key={num} className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-stone-500">{num}</span>
            <select
              value={answers[num] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [num]: e.target.value }))}
              className="w-full rounded-md border border-stone-200 bg-stone-50 py-1 text-center text-xs font-bold text-stone-900 outline-none focus:border-emerald-400"
            >
              <option value="">—</option>
              {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Check className="h-3.5 w-3.5" /> Kaydedildi
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

export function ExamFilesEditor({ examId, bookletUrl, answerKeyUrl }: {
  examId: string;
  bookletUrl: string;
  answerKeyUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [booklet, setBooklet] = useState(bookletUrl);
  const [answerKey, setAnswerKey] = useState(answerKeyUrl);

  const handleSave = () => {
    startTransition(async () => {
      await updateExamFiles(examId, {
        bookletUrl: booklet || undefined,
        answerKeyUrl: answerKey || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-stone-700">
        Kitapçık PDF URL
        <input
          type="url"
          value={booklet}
          onChange={(e) => setBooklet(e.target.value)}
          className={`mt-1.5 ${inputCls}`}
          placeholder="https://..."
        />
      </label>
      <label className="block text-sm font-medium text-stone-700">
        Cevap Anahtarı PDF URL
        <input
          type="url"
          value={answerKey}
          onChange={(e) => setAnswerKey(e.target.value)}
          className={`mt-1.5 ${inputCls}`}
          placeholder="https://..."
        />
      </label>
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Check className="h-3.5 w-3.5" /> Kaydedildi
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
