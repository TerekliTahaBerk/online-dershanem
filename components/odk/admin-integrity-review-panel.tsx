"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { OdkStatusBadge } from "@/components/odk/odk-status-badge";
import { integrityLevelPresentation } from "@/lib/odk/presentation";

type AttemptSummary = {
  id: string;
  studentName: string;
  status: string;
  integrityLevel: "NORMAL" | "REVIEW" | "HIGH";
  integrityReviewedAt: string | null;
};

type AttemptDetail = {
  id: string;
  student: { fullName: string | null; email: string };
  status: string;
  integrityLevel: "NORMAL" | "REVIEW" | "HIGH";
  integrityReviewedAt: string | null;
  assessment: { label: string; reasons: string[] };
  events: Array<{ id: string; type: string; sequence: number; serverOccurredAt: string; metadata: unknown }>;
  timings: Array<{ questionId: string; activeDurationMs: number; visitCount: number }>;
  score: null | { correctCount: number; wrongCount: number; blankCount: number; totalNet: unknown; publicationStatus: string };
};

export function AdminIntegrityReviewPanel({
  examId,
  attempts,
}: {
  examId: string;
  attempts: AttemptSummary[];
}) {
  const router = useRouter();
  const flagged = attempts.filter((item) => item.integrityLevel !== "NORMAL");
  const [selectedId, setSelectedId] = useState<string | null>(flagged[0]?.id || null);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    void (async () => {
      const response = await fetch(`/api/odk/admin/attempts/${selectedId}`);
      const result = await response.json().catch(() => ({}));
      if (!cancelled && response.ok) setDetail(result.attempt);
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  async function review(action: "MARK_REVIEWED" | "REQUIRE_REVIEW" | "CLEAR_REVIEW") {
    if (!selectedId) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/odk/admin/attempts/${selectedId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "İşlem başarısız.");
        return;
      }
      setMessage("İnceleme kaydedildi.");
      router.refresh();
    } catch {
      setMessage("Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="adim-integrity" className="panel-surface scroll-mt-36 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="panel-metric-icon panel-attention-rose"><ShieldAlert size={17} /></span>
        <div>
          <h2 className="text-sm font-extrabold">Integrity inceleme</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">
            Otomatik suçlama yok. {flagged.length} oturumda sinyal var · deneme {examId.slice(0, 8)}…
          </p>
        </div>
      </div>

      {!flagged.length ? (
        <p className="mt-4 rounded-xl bg-[var(--pd-pastel-mint-soft)] p-3 text-xs font-bold text-[var(--pd-pastel-mint-ink)]">İnceleme bekleyen integrity sinyali yok.</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ul className="space-y-2">
            {flagged.map((item) => {
              const presentation = integrityLevelPresentation[item.integrityLevel];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left ${selectedId === item.id ? "border-[var(--brand-olive)] bg-[var(--brand-olive-soft)]" : "border-[var(--site-line)] bg-white"}`}
                  >
                    <strong className="block text-xs">{item.studentName}</strong>
                    <span className="mt-2 inline-flex"><OdkStatusBadge label={presentation.label} tone={presentation.tone} /></span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="rounded-2xl border border-[var(--site-line)] bg-white p-4">
            {!detail ? <p className="text-xs text-[var(--site-muted)]">Oturum seçin.</p> : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold">{detail.student.fullName || detail.student.email}</h3>
                    <p className="mt-1 text-xs text-[var(--site-muted)]">{detail.assessment.label}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} className="panel-secondary-button" onClick={() => void review("REQUIRE_REVIEW")}>İnceleme gerekli</button>
                    <button type="button" disabled={busy} className="panel-primary-button" onClick={() => void review("MARK_REVIEWED")}>
                      {busy ? <Loader2 size={14} className="animate-spin" /> : null} İncelendi işaretle
                    </button>
                  </div>
                </div>
                <ul className="mt-3 space-y-1">
                  {detail.assessment.reasons.map((reason) => <li key={reason} className="text-xs text-[var(--site-body)]">• {reason}</li>)}
                  {!detail.assessment.reasons.length ? <li className="text-xs text-[var(--site-muted)]">Açıklanabilir sinyal yok.</li> : null}
                </ul>
                <div className="mt-4 max-h-56 overflow-auto rounded-xl bg-[var(--site-bg-warm)] p-3">
                  <p className="text-[10px] font-extrabold uppercase text-[var(--site-muted)]">Event timeline</p>
                  <ul className="mt-2 space-y-1 font-mono text-[10px]">
                    {detail.events.slice(-40).map((event) => (
                      <li key={event.id}>#{event.sequence} {event.type} · {new Date(event.serverOccurredAt).toLocaleTimeString("tr-TR")}</li>
                    ))}
                  </ul>
                </div>
                {detail.score ? (
                  <p className="mt-3 text-xs font-bold">
                    Skor: {detail.score.correctCount}D / {detail.score.wrongCount}Y / {detail.score.blankCount}B · net {Number(detail.score.totalNet).toFixed(2)} · {detail.score.publicationStatus}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
      {message ? <p role="status" className="mt-3 rounded-xl bg-[var(--site-bg-warm)] p-3 text-xs font-bold">{message}</p> : null}
    </section>
  );
}
