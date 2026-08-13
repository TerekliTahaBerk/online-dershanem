"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok || !data.message) {
        setError(data.error ?? "İstek tamamlanamadı. Lütfen tekrar deneyin.");
        setPending(false);
        return;
      }
      setMessage(data.message);
    } catch {
      setError("Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.");
      setPending(false);
    }
  }

  if (message) {
    return (
      <div role="status" aria-live="polite" className="text-center">
        <MailCheck className="mx-auto text-[var(--brand-olive)]" size={36} aria-hidden="true" />
        <p className="mt-4 text-[15px] leading-7 text-[var(--site-body)]">{message}</p>
        <p className="mt-2 text-[13px] leading-6 text-[var(--site-muted)]">E-postadaki bağlantı 60 dakika geçerlidir. Gelen kutunuzda yoksa spam klasörünü de kontrol edin.</p>
        <Link href="/giris" className="site-btn site-btn-primary mt-6 inline-flex">
          <ArrowLeft size={16} aria-hidden="true" /> Girişe dön
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="reset-email" className="text-[13px] font-semibold text-[var(--site-ink)]">E-posta</label>
        <input id="reset-email" name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} className="rounded-[12px] border border-[var(--site-line)] bg-white px-4 py-3 text-[15px] text-[var(--site-ink)] outline-none focus-visible:border-[var(--brand-olive)] focus-visible:ring-2 focus-visible:ring-[var(--brand-olive-soft)] disabled:opacity-60" />
      </div>
      {error ? <p role="alert" aria-live="assertive" className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-800">{error}</p> : null}
      <button type="submit" disabled={pending} aria-busy={pending} className="site-btn site-btn-primary site-btn-lg mt-2 w-full disabled:opacity-70">
        {pending ? <><Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Gönderiliyor</> : "Yenileme bağlantısı gönder"}
      </button>
      <Link href="/giris" className="mt-1 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--brand-olive)] hover:underline"><ArrowLeft size={14} aria-hidden="true" /> Girişe dön</Link>
    </form>
  );
}
