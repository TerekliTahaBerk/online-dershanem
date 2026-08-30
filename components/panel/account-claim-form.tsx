"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

/**
 * HESAP DEVRALMA FORMU.
 *
 * TEK ADIMDA toplanır: parola, (varsa) öğrenci bağlantısı teyidi ve temel
 * tercihler. Sihirbaz yapılmadı çünkü her adım bir terk noktasıdır ve
 * kullanıcı buraya ödemesini yaptıktan sonra geliyor — sorulacak üç şey tek
 * ekrana sığıyor.
 *
 * Token yalnız URL FRAGMENT'inden okunur ve yalnız POST gövdesinde gönderilir;
 * `reset-password` akışıyla aynı kural. Sorgu dizesine yazılsaydı erişim
 * loglarına ve Referer başlığına düşerdi.
 */

const DAYS = [
  { id: 1, label: "Pzt", full: "Pazartesi" },
  { id: 2, label: "Sal", full: "Salı" },
  { id: 3, label: "Çar", full: "Çarşamba" },
  { id: 4, label: "Per", full: "Perşembe" },
  { id: 5, label: "Cum", full: "Cuma" },
  { id: 6, label: "Cmt", full: "Cumartesi" },
  { id: 7, label: "Paz", full: "Pazar" },
];

type Claim = {
  audience: "STUDENT" | "PARENT";
  email: string;
  fullName: string | null;
  pendingRelationship: { studentProfileId: string; studentName: string } | null;
};

const field =
  "rounded-[12px] border border-[var(--site-line)] bg-white px-4 py-3 text-[15px] text-[var(--site-ink)] outline-none focus-visible:border-[var(--brand-olive)] focus-visible:ring-2 focus-visible:ring-[var(--brand-olive-soft)] disabled:opacity-60";

