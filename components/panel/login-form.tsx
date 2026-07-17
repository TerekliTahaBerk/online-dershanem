"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * Panel giriş formu.
 *
 * Sunucudan gelen hata mesajı OLDUĞU GİBİ gösterilir — hangi alanın yanlış
 * olduğunu client tarafında tahmin etmeye çalışmaz. Sunucu bilerek "e-posta mı
 * parola mı" ayrımı yapmıyor (kullanıcı sayımına karşı); burada da yapmamalıyız.
 */
export function LoginForm() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Safari/WebKit ilk yüklemede kullanıcı etkileşimini hydration'dan önce
  // iletebilir. Handler bağlanmadan submit edilmesini açıkça engelle.
  useEffect(() => setReady(true), []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { redirect?: string; error?: string };

      if (!response.ok || !data.redirect) {
        setError(data.error ?? "Giriş yapılamadı. Lütfen tekrar deneyin.");
        setPending(false);
        return;
      }

      // Kimlik doğrulama sınırında tam sayfa geçişi bilinçli: yeni HttpOnly
      // oturum çerezi ilk panel isteğinde kesin olarak sunucuya ulaşır ve aynı
      // anda replace + refresh kaynaklı çift RSC render'ı oluşmaz.
      window.location.replace(data.redirect);
    } catch {
      setError("Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-[13px] font-semibold text-[var(--site-ink)]">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          className="rounded-[12px] border border-[var(--site-line)] bg-white px-4 py-3 text-[15px] text-[var(--site-ink)] outline-none transition-colors focus-visible:border-[var(--brand-olive)] focus-visible:ring-2 focus-visible:ring-[var(--brand-olive-soft)] disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-[13px] font-semibold text-[var(--site-ink)]">
          Parola
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          className="rounded-[12px] border border-[var(--site-line)] bg-white px-4 py-3 text-[15px] text-[var(--site-ink)] outline-none transition-colors focus-visible:border-[var(--brand-olive)] focus-visible:ring-2 focus-visible:ring-[var(--brand-olive-soft)] disabled:opacity-60"
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

      <button
        type="submit"
        disabled={!ready || pending}
        aria-busy={!ready || pending}
        className="site-btn site-btn-primary site-btn-lg mt-2 w-full disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Giriş yapılıyor
          </>
        ) : (
          <>
            Giriş yap <ArrowRight size={17} aria-hidden="true" />
          </>
        )}
      </button>

      <p className="mt-1 text-center text-[12.5px] leading-6 text-[var(--site-muted)]">
        Parolanızı ekibimiz iletti. Unuttuysanız bize yazın, yenisini oluşturalım.
      </p>
    </form>
  );
}
