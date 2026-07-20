"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, PlayCircle } from "lucide-react";

export function StudentExamStart({ examId, meetRequired, meetUrl, canStart, startError, activeAttempt }: { examId: string; meetRequired: boolean; meetUrl: string | null; canStart: boolean; startError: string | null; activeAttempt: boolean }) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(!meetRequired);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setBusy(true); setError(null);
    const response = await fetch(`/api/odk/student/exams/${examId}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meetAcknowledged: acknowledged }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || "Sınav oturumu başlatılamadı."); setBusy(false); return; }
    router.push(`/panel/odk/ogrenci/denemeler/${examId}/coz`);
    router.refresh();
  }
  return <div className="space-y-4">
    {meetRequired && <div className="rounded-2xl border border-[var(--site-border)] bg-white p-4">
      <p className="font-bold text-[var(--site-ink)]">1. Meet gözetim odasına katıl</p>
      <p className="mt-1 text-sm leading-6 text-[var(--site-body)]">Sınav boyunca bu görüşmede kalman gerekiyor. Meet sekmesini kapatma.</p>
      {meetUrl && <a href={meetUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--site-ink)] px-4 py-2.5 text-sm font-bold text-white">Meet&apos;e gir <ExternalLink size={15} /></a>}
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[var(--site-body)]"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4" /><span>Meet odasına katıldım ve sınav boyunca görüşmede kalacağımı onaylıyorum.</span></label>
    </div>}
    <div className="rounded-2xl border border-[var(--site-border)] bg-white p-4">
      <p className="font-bold text-[var(--site-ink)]">{meetRequired ? "2." : "1."} Denemeyi başlat</p>
      <p className="mt-1 text-sm leading-6 text-[var(--site-body)]">Başlattığında kişisel sayacın çalışır. Cevapların her seçimde otomatik kaydedilir.</p>
      <button type="button" onClick={start} disabled={busy || (!activeAttempt && (!canStart || !acknowledged))} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-olive)] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 size={17} className="animate-spin" /> : <PlayCircle size={17} />}{activeAttempt ? "Denemeye devam et" : "Denemeyi başlat"}</button>
      {!activeAttempt && startError && <p className="mt-3 text-sm font-semibold text-amber-700">{startError}</p>}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  </div>;
}
