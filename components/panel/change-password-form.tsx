"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Tekrar alanı yalnızca client'ta anlamlı — sunucuya gönderilmez.
    if (newPassword !== repeat) {
      setError("Yeni parolalar birbiriyle eşleşmiyor.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as { redirect?: string; error?: string };

      if (!response.ok || !data.redirect) {
        setError(data.error ?? "Parola değiştirilemedi.");
        setPending(false);
        return;
      }

      router.replace(data.redirect);
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı. Tekrar deneyin.");
      setPending(false);
    }
  }

  const field =
    "rounded-[12px] border border-[var(--site-line)] bg-white px-4 py-3 text-[15px] text-[var(--site-ink)] outline-none transition-colors focus-visible:border-[var(--brand-olive)] focus-visible:ring-2 focus-visible:ring-[var(--brand-olive-soft)] disabled:opacity-60";

  return (
    <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="currentPassword" className="text-[13px] font-semibold text-[var(--site-ink)]">
          {forced ? "Size iletilen geçici parola" : "Mevcut parolanız"}
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={pending}
          className={field}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="newPassword" className="text-[13px] font-semibold text-[var(--site-ink)]">
          Yeni parola
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={pending}
          aria-describedby="password-hint"
          className={field}
        />
        <p id="password-hint" className="text-[12.5px] leading-5 text-[var(--site-muted)]">
          En az {PASSWORD_MIN_LENGTH} karakter. Büyük harf veya sembol zorunlu değil — uzun ve
          hatırlayabileceğiniz bir cümle en iyisidir.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="repeat" className="text-[13px] font-semibold text-[var(--site-ink)]">
          Yeni parola (tekrar)
        </label>
        <input
          id="repeat"
          type="password"
          autoComplete="new-password"
          required
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          disabled={pending}
          className={field}
        />
      </div>

      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-800"
        >
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="site-btn site-btn-primary site-btn-lg mt-2 w-full disabled:opacity-70">
        {pending ? (
          <>
            <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Kaydediliyor
          </>
        ) : (
          "Parolayı kaydet"
        )}
      </button>
    </form>
  );
}