export function AccountClaimForm() {
  const [token, setToken] = useState<string | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [relationship, setRelationship] = useState<"CONFIRM" | "REJECT" | "">("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [minutesPerDay, setMinutesPerDay] = useState(45);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<"CONFIRMED" | "REJECTED" | "PLAIN" | null>(null);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const value = fragment.get("token") ?? "";
    setToken(value);
    if (!value) {
      setLoadError("Bu davet bağlantısı geçersiz. E-postadaki bağlantıyı tam olarak kopyalayın.");
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/auth/account-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", token: value }),
        });
        const data = (await response.json()) as Claim & { error?: string };
        if (!response.ok) {
          setLoadError(data.error ?? "Bu davet kullanılamıyor.");
          return;
        }
        setClaim(data);
      } catch {
        setLoadError("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
      }
    })();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!token || !claim) return;
    if (password !== repeat) {
      setError("Parolalar birbiriyle eşleşmiyor.");
      return;
    }
    if (claim.pendingRelationship && !relationship) {
      setError("Öğrenci bağlantısı için bir seçim yapın.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/account-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          token,
          password,
          ...(relationship ? { relationshipDecision: relationship } : {}),
          preferences: {
            emailEnabled,
            ...(claim.audience === "STUDENT" ? { availableDays, minutesPerDay } : {}),
          },
        }),
      });
      const data = (await response.json()) as { ok?: boolean; relationship?: "CONFIRMED" | "REJECTED" | null; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Hesap kurulamadı.");
        setPending(false);
        return;
      }
      setDone(data.relationship ?? "PLAIN");
    } catch {
      setError("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
      setPending(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-4 text-[14.5px] leading-7 text-[var(--site-body)]">
        <p className="font-semibold text-[var(--site-ink)]">Hesabınız hazır.</p>
        {done === "REJECTED" ? (
          <p>Bağlantıyı kaldırdık ve ekibimize bildirdik; doğru öğrenciyi bağlamak için sizinle iletişime geçecekler.</p>
        ) : (
          <p>Artık yeni parolanızla giriş yapabilirsiniz. Panelde sizi bekleyen kısa bir kurulum listesi var.</p>
        )}
        <Link href="/giris" className="site-btn site-btn-primary site-btn-lg w-full justify-center">Giriş yap</Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="flex flex-col gap-4 text-[14.5px] leading-7 text-rose-800">
        <p>{loadError}</p>
        <Link href="/parolami-unuttum" className="font-semibold text-[var(--brand-olive)] underline">
          Zaten hesabınız varsa parolanızı yenileyin.
        </Link>
      </div>
    );
  }

  if (!claim) {
    return <p role="status" className="text-center text-[14px] text-[var(--site-muted)]">Davet doğrulanıyor…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <p className="text-[14px] leading-6 text-[var(--site-body)]">
        <span className="font-semibold text-[var(--site-ink)]">{claim.email}</span> için hesap kuruluyor.
      </p>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="text-[13px] font-semibold text-[var(--site-ink)]">Parolanız</legend>
        <div className="flex flex-col gap-2">
          <label htmlFor="claim-password" className="text-[13px] font-semibold text-[var(--site-ink)]">Yeni parola</label>
          <input id="claim-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} aria-describedby="claim-password-hint" className={field} />
          <p id="claim-password-hint" className="text-[12.5px] leading-5 text-[var(--site-muted)]">En az {PASSWORD_MIN_LENGTH} karakter. Uzun ve hatırlayabileceğiniz bir cümle seçin.</p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="claim-password-repeat" className="text-[13px] font-semibold text-[var(--site-ink)]">Yeni parola (tekrar)</label>
          <input id="claim-password-repeat" type="password" autoComplete="new-password" required value={repeat} onChange={(event) => setRepeat(event.target.value)} disabled={pending} className={field} />
        </div>
      </fieldset>

      {claim.pendingRelationship ? (
        <fieldset className="flex flex-col gap-3 rounded-[16px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4">
          <legend className="px-1 text-[13px] font-semibold text-[var(--site-ink)]">Öğrenci bağlantısı</legend>
          <p className="text-[13.5px] leading-6 text-[var(--site-body)]">
            Hesabınıza <span className="font-semibold text-[var(--site-ink)]">{claim.pendingRelationship.studentName}</span> bağlandı. Doğru mu?
          </p>
          <label className="flex items-start gap-3 text-[13.5px] leading-6 text-[var(--site-body)]">
            <input type="radio" name="relationship" value="CONFIRM" checked={relationship === "CONFIRM"} onChange={() => setRelationship("CONFIRM")} disabled={pending} className="mt-1" />
            <span>Evet, bu benim çocuğum.</span>
          </label>
          <label className="flex items-start gap-3 text-[13.5px] leading-6 text-[var(--site-body)]">
            <input type="radio" name="relationship" value="REJECT" checked={relationship === "REJECT"} onChange={() => setRelationship("REJECT")} disabled={pending} className="mt-1" />
            <span>Hayır, tanımıyorum. <span className="text-[var(--site-muted)]">Bağlantıyı hemen kaldırırız.</span></span>
          </label>
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="text-[13px] font-semibold text-[var(--site-ink)]">Başlangıç tercihleri</legend>
        {claim.audience === "STUDENT" ? (
          <>
            <div className="flex flex-col gap-2">
              <span id="claim-days-label" className="text-[13px] font-semibold text-[var(--site-ink)]">Hangi günler çalışabilirsin?</span>
              <div role="group" aria-labelledby="claim-days-label" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {DAYS.map((day) => {
                  const selected = availableDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      aria-pressed={selected}
                      aria-label={day.full}
                      disabled={pending}
                      onClick={() => setAvailableDays((current) => (current.includes(day.id) ? current.filter((id) => id !== day.id) : [...current, day.id].sort()))}
                      className={`rounded-[12px] px-2 py-2.5 text-[13px] font-bold transition ${selected ? "bg-[var(--brand-olive)] text-white" : "border border-[var(--site-line)] bg-white text-[var(--site-ink)]"}`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12.5px] leading-5 text-[var(--site-muted)]">Haftalık planın bu günlere göre oluşur; sonra istediğin zaman değiştirebilirsin.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="claim-minutes" className="text-[13px] font-semibold text-[var(--site-ink)]">Bir günde ayırabileceğin süre</label>
              <select id="claim-minutes" value={minutesPerDay} onChange={(event) => setMinutesPerDay(Number(event.target.value))} disabled={pending} className={field}>
                {[20, 30, 45, 60, 90].map((value) => <option key={value} value={value}>{value} dakika</option>)}
              </select>
            </div>
          </>
        ) : null}
        <label className="flex items-start gap-3 text-[13.5px] leading-6 text-[var(--site-body)]">
          <input type="checkbox" checked={emailEnabled} onChange={(event) => setEmailEnabled(event.target.checked)} disabled={pending} className="mt-1" />
          <span>Ders özeti ve haftalık gelişim bilgilendirmelerini e-posta ile almak istiyorum. <span className="text-[var(--site-muted)]">Panelden her zaman kapatabilirsiniz.</span></span>
        </label>
      </fieldset>

      {error ? <p role="alert" aria-live="assertive" className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-800">{error}</p> : null}

      <button type="submit" disabled={pending} aria-busy={pending} className="site-btn site-btn-primary site-btn-lg w-full justify-center disabled:opacity-70">
        {pending ? <><Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Kuruluyor</> : "Hesabımı kur"}
      </button>
    </form>
  );
}
