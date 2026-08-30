"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2, PlayCircle, ShieldCheck, Wifi } from "lucide-react";

export function StudentExamStart({ examId, meetRequired, meetUrl, canStart, startError, activeAttempt }: { examId: string; meetRequired: boolean; meetUrl: string | null; canStart: boolean; startError: string | null; activeAttempt: boolean }) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(!meetRequired);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/odk/student/exams/${examId}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meetAcknowledged: acknowledged }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return setError(result.error || "Sınav oturumu başlatılamadı.");
      router.push(`/panel/odk/ogrenci/denemeler/${examId}/coz`);
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı. Sınav oturumu başlatılmadı; tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-3">
    <div className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4"><div className="flex items-start gap-3"><span className="panel-metric-icon panel-tone-mint"><ShieldCheck size={17} /></span><div><p className="font-bold text-[var(--site-ink)]">Başlamadan önce</p><p className="mt-1 text-sm leading-6 text-[var(--site-body)]">Süre sunucu tarafından doğrulanır. Cevapların her seçimde güvenli biçimde kaydedilir.</p></div></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-[var(--site-muted)]"><span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5"><Wifi size={12} /> Bağlantı geri gelince kayıt sürer</span><span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5"><CheckCircle2 size={12} /> Bekleyen cevap varken teslim kapanır</span></div></div>

    {meetRequired ? <section className="rounded-2xl border border-[var(--site-line)] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--panel-nav-active)] text-xs font-extrabold text-[var(--brand-olive)]">1</span><h2 className="font-bold text-[var(--site-ink)]">Meet gözetim odasına katıl</h2></div><p className="mt-3 text-sm leading-6 text-[var(--site-body)]">Sınav boyunca görüşmede kalman gerekiyor. Tarayıcı bağlantı sinyali Meet katılımının yerine geçmez.</p>{meetUrl ? <a href={meetUrl} target="_blank" rel="noreferrer" className="panel-secondary-button mt-3">Meet&apos;e gir <ExternalLink size={15} /></a> : <p role="alert" className="mt-3 rounded-xl bg-[var(--pd-pastel-blush-soft)] p-3 text-xs font-bold text-[var(--pd-pastel-blush-ink)]">Meet bağlantısı henüz tanımlanmadı.</p>}<label className="mt-4 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-[var(--site-line)] p-3 text-sm text-[var(--site-body)]"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" /><span>Meet odasına katıldım ve sınav boyunca görüşmede kalacağımı onaylıyorum.</span></label></section> : null}

    <section className="rounded-2xl border border-[var(--site-line)] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--panel-nav-active)] text-xs font-extrabold text-[var(--brand-olive)]">{meetRequired ? "2" : "1"}</span><h2 className="font-bold text-[var(--site-ink)]">{activeAttempt ? "Denemeye Devam Et" : "Denemeyi Başlat"}</h2></div><p className="mt-3 text-sm leading-6 text-[var(--site-body)]">{activeAttempt ? "Devam eden oturumun ve kalan süren korunuyor." : "Başlattığında süren işlemeye başlayacak. Cihazının şarjını ve bağlantını kontrol et."}</p><button type="button" onClick={start} disabled={busy || (!activeAttempt && (!canStart || !acknowledged))} className="panel-primary-button mt-4 w-full sm:w-auto">{busy ? <Loader2 size={17} className="animate-spin" /> : <PlayCircle size={17} />}{activeAttempt ? "Denemeye Devam Et" : "Denemeyi Başlat"}</button>{!activeAttempt && startError ? <p className="mt-3 rounded-xl bg-[var(--pd-pastel-yellow-soft)] p-3 text-sm font-semibold text-[var(--pd-pastel-yellow-ink)]">{startError}</p> : null}{error ? <p role="alert" className="mt-3 rounded-xl bg-[var(--pd-pastel-blush-soft)] p-3 text-sm font-semibold text-[var(--pd-pastel-blush-ink)]">{error}</p> : null}</section>
  </div>;
}
