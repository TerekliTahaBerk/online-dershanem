"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, ExternalLink, Loader2, PlayCircle } from "lucide-react";
import { buttonClass } from "@/components/panel/primitives";

/**
 * Deneme başlatma (docs/panel-design-roadmap.md §11.3). Başlatma ucu ve
 * Meet onayı değişmedi (`/api/odk/student/exams/[id]/start`, idempotent).
 * Eklenenler yalnız sunum: hazırlık kontrolü (bağlantı, ekran genişliği,
 * Meet) ve "süre sunucuda başlar" onay adımı. Devam eden oturum onaysız açılır.
 */
export function StudentExamStart({
  examId,
  meetRequired,
  meetUrl,
  canStart,
  startError,
  activeAttempt,
  durationMinutes,
}: {
  examId: string;
  meetRequired: boolean;
  meetUrl: string | null;
  canStart: boolean;
  startError: string | null;
  activeAttempt: boolean;
  durationMinutes?: number;
}) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(!meetRequired);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [online, setOnline] = useState(true);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setNarrow(window.innerWidth < 768);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/odk/student/exams/${examId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetAcknowledged: acknowledged }),
      });
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

  const checks: Array<{ ok: boolean; label: string; hint?: string }> = [
    { ok: online, label: online ? "İnternet bağlantın açık" : "İnternet bağlantısı yok", hint: online ? undefined : "Bağlantı gelince yeniden dene." },
    {
      ok: !narrow,
      label: narrow ? "Ekranın dar" : "Ekran genişliği uygun",
      hint: narrow ? "Telefonda kitapçığı kâğıttan çözüp Cevaplar görünümünü kullanabilirsin." : undefined,
    },
    ...(meetRequired
      ? [{ ok: acknowledged, label: acknowledged ? "Meet odasına katıldığını onayladın" : "Meet odasına katıl ve onayla" }]
      : []),
  ];
  const disabled = busy || (!activeAttempt && (!canStart || !acknowledged || !online));

  return (
    <div className="space-y-5">
      {!activeAttempt ? (
        <div>
          <h3 className="text-[13.5px] font-semibold text-pn-text">Hazırlık kontrolü</h3>
          <ul className="mt-2 border-t border-pn-border">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2 border-b border-pn-border py-2 text-[14px]">
                {check.ok ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-(--pn-tone-success)" aria-hidden="true" />
                ) : (
                  <CircleAlert size={16} className="mt-0.5 shrink-0 text-(--pn-tone-warning)" aria-hidden="true" />
                )}
                <span>
                  <span className="text-pn-text">{check.label}</span>
                  <span className="sr-only">{check.ok ? " (tamam)" : " (dikkat)"}</span>
                  {check.hint ? <span className="block text-[12.5px] text-pn-text-muted">{check.hint}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {meetRequired && !activeAttempt ? (
        <div>
          <h3 className="text-[13.5px] font-semibold text-pn-text">Meet gözetim odası</h3>
          <p className="mt-1 text-[14px] text-pn-text-secondary">
            Sınav boyunca görüşmede kalman gerekiyor. Tarayıcı bağlantı sinyali Meet katılımının yerine geçmez.
          </p>
          {meetUrl ? (
            <a href={meetUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md", "mt-2")}>
              Meet&apos;e gir <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : (
            <p role="alert" className="mt-2 rounded-md bg-(--pn-tone-critical-soft) px-3 py-2 text-[13px] font-medium text-(--pn-tone-critical)">
              Meet bağlantısı henüz tanımlanmadı.
            </p>
          )}
          <label className="mt-3 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border border-pn-border p-3 text-[14px] text-pn-text">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            <span>Meet odasına katıldım ve sınav boyunca görüşmede kalacağımı onaylıyorum.</span>
          </label>
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-1 bg-white px-1 py-3 sm:static sm:p-0">
        {activeAttempt ? (
          <p className="mb-2 text-[14px] text-pn-text-secondary">Devam eden oturumun ve kalan süren korunuyor.</p>
        ) : null}
        {!activeAttempt && confirming ? (
          <div role="group" aria-label="Başlatma onayı" className="rounded-md border border-pn-border p-3">
            <p className="text-[14px] text-pn-text">
              Başlattığında {durationMinutes ? `${durationMinutes} dakikalık ` : ""}süren sunucuda işlemeye başlar ve durdurulamaz.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={start} disabled={disabled} className={buttonClass("primary", "md")}>
                {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <PlayCircle size={16} aria-hidden="true" />}
                Başlat
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={buttonClass("ghost", "md")}>
                Vazgeç
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={activeAttempt ? start : () => setConfirming(true)}
            disabled={disabled}
            className={buttonClass("primary", "md", "w-full sm:w-auto")}
          >
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <PlayCircle size={16} aria-hidden="true" />}
            {activeAttempt ? "Denemeye Devam Et" : "Denemeyi Başlat"}
          </button>
        )}
        {!activeAttempt && startError ? (
          <p className="mt-3 rounded-md bg-(--pn-tone-warning-soft) px-3 py-2 text-[13.5px] font-medium text-(--pn-tone-warning)">{startError}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 rounded-md bg-(--pn-tone-critical-soft) px-3 py-2 text-[13.5px] font-medium text-(--pn-tone-critical)">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
