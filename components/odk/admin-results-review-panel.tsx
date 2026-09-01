"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2, Send } from "lucide-react";
import { OdkStatusBadge } from "@/components/odk/odk-status-badge";
import { integrityLevelPresentation } from "@/lib/odk/presentation";

type Summary = {
  participation: number;
  submitted: number;
  missing: number;
  averageNet: number | null;
  medianNet: number | null;
  integrityReviewCount: number;
  scoringErrors: number;
  sectionAverages: Array<{ code: string; title: string; averageNet: number | null; averageAccuracy: number | null }>;
  rows: Array<{
    attemptId: string;
    studentName: string;
    status: string;
    correctCount: number | null;
    wrongCount: number | null;
    blankCount: number | null;
    totalNet: number | null;
    durationSeconds: number | null;
    integrityLevel: "NORMAL" | "REVIEW" | "HIGH";
    publicationStatus: "HIDDEN" | "PUBLISHED" | null;
    scoringError: boolean;
  }>;
};

export function AdminResultsReviewPanel({
  examId,
  examStatus,
}: {
  examId: string;
  examStatus: string;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [excludeReview, setExcludeReview] = useState(true);

  async function load() {
    const response = await fetch(`/api/odk/admin/exams/${examId}/results`);
    const result = await response.json().catch(() => ({}));
    if (response.ok) setSummary(result.summary);
  }

  useEffect(() => { void load(); }, [examId]);

  async function publish() {
    setBusy("publish"); setMessage(null);
    try {
      const previewResponse = await fetch(`/api/odk/admin/exams/${examId}/release/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ excludeReviewRequired: excludeReview }),
      });
      const preview = await previewResponse.json().catch(() => ({}));
      if (!previewResponse.ok) {
        setMessage({ text: preview.error || "Önizleme alınamadı.", error: true });
        return;
      }
      const confirmMessage = `${preview.publishable} öğrencinin sonucu yayınlanacak.\n${preview.reviewRequired || 0} sonuç inceleme bekliyor.\n${preview.scoringErrors || 0} scoring hatası var.${preview.warnings?.length ? `\n\n${preview.warnings.join("\n")}` : ""}\n\nSonuçları yayınla?`;
      if (!window.confirm(confirmMessage)) return;
      const response = await fetch(`/api/odk/admin/exams/${examId}/release`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ excludeReviewRequired: excludeReview, createCoachSuggestions: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ text: result.error || "Yayın başarısız.", error: true });
        return;
      }
      setMessage({ text: `Sonuçlar yayınlandı · ${result.published} öğrenci${result.coach?.created ? ` · ${result.coach.created} Koçum önerisi` : ""}.`, error: false });
      await load();
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı.", error: true });
    } finally {
      setBusy("");
    }
  }

  if (!summary) {
    return <section id="adim-sonuc" className="panel-surface scroll-mt-36 p-5 sm:p-6"><p className="text-xs text-[var(--site-muted)]">Sonuç özeti yükleniyor…</p></section>;
  }

  return (
    <section id="adim-sonuc" className="panel-surface scroll-mt-36 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="panel-metric-icon panel-tone-sky"><BarChart3 size={17} /></span>
        <div>
          <h2 className="text-sm font-extrabold">Sonuç inceleme ve yayın</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Puanlama ≠ yayın. Öğrenci yalnız yayın sonrası görür.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Katılım", summary.participation],
          ["Teslim", summary.submitted],
          ["Eksik", summary.missing],
          ["Integrity inceleme", summary.integrityReviewCount],
          ["Ortalama net", summary.averageNet == null ? "—" : summary.averageNet.toFixed(2)],
          ["Medyan net", summary.medianNet == null ? "—" : summary.medianNet.toFixed(2)],
          ["Scoring hatası", summary.scoringErrors],
          ["Bölüm", summary.sectionAverages.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-[var(--site-bg-warm)] p-4">
            <p className="text-xl font-black text-[var(--site-ink)]">{value}</p>
            <p className="mt-1 text-xs text-[var(--site-muted)]">{label}</p>
          </div>
        ))}
      </div>

      {summary.sectionAverages.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.sectionAverages.map((section) => (
            <span key={section.code} className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-[var(--site-body)] ring-1 ring-[var(--site-line)]">
              {section.title}: {section.averageNet == null ? "—" : section.averageNet.toFixed(2)} net
              {section.averageAccuracy != null ? ` · %${section.averageAccuracy.toFixed(0)}` : ""}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--site-muted)]">
              <th className="pb-2">Öğrenci</th>
              <th>D</th><th>Y</th><th>B</th><th>Net</th><th>Süre</th><th>Integrity</th><th>Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => {
              const integrity = integrityLevelPresentation[row.integrityLevel];
              return (
                <tr key={row.attemptId} className="border-t border-[var(--site-line)]">
                  <td className="py-2 pr-3 font-bold">{row.studentName}</td>
                  <td>{row.correctCount ?? "—"}</td>
                  <td>{row.wrongCount ?? "—"}</td>
                  <td>{row.blankCount ?? "—"}</td>
                  <td>{row.totalNet == null ? "—" : row.totalNet.toFixed(2)}</td>
                  <td>{row.durationSeconds == null ? "—" : `${Math.round(row.durationSeconds / 60)} dk`}</td>
                  <td><OdkStatusBadge label={integrity.label} tone={integrity.tone} /></td>
                  <td>{row.scoringError ? "Hata" : row.publicationStatus === "PUBLISHED" ? "Yayınlandı" : row.publicationStatus === "HIDDEN" ? "Gizli" : row.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!summary.rows.length ? <p className="mt-3 text-xs text-[var(--site-muted)]">Henüz oturum yok.</p> : null}
      </div>

      {examStatus === "SCORED" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={excludeReview} onChange={(event) => setExcludeReview(event.target.checked)} className="h-4 w-4" />
            İnceleme bekleyenleri hariç tut
          </label>
          <button type="button" disabled={Boolean(busy)} className="panel-primary-button" onClick={() => void publish()}>
            {busy === "publish" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Sonuçları Yayınla
          </button>
        </div>
      ) : examStatus === "RELEASED" ? (
        <p className="mt-4 rounded-xl bg-[var(--pd-pastel-mint-soft)] p-3 text-xs font-extrabold text-[var(--pd-pastel-mint-ink)]">Sonuçlar yayınlandı.</p>
      ) : null}

      {message ? <p role={message.error ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-xs font-bold ${message.error ? "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]" : "bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"}`}>{message.text}</p> : null}
    </section>
  );
}
