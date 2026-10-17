"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, TableProperties } from "lucide-react";
import { parseAnswerKeyTable, parseOutcomeTable, type TableIssue } from "@/lib/odk/table-import";

type Kind = "answer-key" | "outcomes";
type Format = "table" | "json";
type ServerIssue = { level: "error" | "warning"; code: string; message: string; sectionCode?: string; questionNumber?: number; outcomeCode?: string };

const PLACEHOLDER: Record<Kind, Record<Format, string>> = {
  "answer-key": {
    table: "Excel/Sheets'ten yapıştırın ya da yazın:\nBölüm\tSoru\tCevap\nTURKCE\t1\tA\nMAT\t1\tC\n\nOptik satır da olur:\nTURKCE: ABCDE ABCDE …\nMAT: CDEAB-…  (- boş)",
    json: '{"schemaVersion":"1.0","examType":"TYT","sections":[{"code":"TURKCE","answers":{"1":"A"}}]}',
  },
  outcomes: {
    table: "Bölüm;Soru;Kazanım kodu;Tür (ana/yan)\nMAT;1;TYT.MAT.01\nMAT;1;TYT.MAT.07;yan",
    json: '{"schemaVersion":"1.0","questions":[{"section":"MAT","question":1,"outcomes":[{"code":"TYT.MAT.01"}]}]}',
  },
};

/**
 * Cevap anahtarı / kazanım içe aktarma (Faz 4 / P1-10): tablo yapıştırma (CSV,
 * TSV, Excel), dosya (.csv/.tsv/.txt/.json) ya da JSON. Tablo önce tarayıcıda
 * satır numaralı hatalarla ayrıştırılır; geçerli belge sunucu önizlemesine
 * gider, önizleme soruya bağlantılı sorunları gösterir, onaylanınca yazılır.
 */
