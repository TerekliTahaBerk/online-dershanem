"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Panel hata durumu — bölüm açılamadığında gösterilen ortak ekran
 * (docs/panel-design-roadmap.md §8.8). İnsan diliyle özet, yeniden dene,
 * güvenli bir çıkış bağlantısı ve destek için kısa hata kodu.
 */
export function PanelErrorState({
  error,
  reset,
  homeHref = "/panel",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
}) {
  return (
    <main className="pn-scope grid min-h-[70vh] place-items-center px-4 py-12">
      <section className="w-full max-w-[480px]" role="alert">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-(--pn-tone-warning-soft) text-(--pn-tone-warning)">
          <AlertTriangle size={20} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-[20px] font-bold tracking-[-0.015em] text-dc-ink">
          Bu bölüm şu an açılamadı
        </h1>
        <p className="mt-2 text-[14px] leading-[1.6] text-dc-ink-body">
          Bilgileriniz güvende. Bağlantı kısa süreli kesilmiş olabilir; sayfayı
          yeniden deneyebilirsiniz. Sorun sürerse destek ekibine aşağıdaki kodu
          iletin.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-dc-ink px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-black"
          >
            <RefreshCw size={15} aria-hidden="true" />
            Yeniden dene
          </button>
          <Link
            href={homeHref}
            className="inline-flex min-h-10 items-center rounded-md border border-dc-line px-4 text-[13.5px] font-semibold text-dc-ink transition-colors hover:bg-dc-surface-muted"
          >
            Ana sayfaya dön
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-4 font-mono text-[12px] text-dc-ink-muted">
            Hata kodu: {error.digest}
          </p>
        ) : null}
      </section>
    </main>
  );
}
