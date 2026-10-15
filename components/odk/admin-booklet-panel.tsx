"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2 } from "lucide-react";
import { parseBookletOrderTable, type BookletIssue, type BookletOrderInput } from "@/lib/odk/booklets";
import type { TableIssue } from "@/lib/odk/table-import";

type Summary = Array<{ code: string; questionCount: number }>;

/**
 * Çoklu kitapçık (Faz 7 sonrası): A kitapçığı kanoniktir; B–E kitapçıklarının
 * soru sırası tablo yapıştırılarak tanımlanır, önizlenir ve hash korumalı
 * kaydedilir. Öğrenciye kitapçık deneme başında otomatik ve dengeli atanır.
 */
export function AdminBookletPanel({
  examId,
  sections,
  booklets,
  currentHash,
  editable,
  totalQuestions,
}: {
  examId: string;
  sections: Array<{ code: string; title: string }>;
  booklets: Summary;
  currentHash: string;
  editable: boolean;
  totalQuestions: number;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<BookletOrderInput[] | null>(null);
  const [parseIssues, setParseIssues] = useState<TableIssue[]>([]);
  const [issues, setIssues] = useState<BookletIssue[]>([]);
  const [previewed, setPreviewed] = useState<{ booklets: Summary; currentHash: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  function reset() {
    setRows(null);
    setParseIssues([]);
    setIssues([]);
    setPreviewed(null);
    setMessage(null);
  }

  async function send(method: "POST" | "PUT", payloadRows: BookletOrderInput[]) {
    setBusy(true);
    setMessage(null);
    try {
      const body = method === "POST" ? { rows: payloadRows } : { rows: payloadRows, expectedHash: previewed?.currentHash ?? currentHash };
      const response = await fetch(`/api/odk/admin/exams/${examId}/booklets`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (method === "POST") {
        if (!response.ok) return setMessage({ text: result.error || "Önizleme başarısız.", error: true });
        setIssues(result.issues ?? []);
        setPreviewed(result.ok ? { booklets: result.booklets, currentHash: result.currentHash } : null);
        if (!result.ok) setMessage({ text: `${result.issues.length} sorun var; düzeltip yeniden önizleyin.`, error: true });
        return;
      }
      if (!response.ok) {
        if (result.code === "BOOKLET_STALE") setPreviewed(null);
        return setMessage({ text: result.error || "Kaydedilemedi.", error: true });
      }
      setMessage({ text: payloadRows.length ? `Kaydedildi: ${result.booklets.map((item: { code: string }) => item.code).join(", ")} kitapçıkları.` : "Çoklu kitapçık kaldırıldı; deneme tek (A) kitapçıklı.", error: false });
      setText("");
      setRows(null);
      setPreviewed(null);
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı.", error: true });
    } finally {
      setBusy(false);
    }
  }

  function preview() {
    reset();
    const parsed = parseBookletOrderTable(text, sections);
    if (parsed.issues.length) {
      setParseIssues(parsed.issues);
      setMessage({ text: `${parsed.issues.length} satırda sorun var.`, error: true });
      return;
    }
    setRows(parsed.rows);
    void send("POST", parsed.rows);
  }

  const multi = booklets.length > 1;
  return (
    <section aria-labelledby="kitapcik-baslik" className="rounded-[10px] border border-pn-border bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Layers size={18} aria-hidden="true" className="mt-0.5 text-pn-text-muted" />
        <div>
          <h2 id="kitapcik-baslik" className="text-[15px] font-semibold text-pn-text">
            Kitapçık türleri
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-pn-text-muted">
            A kitapçığı kanoniktir (soru numaraları). B–E kitapçıklarının sırasını yapıştırın; her öğrenciye deneme başında bir kitapçık dengeli ve sabit olarak atanır. Cevaplar ve puanlar kitapçıktan bağımsızdır; her kitapçığın PDF&apos;i ayrı yüklenir.
          </p>
        </div>
      </div>
      <p className="mt-3 text-[13.5px] text-pn-text" aria-live="polite">
        {multi ? `${booklets.map((item) => item.code).join(", ")} kitapçıkları tanımlı.` : "Tek kitapçık (A)."}
      </p>

      {editable ? (
        <>
          <label className="mt-3 block">
            <span className="sr-only">Kitapçık sırası tablosu</span>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (rows || previewed || parseIssues.length) reset();
              }}
              placeholder={"Kitapçık;Bölüm;Kitapçık soru no;A soru no;PDF sayfası (isteğe bağlı)\nB;MAT;1;7;2\nB;MAT;2;3;2"}
              className="min-h-36 w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 font-mono text-[12.5px] text-pn-text placeholder:text-pn-text-muted focus:border-pn-accent focus:outline-none"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={preview} disabled={busy || !text.trim()} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-pn-border-strong bg-white px-3.5 text-[13.5px] font-semibold hover:bg-pn-hover disabled:opacity-50">
              {busy && !previewed ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null} Kitapçık sırasını önizle
            </button>
            <button type="button" onClick={() => rows && void send("PUT", rows)} disabled={busy || !previewed || !rows} className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-dc-ink px-3.5 text-[13.5px] font-semibold text-white hover:bg-black disabled:opacity-50">
              Kitapçık sırasını kaydet
            </button>
            {multi ? (
              <button type="button" onClick={() => void send("PUT", [])} disabled={busy} className="min-h-10 px-2 text-[13px] text-pn-text-muted underline underline-offset-2 hover:text-pn-text">
                Çoklu kitapçığı kaldır
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {previewed ? (
        <p role="status" className="mt-3 rounded-md bg-pn-surface-subtle px-3 py-2 text-[13px] text-pn-text">
          Geçerli: {previewed.booklets.filter((item) => item.code !== "A").map((item) => `${item.code} (${item.questionCount}/${totalQuestions} soru)`).join(", ")}. Kaydedince mevcut B–E sırası bununla değişir.
        </p>
      ) : null}
      {message ? (
        <p role={message.error ? "alert" : "status"} className={`mt-3 rounded-md px-3 py-2 text-[13px] font-semibold ${message.error ? "bg-(--pd-pastel-blush-soft) text-(--pd-pastel-blush-ink)" : "bg-pn-surface-subtle text-pn-text"}`}>
          {message.text}
        </p>
      ) : null}
      {parseIssues.length || issues.length ? (
        <ul aria-label="Kitapçık sırası sorunları" className="mt-3 max-h-64 overflow-y-auto rounded-md border border-pn-border text-[13px]">
          {parseIssues.map((issue, index) => (
            <li key={`p-${index}`} className="border-b border-pn-border-subtle px-3 py-1.5 last:border-b-0">
              <span className="mr-2 font-mono text-pn-text-muted">satır {issue.line}</span>
              {issue.message}
            </li>
          ))}
          {issues.map((issue, index) => (
            <li key={`s-${index}`} className="border-b border-pn-border-subtle px-3 py-1.5 last:border-b-0">
              {issue.bookletCode ? <span className="mr-2 font-mono text-pn-text-muted">{issue.bookletCode}{issue.sectionCode ? ` ${issue.sectionCode}` : ""}{issue.bookletQuestionNumber ? ` ${issue.bookletQuestionNumber}` : ""}</span> : null}
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
