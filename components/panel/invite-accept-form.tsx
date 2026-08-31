"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authInputClass, authSubmitClass } from "@/components/auth/auth-card";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

export function InviteAcceptForm({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword !== repeatPassword) {
      setError("Parolalar birbiriyle eşleşmiyor.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = (await response.json()) as { redirect?: string; error?: string };
      if (!response.ok || !data.redirect) {
        setError(data.error ?? "Davet doğrulanamadı.");
        setPending(false);
        return;
      }
      window.location.replace(data.redirect);
    } catch {
      setError("Bağlantı kurulamadı. Tekrar deneyin.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <label htmlFor="invite-new-password" className="sr-only">
        Yeni parola
      </label>
      <input
        id="invite-new-password"
        type="password"
        autoComplete="new-password"
        required
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        placeholder="Yeni parola"
        disabled={pending}
        className={authInputClass}
      />

      <label htmlFor="invite-repeat-password" className="sr-only">
        Yeni parola (tekrar)
      </label>
      <input
        id="invite-repeat-password"
        type="password"
        autoComplete="new-password"
        required
        value={repeatPassword}
        onChange={(event) => setRepeatPassword(event.target.value)}
        placeholder="Yeni parola (tekrar)"
        disabled={pending}
        className={authInputClass}
      />

      <p className="text-[12.5px] leading-5 text-dc-ink-muted">
        En az {PASSWORD_MIN_LENGTH} karakter. Bu parola hesabınıza ilk giriş için kaydedilir.
      </p>

      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-800"
        >
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={authSubmitClass}>
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Hesap hazırlanıyor
          </span>
        ) : (
          "Hesabı etkinleştir"
        )}
      </button>
    </form>
  );
}
