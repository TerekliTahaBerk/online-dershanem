"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { authInputClass, authSubmitClass } from "@/components/auth/auth-card";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

/**
 * Kayıt formu.
 *
 * Parola kuralı client tarafında da gösterilir ama KARAR SUNUCUNUNDUR;
 * buradaki kontrol yalnızca kullanıcıyı boşuna bekletmemek içindir.
 * (Kural tek yerde: `lib/auth/password-policy.ts`.)
 */
export function RegisterForm() {
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => setReady(true), []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Parola en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`);
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = (await response.json()) as { redirect?: string; error?: string };

      if (!response.ok || !data.redirect) {
        setError(data.error ?? "Kayıt tamamlanamadı. Lütfen tekrar deneyin.");
        setPending(false);
        return;
      }

      // Oturum çerezi ilk panel isteğinde kesin ulaşsın diye tam sayfa geçişi.
      window.location.replace(data.redirect);
    } catch {
      setError("Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <label htmlFor="fullName" className="sr-only">
        Ad Soyad
      </label>
      <input
        id="fullName"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="Ad Soyad"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={pending}
        className={authInputClass}
      />

      <label htmlFor="email" className="sr-only">
        E-posta
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="E-posta"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={pending}
        className={authInputClass}
      />

      <label htmlFor="new-password" className="sr-only">
        Şifre
      </label>
      <input
        id="new-password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Şifre"
        required
        minLength={PASSWORD_MIN_LENGTH}
        aria-describedby="password-hint"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={pending}
        className={authInputClass}
      />
      <p id="password-hint" className="text-[12.5px] text-dc-ink-faint">
        En az {PASSWORD_MIN_LENGTH} karakter.
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

      <button
        type="submit"
        disabled={!ready || pending}
        aria-busy={!ready || pending}
        className={authSubmitClass}
      >
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Kayıt yapılıyor
          </span>
        ) : (
          "Kayıt Ol"
        )}
      </button>
    </form>
  );
}
