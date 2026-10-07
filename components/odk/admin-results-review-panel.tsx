"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2, Send } from "lucide-react";
import { OdkStatusBadge } from "@/components/odk/odk-status-badge";
import { integrityLevelPresentation } from "@/lib/odk/presentation";
import {
  ResponsiveDataTable,
  ResponsiveDataTableBody,
  ResponsiveDataTableCell,
  ResponsiveDataTableHead,
  ResponsiveDataTableRow,
} from "@/components/panel/responsive-data-table";

type Summary = {
  participation: number;
  submitted: number;
  missing: number;
  averageNet: number | null;
  medianNet: number | null;
  integrityReviewCount: number;
  scoringErrors: number;
  sectionAverages: Array<{
    code: string;
    title: string;
    averageNet: number | null;
    averageAccuracy: number | null;
  }>;
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

type ReleasePreview = { publishable: number; reviewRequired?: number; scoringErrors?: number; warnings?: string[] };

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
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const [excludeReview, setExcludeReview] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch(`/api/odk/admin/exams/${examId}/results`);
    const result = await response.json().catch(() => ({}));
    if (response.ok) setSummary(result.summary);
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  const [pending, setPending] = useState<ReleasePreview | null>(null);

  // Yayın iki adımlı (§15.6): önizleme → satır içi onay (kitle sayısı ve geri
  // alınamazlık açıkça yazılır) → yayın. İkinci bir modal açılmaz.
  async function previewRelease() {
    setBusy("preview");
    setMessage(null);
    setPending(null);
    try {
      const previewResponse = await fetch(
        `/api/odk/admin/exams/${examId}/release/preview`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ excludeReviewRequired: excludeReview }),
        },
      );
      const preview = await previewResponse.json().catch(() => ({}));
      if (!previewResponse.ok) {
        setMessage({
          text: preview.error || "Önizleme alınamadı.",
          error: true,
        });
        return;
      }
      setPending(preview);
    } catch {
      setMessage({ text: "Bağlantı kurulamadı.", error: true });
    } finally {
      setBusy("");
    }
  }

  async function publish() {
    setBusy("publish");
    setMessage(null);
    try {
      const response = await fetch(`/api/odk/admin/exams/${examId}/release`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          excludeReviewRequired: excludeReview,
          createCoachSuggestions: true,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ text: result.error || "Yayın başarısız.", error: true });
        return;
      }
      setPending(null);
      setMessage({
        text: `Yayınlandı · ${result.published} öğrenciye bildirim gönderildi${result.coach?.created ? ` · ${result.coach.created} koç önerisi oluşturuldu` : ""}.`,
        error: false,
      });
      await load();
      router.refresh();
    } catch {
      setMessage({ text: "Bağlantı kurulamadı.", error: true });
    } finally {
      setBusy("");
    }
  }

  if (!summary) {
    return (
      <section
        id="adim-sonuc"
        className="panel-surface scroll-mt-36 p-5 sm:p-6"
      >
        <p className="text-xs text-(--site-muted)">
          Sonuç özeti yükleniyor…
        </p>
      </section>
    );
  }

  return (
    <section id="adim-sonuc" className="panel-surface scroll-mt-36 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="panel-metric-icon panel-tone-sky">
          <BarChart3 size={17} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold">Sonuç inceleme ve yayın</h2>
          <p className="mt-1 text-xs leading-5 text-(--site-muted)">
            Puanlama ≠ yayın. Öğrenci yalnız yayın sonrası görür.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Katılım", summary.participation],
          ["Teslim", summary.submitted],
          ["Eksik", summary.missing],
          ["Integrity inceleme", summary.integrityReviewCount],
          [
            "Ortalama net",
            summary.averageNet == null ? "—" : summary.averageNet.toFixed(2),
          ],
          [
            "Medyan net",
            summary.medianNet == null ? "—" : summary.medianNet.toFixed(2),
          ],
          ["Scoring hatası", summary.scoringErrors],
          ["Bölüm", summary.sectionAverages.length],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl bg-(--site-bg-warm) p-4"
          >
            <p className="text-xl font-black text-(--site-ink)">{value}</p>
            <p className="mt-1 text-xs text-(--site-muted)">{label}</p>
          </div>
        ))}
      </div>

      {summary.sectionAverages.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.sectionAverages.map((section) => (
            <span
              key={section.code}
              className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-(--site-body) ring-1 ring-(--site-line)"
            >
              {section.title}:{" "}
              {section.averageNet == null ? "—" : section.averageNet.toFixed(2)}{" "}
              net
              {section.averageAccuracy != null
                ? ` · %${section.averageAccuracy.toFixed(0)}`
                : ""}
            </span>
          ))}
        </div>
      ) : null}

      <ResponsiveDataTable
        className="mt-4"
        minWidthClassName="lg:min-w-[860px]"
      >
        <ResponsiveDataTableHead>
          <tr>
            <ResponsiveDataTableCell header label="Öğrenci">
              Öğrenci
            </ResponsiveDataTableCell>
            <ResponsiveDataTableCell header label="Doğru">
              D
            </ResponsiveDataTableCell>
            <ResponsiveDataTableCell header label="Yanlış">
              Y
            </ResponsiveDataTableCell>
            <ResponsiveDataTableCell header label="Boş">
              B
            </ResponsiveDataTableCell>
            <ResponsiveDataTableCell header label="Net">
              Net
            </ResponsiveDataTableCell>
            <ResponsiveDataTableCell header label="Süre">
              Süre
            </ResponsiveDataTableCell>
            <ResponsiveDataTableCell header label="Integrity">
              Integrity
            </ResponsiveDataTableCell>
            <ResponsiveDataTableCell header label="Sonuç">
              Sonuç
            </ResponsiveDataTableCell>
          </tr>
        </ResponsiveDataTableHead>
        <ResponsiveDataTableBody>
          {summary.rows.map((row) => {
            const integrity = integrityLevelPresentation[row.integrityLevel];
            return (
              <ResponsiveDataTableRow key={row.attemptId}>
                <ResponsiveDataTableCell label="Öğrenci">
                  <span className="font-bold">{row.studentName}</span>
                </ResponsiveDataTableCell>
                <ResponsiveDataTableCell label="Doğru">
                  {row.correctCount ?? "—"}
                </ResponsiveDataTableCell>
                <ResponsiveDataTableCell label="Yanlış">
                  {row.wrongCount ?? "—"}
                </ResponsiveDataTableCell>
                <ResponsiveDataTableCell label="Boş">
                  {row.blankCount ?? "—"}
                </ResponsiveDataTableCell>
                <ResponsiveDataTableCell label="Net">
                  {row.totalNet == null ? "—" : row.totalNet.toFixed(2)}
                </ResponsiveDataTableCell>
                <ResponsiveDataTableCell label="Süre">
                  {row.durationSeconds == null
                    ? "—"
                    : `${Math.round(row.durationSeconds / 60)} dk`}
                </ResponsiveDataTableCell>
                <ResponsiveDataTableCell label="Integrity">
                  <OdkStatusBadge
                    label={integrity.label}
                    tone={integrity.tone}
                  />
                </ResponsiveDataTableCell>
                <ResponsiveDataTableCell label="Sonuç">
                  {row.scoringError
                    ? "Hata"
                    : row.publicationStatus === "PUBLISHED"
                      ? "Yayınlandı"
                      : row.publicationStatus === "HIDDEN"
                        ? "Gizli"
                        : row.status}
                </ResponsiveDataTableCell>
              </ResponsiveDataTableRow>
            );
          })}
        </ResponsiveDataTableBody>
      </ResponsiveDataTable>
      {!summary.rows.length ? (
        <p className="mt-3 text-xs text-(--site-muted)">
          Henüz oturum yok.
        </p>
      ) : null}

      {examStatus === "SCORED" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={excludeReview}
              onChange={(event) => {
                setExcludeReview(event.target.checked);
                setPending(null);
              }}
              className="h-4 w-4"
            />
            İnceleme bekleyenleri hariç tut
          </label>
          <button
            type="button"
            disabled={Boolean(busy)}
            className="panel-primary-button"
            onClick={() => void previewRelease()}
          >
            {busy === "preview" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}{" "}
            Yayın önizleme
          </button>
          {pending ? (
            <div
              role="group"
              aria-labelledby="yayin-onay-baslik"
              className="w-full rounded-lg border border-(--pn-tone-warning)/40 bg-(--pn-tone-warning-soft) p-4"
            >
              <h3 id="yayin-onay-baslik" className="text-[14px] font-semibold text-pn-text">
                {pending.publishable} öğrencinin sonucu yayınlanacak
              </h3>
              <ul className="mt-1.5 space-y-0.5 text-[13px] text-pn-text-secondary">
                <li>{pending.reviewRequired || 0} sonuç inceleme bekliyor{excludeReview ? " (hariç tutulur)" : ""}.</li>
                <li>{pending.scoringErrors || 0} puanlama hatası var.</li>
                {pending.warnings?.map((warning) => <li key={warning}>{warning}</li>)}
                <li className="font-medium text-pn-text">
                  Yayın geri alınamaz: öğrenciler sonucu ve cevap anahtarını hemen görür, bildirim gönderilir.
                </li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={Boolean(busy) || pending.publishable < 1}
                  className="panel-primary-button"
                  onClick={() => void publish()}
                >
                  {busy === "publish" ? <Loader2 size={14} className="animate-spin" /> : null} Sonuçları yayınla
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  className="panel-secondary-button"
                  onClick={() => setPending(null)}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : examStatus === "RELEASED" ? (
        <p className="mt-4 rounded-xl bg-(--pd-pastel-mint-soft) p-3 text-xs font-extrabold text-(--pd-pastel-mint-ink)">
          Sonuçlar yayınlandı.
        </p>
      ) : null}

      {message ? (
        <p
          role={message.error ? "alert" : "status"}
          className={`mt-3 rounded-xl p-3 text-xs font-bold ${message.error ? "bg-(--pd-pastel-blush-soft) text-(--pd-pastel-blush-ink)" : "bg-(--brand-olive-soft) text-(--brand-olive)"}`}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
