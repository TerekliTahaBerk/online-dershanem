"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileJson2, Loader2 } from "lucide-react";

export function AdminJsonImportPanel({ examId }: { examId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<"answer-key" | "outcomes">("answer-key");
  const [payload, setPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  async function preview() {
    setBusy(true); setError(null); setSummary(null); setImportId(null); setReady(false);
    try {
      const json = JSON.parse(payload);
      const response = await fetch(`/api/odk/admin/exams/${examId}/imports/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload: json }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Önizleme başarısız.");
        return;
      }
      setImportId(result.importId);
      setSummary(result.summary?.message || "Önizleme hazır.");
      setReady(Boolean(result.summary?.ready ?? result.summary?.valid > 0));
    } catch {
      setError("Geçerli bir JSON yapıştırın.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!importId) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/odk/admin/exams/${examId}/imports/${kind}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ importId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Commit başarısız.");
        return;
      }
      setSummary(`Commit tamamlandı · ${result.count} kayıt.`);
      setImportId(null);
      setReady(false);
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="panel-metric-icon panel-tone-sky"><FileJson2 size={17} /></span>
        <div>
          <h2 className="text-sm font-extrabold">JSON içe aktarma</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Cevap anahtarı veya kazanım JSON’unu önce önizleyin; hata yoksa onaylayarak yazın. Doğrudan DB’ye yazılmaz.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={`rounded-xl px-3 py-2 text-xs font-extrabold ${kind === "answer-key" ? "bg-[var(--brand-olive)] text-white" : "bg-[var(--site-bg-warm)]"}`} onClick={() => setKind("answer-key")}>Cevap anahtarı</button>
        <button type="button" className={`rounded-xl px-3 py-2 text-xs font-extrabold ${kind === "outcomes" ? "bg-[var(--brand-olive)] text-white" : "bg-[var(--site-bg-warm)]"}`} onClick={() => setKind("outcomes")}>Kazanımlar</button>
      </div>
      <textarea
        className="panel-input mt-3 min-h-40 font-mono text-[11px]"
        placeholder={kind === "answer-key"
          ? '{"schemaVersion":"1.0","examType":"TYT","sections":[{"code":"TURKCE","answers":{"1":"A"}}]}'
          : '{"schemaVersion":"1.0","questions":[{"section":"MAT","question":1,"outcomes":[{"code":"TYT.MAT.01","name":"..."}]}]}'}
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || !payload.trim()} className="panel-secondary-button" onClick={() => void preview()}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Önizle
        </button>
        <button type="button" disabled={busy || !importId || !ready} className="panel-primary-button" onClick={() => void commit()}>
          Onayla ve yaz
        </button>
      </div>
      {summary ? <p role="status" className="mt-3 rounded-xl bg-[var(--brand-olive-soft)] p-3 text-xs font-bold text-[var(--brand-olive)]">{summary}</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-xl bg-[var(--pd-pastel-blush-soft)] p-3 text-xs font-bold text-[var(--pd-pastel-blush-ink)]">{error}</p> : null}
    </section>
  );
}
