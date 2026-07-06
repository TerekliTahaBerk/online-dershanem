"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, MessageCircle } from "lucide-react";
import { waHref } from "@/lib/site-content";

/**
 * Giriş formu (client).
 *
 * Dürüstlük notu: Online Dershanem'de public self-register veya self-serve
 * öğrenci paneli YOKTUR (bkz. README). Öğrenci erişimi, ders paketi başladığında
 * ekip tarafından sağlanır. Bu yüzden form sahte bir "giriş" taklidi yapmaz;
 * gönderimde gerçek ve işlevsel bir yönlendirme (WhatsApp / iletişim) sunar.
 */
export function LoginForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      className="mt-8 flex flex-col gap-4"
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
          className="min-h-[52px] w-full rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-4 py-3.5 text-[15px] text-[var(--site-ink)] outline-none transition-colors placeholder:text-[var(--site-muted)] focus:border-[var(--brand-orange)]"
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
          className="min-h-[52px] w-full rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-4 py-3.5 text-[15px] text-[var(--site-ink)] outline-none transition-colors placeholder:text-[var(--site-muted)] focus:border-[var(--brand-orange)]"
        />
      </div>

      <button type="submit" className="site-btn site-btn-primary site-btn-lg mt-1 w-full">
        Giriş yap
      </button>

      <p className="flex items-center justify-center gap-1.5 text-center text-[12.5px] text-[var(--site-muted)]">
        <Lock size={13} aria-hidden="true" />
        Giriş bilgilerin ders paketin başladığında ekibimiz tarafından oluşturulur.
      </p>

      {submitted ? (
        <div
          role="status"
          className="rounded-2xl border border-[var(--site-line)] bg-[var(--brand-orange-tint)] p-4 text-[14px] leading-6 text-[var(--site-body)]"
        >
          <p className="font-semibold text-[var(--site-ink)]">Öğrenci girişi ekibimiz üzerinden sağlanıyor.</p>
          <p className="mt-1">
            Henüz self-servis giriş bulunmuyor. Giriş bilgilerin veya ders bağlantıların için bize
            yazabilirsin.
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
      ) : null}
    </form>
  );
}
