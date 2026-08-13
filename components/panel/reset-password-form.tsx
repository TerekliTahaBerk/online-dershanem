"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

export function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    setToken(fragment.get("token") ?? "");
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError("Bu parola yenileme bağlantısı geçersiz.");
      return;
    }
    if (newPassword !== repeat) {
      setError("Yeni parolalar birbiriyle eşleşmiyor.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await response.json() as { redirect?: string; error?: string };
      if (!response.ok || !data.redirect) {
        setError(data.error ?? "Parola yenilenemedi.");
        setPending(false);
        return;
      }
      window.location.replace(data.redirect);
    } catch {
      setError("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
      setPending(false);
    }
  }

  if (token === null) {
    return <p role="status" className="text-center text-[14px] text-[var(--site-muted)]">Bağlantı doğrulanıyor…</p>;
  }

  if (!token) {
    return <div role="alert" className="text-center text-[14px] leading-7 text-rose-800">Bu parola yenileme bağlantısı geçersiz. <Link href="/parolami-unuttum" className="font-semibold underline">Yeni bağlantı isteyin.</Link></div>;
  }

  const field = "rounded-[12px] border border-[var(--site-line)] bg-white px-4 py-3 text-[15px] text-[var(--site-ink)] outline-none focus-visible:border-[var(--brand-olive)] focus-visible:ring-2 focus-visible:ring-[var(--brand-olive-soft)] disabled:opacity-60";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="new-password" className="text-[13px] font-semibold text-[var(--site-ink)]">Yeni parola</label>
        <input id="new-password" type="password" autoComplete="new-password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={pending} aria-describedby="reset-password-hint" className={field} />
        <p id="reset-password-hint" className="text-[12.5px] leading-5 text-[var(--site-muted)]">En az {PASSWORD_MIN_LENGTH} karakter. Uzun ve hatırlayabileceğiniz bir cümle seçin.</p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="repeat-password" className="text-[13px] font-semibold text-[var(--site-ink)]">Yeni parola (tekrar)</label>
        <input id="repeat-password" type="password" autoComplete="new-password" required value={repeat} onChange={(event) => setRepeat(event.target.value)} disabled={pending} className={field} />
      </div>
      {error ? <p role="alert" aria-live="assertive" className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-800">{error}</p> : null}
      <button type="submit" disabled={pending} aria-busy={pending} className="site-btn site-btn-primary site-btn-lg mt-2 w-full disabled:opacity-70">
        {pending ? <><Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Kaydediliyor</> : "Parolayı yenile"}
      </button>
    </form>
  );
}
