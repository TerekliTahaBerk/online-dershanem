"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createExam, type SectionInput } from "@/app/odk/admin/actions";

const FAMILIES = [
  { value: "TYT", label: "TYT" },
  { value: "AYT", label: "AYT" },
  { value: "LGS", label: "LGS" },
  { value: "KPSS", label: "KPSS" },
  { value: "ALES", label: "ALES" },
];

export function ExamCreateForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [cadenceFamily, setCadenceFamily] = useState("TYT");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [sections, setSections] = useState<SectionInput[]>([
    { title: "Türkçe", questionCount: 40 },
    { title: "Matematik", questionCount: 40 },
  ]);

  const addSection = () => setSections((prev) => [...prev, { title: "", questionCount: 20 }]);
  const removeSection = (i: number) => setSections((prev) => prev.filter((_, idx) => idx !== i));
  const updateSection = (i: number, field: keyof SectionInput, value: string | number) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError("Sınav başlığı zorunludur."); return; }
    if (sections.length === 0) { setError("En az bir bölüm ekleyin."); return; }
    if (sections.some((s) => !s.title.trim() || s.questionCount < 1)) {
      setError("Tüm bölümlerin başlığı ve soru sayısı dolu olmalıdır.");
      return;
    }

    startTransition(async () => {
      try {
        await createExam({ title: title.trim(), cadenceFamily, durationMinutes, startsAt: startsAt || undefined, endsAt: endsAt || undefined, sections });
      } catch {
        setError("Sınav oluşturulamadı. Lütfen tekrar deneyin.");
      }
    });
  };

  const inputCls = "w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Basic info */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-900">Temel Bilgiler</h2>

        <label className="block text-sm font-medium text-stone-700">
          Sınav Başlığı <span className="text-red-400">*</span>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`mt-1.5 ${inputCls}`}
            placeholder="TYT Deneme 1 — Nisan 2025"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-stone-700">
            Sınav Ailesi <span className="text-red-400">*</span>
            <select
              value={cadenceFamily}
              onChange={(e) => setCadenceFamily(e.target.value)}
              className={`mt-1.5 ${inputCls}`}
            >
              {FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Süre (dakika) <span className="text-red-400">*</span>
            <input
              type="number"
              required
              min={10}
              max={360}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className={`mt-1.5 ${inputCls}`}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-stone-700">
            Başlangıç Tarihi
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={`mt-1.5 ${inputCls}`}
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Bitiş Tarihi
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={`mt-1.5 ${inputCls}`}
            />
          </label>
        </div>
      </div>

      {/* Sections */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">
            Bölümler
            <span className="ml-2 text-xs font-normal text-stone-400">({sections.length} bölüm)</span>
          </h2>
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-emerald-300 hover:text-emerald-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Bölüm Ekle
          </button>
        </div>

        <div className="space-y-3">
          {sections.map((section, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 shrink-0">
                {i + 1}
              </span>
              <input
                type="text"
                placeholder="Bölüm adı (örn. Türkçe)"
                value={section.title}
                onChange={(e) => updateSection(i, "title", e.target.value)}
                className="flex-1 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
              />
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={section.questionCount}
                  onChange={(e) => updateSection(i, "questionCount", Number(e.target.value))}
                  className="w-20 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm text-center outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                />
                <span className="text-xs text-stone-400 whitespace-nowrap">soru</span>
              </div>
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSection(i)}
                  className="text-stone-400 hover:text-red-500 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-stone-50 border border-stone-100 px-4 py-2.5">
          <p className="text-xs text-stone-500">
            Toplam: <strong className="text-stone-700">{sections.reduce((s, b) => s + b.questionCount, 0)} soru</strong>
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Oluşturuluyor..." : "Sınav Oluştur"}
        </button>
      </div>
    </form>
  );
}