export function AdminJsonImportPanel({ examId, sections = [], bookletCodes = ["A"] }: { examId: string; sections?: Array<{ code: string; title: string }>; bookletCodes?: string[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("answer-key");
  const [format, setFormat] = useState<Format>("table");
  // Çoklu kitapçık: cevap anahtarı hangi kitapçığın numarasıyla girildi (sunucu kanonik A'ya çevirir).
  const [bookletCode, setBookletCode] = useState("A");
  const [payload, setPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [parseIssues, setParseIssues] = useState<TableIssue[]>([]);
  const [serverIssues, setServerIssues] = useState<ServerIssue[]>([]);

  function reset() {
    setError(null);
    setSummary(null);
    setImportId(null);
    setReady(false);
    setParseIssues([]);
    setServerIssues([]);
  }

  function buildDocument(): unknown | null {
    if (format === "json") {
      try {
        return JSON.parse(payload);
      } catch {
        setError("Geçerli bir JSON yapıştırın.");
        return null;
      }
    }
    const parsed = kind === "answer-key" ? parseAnswerKeyTable(payload, sections) : parseOutcomeTable(payload, sections);
    if (!parsed.document) {
      setParseIssues(parsed.issues);
      setError(`${parsed.issues.length} satırda sorun var; düzeltip yeniden önizleyin.`);
      return null;
    }
    return parsed.document;
  }

  async function preview() {
    reset();
    const document = buildDocument();
    if (!document) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/odk/admin/exams/${examId}/imports/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload: document, ...(kind === "answer-key" && bookletCodes.length > 1 ? { bookletCode } : {}) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Önizleme şu an tamamlanamadı. Lütfen tekrar dener misiniz?");
        return;
      }
      setImportId(result.importId);
      setSummary(result.summary?.message || "Önizleme hazır.");
      setServerIssues(Array.isArray(result.issues) ? result.issues : []);
      setReady(Boolean(result.summary?.ready));
    } catch {
      setError("Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar dener misiniz?");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!importId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/odk/admin/exams/${examId}/imports/${kind}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ importId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.code === "IMPORT_STALE" ? "Önizlemeden sonra deneme değişti. Yeniden önizleyin." : result.error || "Kayıt şu an tamamlanamadı. Lütfen tekrar dener misiniz?");
        if (result.code === "IMPORT_STALE") setImportId(null);
        return;
      }
      setSummary(`Kaydedildi · ${result.count} soru${result.idempotent ? " (zaten kayıtlıydı)" : ""}.`);
      setImportId(null);
      setReady(false);
      setServerIssues([]);
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar dener misiniz?");
    } finally {
      setBusy(false);
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    reset();
    const text = await file.text();
    setFormat(file.name.toLowerCase().endsWith(".json") ? "json" : "table");
    setPayload(text);
  }

  const questionHref = (issue: ServerIssue) =>
    issue.sectionCode && issue.questionNumber
      ? `/panel/odk/yonetim/sinavlar/${examId}?sekme=sorular&bolum=${encodeURIComponent(issue.sectionCode)}#soru-${issue.sectionCode}-${issue.questionNumber}`
      : null;
  const errors = serverIssues.filter((issue) => issue.level === "error");
  const warnings = serverIssues.filter((issue) => issue.level === "warning");
  const pill = (active: boolean) =>
    `inline-flex min-h-9 items-center rounded-md border px-3 text-[13px] font-semibold ${active ? "border-pn-text bg-pn-text text-white" : "border-pn-border text-pn-text-secondary hover:bg-pn-hover"}`;

  return (
    <section aria-labelledby="ice-aktarma-baslik" className="rounded-[10px] border border-pn-border bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <TableProperties size={18} aria-hidden="true" className="mt-0.5 text-pn-text-muted" />
        <div>
          <h2 id="ice-aktarma-baslik" className="text-[15px] font-semibold text-pn-text">
            Cevap anahtarı ve kazanım içe aktarma
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-pn-text-muted">
            Excel/Sheets&apos;ten kopyalayıp yapıştırın, CSV/TSV dosyası seçin ya da JSON kullanın. Önce önizlenir; hata yoksa onaylayınca yazılır.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="İçe aktarma türü">
        <button type="button" aria-pressed={kind === "answer-key"} className={pill(kind === "answer-key")} onClick={() => { setKind("answer-key"); reset(); }}>
          Cevap anahtarı
        </button>
        <button type="button" aria-pressed={kind === "outcomes"} className={pill(kind === "outcomes")} onClick={() => { setKind("outcomes"); reset(); }}>
          Kazanımlar
        </button>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-pn-border" />
        <button type="button" aria-pressed={format === "table"} className={pill(format === "table")} onClick={() => { setFormat("table"); reset(); }}>
          Tablo / CSV
        </button>
        <button type="button" aria-pressed={format === "json"} className={pill(format === "json")} onClick={() => { setFormat("json"); reset(); }}>
          JSON
        </button>
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-pn-border px-3 text-[13px] font-semibold text-pn-text-secondary hover:bg-pn-hover">
          <FileUp size={14} aria-hidden="true" /> Dosya seç
          <input type="file" accept=".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,application/json" className="sr-only" onChange={(event) => void readFile(event.target.files?.[0])} />
        </label>
      </div>
      {kind === "answer-key" && bookletCodes.length > 1 ? (
        <label className="mt-3 flex items-center gap-2 text-[13px] font-medium text-pn-text-secondary">
          Anahtarın kitapçığı
          <select value={bookletCode} onChange={(event) => { setBookletCode(event.target.value); reset(); }} className="rounded-md border border-pn-border-strong bg-white px-2 py-1.5 text-pn-text">
            {bookletCodes.map((code) => (
              <option key={code} value={code}>
                {code} kitapçığı{code === "A" ? " (kanonik)" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {format === "table" && sections.length ? (
        <p className="mt-2 text-[12.5px] text-pn-text-muted">Bölümler: {sections.map((section) => `${section.code} (${section.title})`).join(" · ")}</p>
      ) : null}

      <label className="mt-3 block">
        <span className="sr-only">İçe aktarılacak içerik</span>
        <textarea
          className="min-h-44 w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 font-mono text-[12.5px] text-pn-text placeholder:text-pn-text-muted focus:border-pn-accent focus:outline-none"
          placeholder={PLACEHOLDER[kind][format]}
          value={payload}
          onChange={(event) => {
            setPayload(event.target.value);
            if (importId || parseIssues.length) reset();
          }}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !payload.trim()}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-pn-border-strong bg-white px-3.5 text-[13.5px] font-semibold text-pn-text hover:bg-pn-hover disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void preview()}
        >
          {busy && !importId ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null} Önizle
        </button>
        <button
          type="button"
          disabled={busy || !importId || !ready}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-dc-ink px-3.5 text-[13.5px] font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void commit()}
        >
          Onayla ve yaz
        </button>
      </div>

      {summary ? (
        <p role="status" className="mt-3 rounded-md bg-pn-surface-subtle px-3 py-2 text-[13px] text-pn-text">
          {summary}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-md bg-(--pd-pastel-blush-soft) px-3 py-2 text-[13px] font-semibold text-(--pd-pastel-blush-ink)">
          {error}
        </p>
      ) : null}

      {parseIssues.length ? (
        <ul aria-label="Satır hataları" className="mt-3 max-h-64 overflow-y-auto rounded-md border border-pn-border text-[13px]">
          {parseIssues.map((issue, index) => (
            <li key={`${issue.line}-${index}`} className="border-b border-pn-border-subtle px-3 py-1.5 last:border-b-0">
              <span className="mr-2 font-mono text-pn-text-muted">{issue.line ? `satır ${issue.line}` : "—"}</span>
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      {serverIssues.length ? (
        <div className="mt-3">
          <p className="text-[13px] font-semibold text-pn-text">
            {errors.length} hata · {warnings.length} uyarı
          </p>
          <ul aria-label="Önizleme sorunları" className="mt-1.5 max-h-72 overflow-y-auto rounded-md border border-pn-border text-[13px]">
            {serverIssues.slice(0, 200).map((issue, index) => {
              const href = questionHref(issue);
              return (
                <li key={`${issue.code}-${index}`} className="flex flex-wrap items-baseline gap-x-2 border-b border-pn-border-subtle px-3 py-1.5 last:border-b-0">
                  <span className={`font-semibold ${issue.level === "error" ? "text-(--pn-tone-critical)" : "text-(--pn-tone-warning)"}`}>{issue.level === "error" ? "Hata" : "Uyarı"}</span>
                  {issue.sectionCode ? <span className="font-mono text-pn-text-muted">{issue.sectionCode}{issue.questionNumber ? ` ${issue.questionNumber}` : ""}</span> : null}
                  <span className="min-w-0 text-pn-text">
                    {issue.message}
                    {issue.outcomeCode ? ` (${issue.outcomeCode})` : ""}
                  </span>
                  {href ? (
                    <a href={href} className="ml-auto text-pn-text-muted underline underline-offset-2 hover:text-pn-text">
                      Soruya git
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
