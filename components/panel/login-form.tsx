"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { authInputClass, authSubmitClass } from "@/components/auth/auth-card";

/**
 * Panel giriş formu.
 *
 * Sunucudan gelen hata mesajı OLDUĞU GİBİ gösterilir — hangi alanın yanlış
 * olduğunu client tarafında tahmin etmeye çalışmaz. Sunucu bilerek "e-posta mı
 * parola mı" ayrımı yapmıyor (kullanıcı sayımına karşı); burada da yapmamalıyız.
 */
export function LoginForm({
  resetSuccess = false,
  registered = false,
}: {
  resetSuccess?: boolean;
  registered?: boolean;
}) {
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
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      {/* Tasarımda alanlar yalnız placeholder gösteriyor; etiketler ekran
          okuyucu için sr-only olarak korunur (§38). */}
      <label htmlFor="email" className="sr-only">
        E-posta
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        placeholder="E-posta"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={pending}
        className={authInputClass}
      />

      <label htmlFor="password" className="sr-only">
        Şifre
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Şifre"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={pending}
        className={authInputClass}
      />

      {registered ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] text-emerald-800"
        >
          Hesabınız hazır. Giriş yaparak devam edebilirsiniz.
        </p>
      ) : null}

      {resetSuccess ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] text-emerald-800"
        >
          Parolanız yenilendi. Yeni parolanızla giriş yapabilirsiniz.
        </p>
      ) : null}

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
            Giriş yapılıyor
          </span>
        ) : (
          "Giriş Yap"
        )}
      </button>

      <Link
        href="/parolami-unuttum"
        className="mt-3 text-center text-[13px] text-dc-ink-faint hover:text-dc-ink"
      >
        Şifremi unuttum
      </Link>
    </form>
  );
}
