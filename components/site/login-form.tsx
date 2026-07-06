"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, MessageCircle } from "lucide-react";
import { waHref } from "@/lib/site-content";

/**
 * Giriş formu (client).
 *
 * Mevcut öğrenciler için sade giriş yüzeyi. Kimlik doğrulama servisi bu public
 * uygulamada bulunmadığından gönderim, çalışan destek kanallarına yönlendirir.
 */
export function LoginForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      className="mt-12 flex flex-col gap-6"
      noValidate
    >
      <div>
        <label htmlFor="login-email" className="sr-only">
          E-posta adresi
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="E-posta adresi"
          className="min-h-[68px] w-full rounded-full border-0 bg-[#f3f3f2] px-7 py-5 text-[17px] text-[var(--site-ink)] outline-none ring-1 ring-transparent transition placeholder:text-[var(--site-muted)] focus:ring-[var(--brand-orange)] sm:min-h-[76px] sm:text-[20px]"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="sr-only">
          Şifre
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Şifre"
          className="min-h-[68px] w-full rounded-full border-0 bg-[#f3f3f2] px-7 py-5 text-[17px] text-[var(--site-ink)] outline-none ring-1 ring-transparent transition placeholder:text-[var(--site-muted)] focus:ring-[var(--brand-orange)] sm:min-h-[76px] sm:text-[20px]"
        />
      </div>

      <button type="submit" className="site-btn site-btn-primary mt-3 min-h-[68px] w-full text-[18px] sm:min-h-[76px] sm:text-[20px]">
        Giriş yap
      </button>

      <p className="flex items-center justify-center gap-1.5 text-center text-[12.5px] text-[var(--site-muted)]">
        <Lock size={13} aria-hidden="true" />
        Giriş desteği yalnızca mevcut öğrenciler içindir.
      </p>

      {submitted ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[var(--brand-orange)]/35 bg-[var(--brand-orange-tint)] p-4"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
              <MessageCircle size={17} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[var(--site-ink)]">
                Giriş desteği gerekiyor.
              </p>
              <p className="mt-1 text-[14px] leading-6 text-[var(--site-body)]">
                Giriş bilgilerin veya ders bağlantın için destek ekibimize doğrudan yazabilirsin.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--brand-orange-ink)] hover:underline"
                >
                  <MessageCircle size={15} aria-hidden="true" />
                  WhatsApp destek
                </a>
                <Link href="/iletisim/" className="text-[14px] font-semibold text-[var(--brand-orange-ink)] hover:underline">
                  İletişim
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
