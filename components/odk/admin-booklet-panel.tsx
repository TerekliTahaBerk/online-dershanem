"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2 } from "lucide-react";
import { parseBookletOrderTable, type BookletIssue, type BookletOrderInput } from "@/lib/odk/booklets";
import type { TableIssue } from "@/lib/odk/table-import";

type Summary = Array<{ code: string; questionCount: number }>;
type Impact = { affectedAttemptCount: number; movedAnswerCount: number; requiresRescore: boolean; publishedResultsMayChange: boolean };

/**
 * Çoklu kitapçık (Faz 7 sonrası): A kitapçığı kanoniktir; B–E kitapçıklarının
 * soru sırası tablo yapıştırılarak tanımlanır, önizlenir ve hash korumalı
 * kaydedilir. Öğrenciye kitapçık deneme başında otomatik ve dengeli atanır.
 * Taslak sonrası (`correctable`): yanlış sıra düzeltilir — etki önizlenir,
 * gerekçe istenir, cevaplar kitapçık konumuna göre taşınır ve gerekirse
 * yeniden puanlanır.
 */
export function AdminBookletPanel({
  examId,
  sections,
  booklets,
  currentHash,
  editable,
  correctable = false,
  totalQuestions,
}: {
  examId: string;
  sections: Array<{ code: string; title: string }>;
  booklets: Summary;
  currentHash: string;
  editable: boolean;
  correctable?: boolean;
  totalQuestions: number;
}) {
  const correcting = !editable && correctable;
  const endpoint = `/api/odk/admin/exams/${examId}/booklets${correcting ? "/correction" : ""}`;
  const router = useRouter();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<BookletOrderInput[] | null>(null);
  const [parseIssues, setParseIssues] = useState<TableIssue[]>([]);
  const [issues, setIssues] = useState<BookletIssue[]>([]);
  const [previewed, setPreviewed] = useState<{ booklets: Summary; currentHash: string; impact: Impact | null; changedBooklets: string[] } | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  function reset() {
    setRows(null);
    setParseIssues([]);
    setIssues([]);
    setPreviewed(null);
    setConfirmed(false);
    setMessage(null);
  }

  async function send(method: "POST" | "PUT", payloadRows: BookletOrderInput[]) {
    setBusy(true);
    setMessage(null);
    try {
      const expectedHash = previewed?.currentHash ?? currentHash;
      const body = method === "POST" ? { rows: payloadRows } : correcting ? { rows: payloadRows, expectedHash, reason: reason.trim(), confirmPublishedChange: confirmed } : { rows: payloadRows, expectedHash };
      const response = await fetch(endpoint, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (method === "POST") {
        if (!response.ok) return setMessage({ text: result.error || "Önizleme şu an tamamlanamadı. Lütfen tekrar dener misiniz?", error: true });
        setIssues(result.issues ?? []);
        setPreviewed(result.ok ? { booklets: result.booklets, currentHash: result.currentHash, impact: result.impact ?? null, changedBooklets: result.changedBooklets ?? [] } : null);
        if (!result.ok) setMessage({ text: `${result.issues.length} sorun var; düzeltip yeniden önizleyin.`, error: true });
        return;
      }
      if (!response.ok) {
        if (result.code === "BOOKLET_STALE") setPreviewed(null);
        return setMessage({ text: result.error || "Şu an kaydedilemedi. Lütfen tekrar dener misiniz?", error: true });
      }
      if (correcting) {
        setMessage({ text: `Düzeltildi: ${result.changedBooklets.join(", ")} kitapçığı; ${result.affectedAttemptCount} denemede ${result.movedAnswerCount} cevap taşındı${result.rescored ? ", yeniden puanlandı" : ""}.`, error: false });
        setReason("");
        setConfirmed(false);
      } else setMessage({ text: payloadRows.length ? `Kaydedildi: ${result.booklets.map((item: { code: string }) => item.code).join(", ")} kitapçıkları.` : "Çoklu kitapçık kaldırıldı; deneme tek (A) kitapçıklı.", error: false });
      setText("");
      setRows(null);
      setPreviewed(null);
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar dener misiniz?", error: true });
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

      {correcting ? (
        <p className="mt-2 text-[13px] leading-5 text-pn-text-muted">
          Deneme kilitli. Yanlış eşlenmiş bir kitapçığın sırasını düzeltebilirsiniz: öğrencilerin cevapları kitapçıktaki konumlarına göre doğru soruya taşınır, puanlanmış denemede sonuçlar yeniden hesaplanır. Kitapçık eklenemez ya da çıkarılamaz.
        </p>
      ) : null}
      {editable || correcting ? (
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
              {busy && !previewed ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null} {correcting ? "Düzeltmeyi önizle" : "Kitapçık sırasını önizle"}
            </button>
            <button
              type="button"
              onClick={() => rows && void send("PUT", rows)}
              disabled={busy || !previewed || !rows || (correcting && (reason.trim().length < 5 || (Boolean(previewed?.impact?.publishedResultsMayChange) && !confirmed)))}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-dc-ink px-3.5 text-[13.5px] font-semibold text-white hover:bg-black disabled:opacity-50"
            >
              {correcting ? "Düzeltmeyi uygula" : "Kitapçık sırasını kaydet"}
            </button>
            {multi && editable ? (
              <button type="button" onClick={() => void send("PUT", [])} disabled={busy} className="min-h-10 px-2 text-[13px] text-pn-text-muted underline underline-offset-2 hover:text-pn-text">
                Çoklu kitapçığı kaldır
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {previewed && !correcting ? (
        <p role="status" className="mt-3 rounded-md bg-pn-surface-subtle px-3 py-2 text-[13px] text-pn-text">
          Geçerli: {previewed.booklets.filter((item) => item.code !== "A").map((item) => `${item.code} (${item.questionCount}/${totalQuestions} soru)`).join(", ")}. Kaydedince mevcut B–E sırası bununla değişir.
        </p>
      ) : null}
      {previewed && correcting ? (
        <div className="mt-3 space-y-3">
          <p role="status" className="rounded-md bg-pn-surface-subtle px-3 py-2 text-[13px] text-pn-text">
            Değişen kitapçık: {previewed.changedBooklets.join(", ")}. {previewed.impact?.affectedAttemptCount ?? 0} denemede {previewed.impact?.movedAnswerCount ?? 0} cevap doğru soruya taşınacak
            {previewed.impact?.requiresRescore ? "; deneme yeniden puanlanacak." : "."}
          </p>
          <label className="block text-[13px] font-semibold text-pn-text">
            Gerekçe (denetim kaydına yazılır)
            <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="mt-1 block min-h-10 w-full rounded-md border border-pn-border-strong px-3 text-[13.5px] font-normal" />
          </label>
          {previewed.impact?.publishedResultsMayChange ? (
            <label className="flex items-start gap-2 text-[13px] text-pn-text">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5" />
              Yayınlanmış sonuçların değişebileceğini ve öğrencilere bildirim gideceğini onaylıyorum.
            </label>
          ) : null}
        </div>
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
