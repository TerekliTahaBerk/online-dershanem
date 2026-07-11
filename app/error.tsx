"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="site-scope flex min-h-[70vh] items-center bg-[var(--site-bg-warm)] px-5 py-20">
      <div className="mx-auto w-full max-w-xl rounded-[28px] border border-[var(--site-line)] bg-white p-8 text-center shadow-[0_24px_70px_-44px_rgba(20,20,15,0.25)] sm:p-12">
        <p className="site-eyebrow">Beklenmeyen bir sorun oluştu</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,6vw,3.2rem)] leading-[1.05] tracking-[-0.03em] text-[var(--site-ink)]">
          Sayfayı birlikte geri getirelim.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-[var(--site-body)]">
          İşleminiz tamamlanamadı. Yeniden deneyebilir veya güvenle ana sayfaya dönebilirsiniz.
        </p>
        {error.digest ? (
          <p className="mt-3 text-[12px] text-[var(--site-muted)]">Hata kodu: {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="site-btn site-btn-primary site-btn-lg">
            Yeniden dene
          </button>
          <Link href="/" className="site-btn site-btn-secondary site-btn-lg">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </main>
  );
}
