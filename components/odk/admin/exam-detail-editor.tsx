"use client";

import { useState, useTransition } from "react";
import { Check, FileText, Info, Plus, Save, Trash2, Upload } from "lucide-react";
import {
  deleteExam,
  deletePackage,
  importAnswerKeyJson,
  importOutcomesJson,
  saveOfficialAnswers,
  updateExamDetails,
  updateExamFiles,
  updateExamMeetLink,
  type ExamSectionUpdateInput,
} from "@/app/odk/admin/actions";

type Section = {
  id: string;
  title: string;
  questionCount: number;
  orderIndex: number;
  officialAnswers: { questionNumber: number; correctOption: string }[];
};

const OPTIONS = ["A", "B", "C", "D", "E"];
const inputCls = "w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100";
const FAMILIES = [
  { value: "TYT", label: "TYT" },
  { value: "AYT", label: "AYT" },
  { value: "LGS", label: "LGS" },
  { value: "KPSS", label: "KPSS" },
  { value: "ALES", label: "ALES" },
];

function toDateTimeLocal(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function ExamDetailsEditor({
  exam,
}: {
  exam: {
    id: string;
    title: string;
    cadenceFamily: string;
    durationMinutes: number;
    startsAt: Date | string | null;
    endsAt: Date | string | null;
    attemptsCount: number;
    sections: Section[];
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(exam.title);
  const [cadenceFamily, setCadenceFamily] = useState(exam.cadenceFamily);
  const [durationMinutes, setDurationMinutes] = useState(exam.durationMinutes);
  const [startsAt, setStartsAt] = useState(toDateTimeLocal(exam.startsAt));
  const [endsAt, setEndsAt] = useState(toDateTimeLocal(exam.endsAt));
  const [sections, setSections] = useState<ExamSectionUpdateInput[]>(
    exam.sections.map((section) => ({
      id: section.id,
      title: section.title,
      questionCount: section.questionCount,
    })),
  );

  const hasAttempts = exam.attemptsCount > 0;
  const updateSection = (index: number, field: keyof ExamSectionUpdateInput, value: string | number) => {
    setSections((prev) => prev.map((section, sectionIndex) => (sectionIndex === index ? { ...section, [field]: value } : section)));
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (!title.trim()) {
      setError("Sınav başlığı zorunludur.");
      return;
    }
    if (sections.length === 0) {
      setError("En az bir bölüm ekleyin.");
      return;
    }
    if (sections.some((section) => !section.title.trim() || !Number.isInteger(Number(section.questionCount)) || Number(section.questionCount) < 1)) {
      setError("Tüm bölümlerin başlığı ve soru sayısı dolu olmalıdır.");
      return;
    }

    startTransition(async () => {
      try {
        await updateExamDetails(exam.id, {
          title: title.trim(),
          cadenceFamily,
          durationMinutes: Number(durationMinutes),
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
          sections: sections.map((section) => ({
            ...section,
            title: section.title.trim(),
            questionCount: Number(section.questionCount),
          })),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sınav bilgileri kaydedilemedi.");
      }
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {error && <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {hasAttempts && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Bu sınava katılım başladığı için bölüm silme ve soru sayısı azaltma engellenir. Başlık, süre, tarih ve bölüm adları düzenlenebilir.
        </div>
      )}

      <label className="block text-sm font-medium text-stone-700">
        Sınav Başlığı <span className="text-red-400">*</span>
        <input
          type="text"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={`mt-1.5 ${inputCls}`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-700">
          Sınav Ailesi <span className="text-red-400">*</span>
          <select
            value={cadenceFamily}
            onChange={(event) => setCadenceFamily(event.target.value)}
            className={`mt-1.5 ${inputCls}`}
          >
            {FAMILIES.map((family) => (
              <option key={family.value} value={family.value}>{family.label}</option>
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
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
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
            onChange={(event) => setStartsAt(event.target.value)}
            className={`mt-1.5 ${inputCls}`}
          />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Bitiş Tarihi
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className={`mt-1.5 ${inputCls}`}
          />
        </label>
      </div>

      <div className="space-y-3 border-t border-stone-100 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-stone-900">Bölümler</h3>
          <button
            type="button"
            onClick={() => setSections((prev) => [...prev, { title: "", questionCount: 20 }])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-emerald-300 hover:text-emerald-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Bölüm Ekle
          </button>
        </div>

        {sections.map((section, index) => (
          <div key={section.id ?? `new-${index}`} className="flex flex-col gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 sm:flex-row sm:items-center">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 shrink-0">
              {index + 1}
            </span>
            <input
              type="text"
              value={section.title}
              onChange={(event) => updateSection(index, "title", event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
              placeholder="Bölüm adı"
            />
            <div className="flex items-center gap-2 sm:shrink-0">
              <input
                type="number"
                min={1}
                max={200}
                value={section.questionCount}
                onChange={(event) => updateSection(index, "questionCount", Number(event.target.value))}
                className="w-24 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-center text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
              />
              <span className="text-xs text-stone-400">soru</span>
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSections((prev) => prev.filter((_, sectionIndex) => sectionIndex !== index))}
                  className="rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-500 transition"
                  aria-label="Bölümü sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Kaydedildi
          </span>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Kaydediliyor..." : "Sınav Bilgilerini Kaydet"}
        </button>
      </div>
    </form>
  );
}

export function ExamMeetLinkEditor({ examId, currentLink }: { examId: string; currentLink: string }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState(currentLink);

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateExamMeetLink(examId, link || null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google Meet linki kaydedilemedi.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-stone-700">
        Google Meet Linki
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className={`mt-1.5 ${inputCls}`}
          placeholder="https://meet.google.com/xxx-yyyy-zzz"
        />
      </label>
      <p className="text-xs text-stone-400">
        Öğrenciler sınava başlamadan önce bu linke katılıp kamera açmak zorunda kalacak.
        Boş bırakırsanız zorunluluk olmaz.
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
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

export function AnswerKeyEditor({ section }: { section: Section }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial: Record<number, string> = {};
  section.officialAnswers.forEach((a) => { initial[a.questionNumber] = a.correctOption; });
  const [answers, setAnswers] = useState<Record<number, string>>(initial);

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await saveOfficialAnswers(section.id, answers);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cevap anahtarı kaydedilemedi.");
      }
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

      {error && <p className="text-xs text-red-500">{error}</p>}
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

function PdfFileUploader({
  examId,
  fileType,
  label,
  currentUrl,
}: {
  examId: string;
  fileType: "BOOKLET_PDF" | "ANSWER_KEY_PDF";
  label: string;
  currentUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState(currentUrl);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fileType", fileType);
      const res = await fetch(`/api/odk/admin/exams/${examId}/upload-file`, { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Yükleme başarısız");
      }
      const { url: uploaded } = (await res.json()) as { url: string };
      setUrl(uploaded);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUrlSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateExamFiles(examId, fileType === "BOOKLET_PDF" ? { bookletUrl: url || undefined } : { answerKeyUrl: url || undefined });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "PDF URL'i kaydedilemedi.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-stone-700">{label}</p>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:underline">
          <FileText className="h-3.5 w-3.5" />
          Mevcut PDF'i görüntüle
        </a>
      )}
      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:border-emerald-300 hover:text-emerald-700 transition">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Yükleniyor..." : "PDF Yükle"}
          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
        <span className="text-xs text-stone-400">veya URL gir:</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          placeholder="https://..."
        />
        <button
          type="button"
          onClick={handleUrlSave}
          disabled={isPending || uploading}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          <Save className="h-3 w-3" />
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {saved && <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Kaydedildi</p>}
    </div>
  );
}

const ANSWER_KEY_JSON_FORMAT = `// Bölüm adı → { soru_no: cevap } şeklinde
{
  "Türkçe": { "1": "A", "2": "C", "3": "B" },
  "Matematik": { "1": "D", "2": "A" }
}`;

const OUTCOMES_JSON_FORMAT = `// Bölüm adı → { soru_no: { konu, kazanim, altKazanim? } }
{
  "Türkçe": {
    "1": { "konu": "Sözcükte Anlam", "kazanim": "Kelime anlamını bağlamda kavrar" },
    "2": { "konu": "Dil Bilgisi", "kazanim": "Fiil çekimlerini ayırt eder", "altKazanim": "Zaman ekleri" }
  },
  "Matematik": {
    "1": { "konu": "Sayılar", "kazanim": "Tam sayılarda işlem yapar" }
  }
}`;

function JsonImporter({
  title,
  description,
  formatExample,
  onImport,
}: {
  title: string;
  description: string;
  formatExample: string;
  onImport: (json: Record<string, Record<string, unknown>>) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [showFormat, setShowFormat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleImport = () => {
    setError(null);
    let parsed: Record<string, Record<string, unknown>>;
    try {
      const cleaned = text.replace(/\/\/.*$/gm, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      setError("Geçersiz JSON formatı.");
      return;
    }
    startTransition(async () => {
      try {
        await onImport(parsed);
        setSaved(true);
        setText("");
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "İçe aktarma başarısız");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-stone-700">{title}</p>
          <p className="text-xs text-stone-400 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowFormat((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-emerald-600 shrink-0"
        >
          <Info className="h-3.5 w-3.5" />
          {showFormat ? "Formatı Gizle" : "JSON Formatı"}
        </button>
      </div>
      {showFormat && (
        <pre className="rounded-lg bg-stone-900 p-4 text-xs text-stone-200 overflow-auto whitespace-pre-wrap">{formatExample}</pre>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-mono outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        placeholder="JSON yapıştırın..."
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {saved && <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" /> İçe aktarıldı</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleImport}
          disabled={isPending || !text.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          {isPending ? "İçe Aktarılıyor..." : "JSON'dan İçe Aktar"}
        </button>
      </div>
    </div>
  );
}

export function AnswerKeyJsonImporter({ examId }: { examId: string }) {
  return (
    <JsonImporter
      title="Cevap Anahtarı JSON İçe Aktarma"
      description="JSON'dan toplu cevap anahtarı yükleyin. Mevcut cevapların üzerine yazar."
      formatExample={ANSWER_KEY_JSON_FORMAT}
      onImport={(json) => importAnswerKeyJson(examId, json as Record<string, Record<string, string>>)}
    />
  );
}

export function OutcomesJsonImporter({ examId }: { examId: string }) {
  return (
    <JsonImporter
      title="Kazanım JSON İçe Aktarma"
      description="Her soru için konu ve kazanım bilgisini JSON olarak yükleyin."
      formatExample={OUTCOMES_JSON_FORMAT}
      onImport={(json) => importOutcomesJson(examId, json as Record<string, Record<string, { konu: string; kazanim: string; altKazanim?: string }>>)}
    />
  );
}

export function ExamFilesEditor({ examId, bookletUrl, answerKeyUrl }: {
  examId: string;
  bookletUrl: string;
  answerKeyUrl: string;
}) {
  return (
    <div className="space-y-5">
      <PdfFileUploader examId={examId} fileType="BOOKLET_PDF" label="Soru Kitapçığı PDF" currentUrl={bookletUrl} />
      <PdfFileUploader examId={examId} fileType="ANSWER_KEY_PDF" label="Cevap Anahtarı PDF" currentUrl={answerKeyUrl} />
    </div>
  );
}

function DeleteButton({
  label,
  confirmMessage,
  onDelete,
}: {
  label: string;
  confirmMessage: string;
  onDelete: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      try {
        await onDelete();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Silme işlemi başarısız");
      }
    });
  };

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition"
      >
        {isPending ? "Siliniyor..." : label}
      </button>
    </div>
  );
}

export function DeleteExamButton({ examId }: { examId: string }) {
  return (
    <DeleteButton
      label="Sınavı Sil"
      confirmMessage="Bu sınavı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      onDelete={() => deleteExam(examId)}
    />
  );
}

export function DeletePackageButton({ packageId }: { packageId: string }) {
  return (
    <DeleteButton
      label="Paketi Sil"
      confirmMessage="Bu paketi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      onDelete={() => deletePackage(packageId)}
    />
  );
}
