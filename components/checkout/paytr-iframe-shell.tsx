import Link from "next/link";
import { ShieldCheck, Pencil, AlertTriangle, Wrench } from "lucide-react";

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export type CheckoutBreadcrumbItem = {
  label: string;
  href?: string;
};

export type PaytrCheckoutResult =
  | { ok: true; iframeUrl: string }
  | { ok: false; userMessage: string };

type Props = {
  breadcrumb: CheckoutBreadcrumbItem[];
  eyebrow?: string;
  title: string;
  totalCents: number;
  editHref: string;
  paytrReady: boolean;
  checkout: PaytrCheckoutResult | null;
};

/**
 * Pair-style shell that hosts the PayTR iframe with our own summary header.
 * Shared by both OD (/paketler) and ODK (/odk-paketleri) payment pages.
 */
export function PaytrIframeShell({
  breadcrumb,
  eyebrow,
  title,
  totalCents,
  editHref,
  paytrReady,
  checkout,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="text-xs uppercase tracking-[0.18em] text-[var(--site-body)] mb-6"
      >
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {breadcrumb.map((item, idx) => {
            const isLast = idx === breadcrumb.length - 1;
            return (
              <li key={`${item.label}-${idx}`} className="flex items-center gap-2">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-[var(--site-ink)] transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-[var(--site-ink)]" : ""}>
                    {item.label}
                  </span>
                )}
                {!isLast && <span aria-hidden>/</span>}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Order summary header */}
      <section
        aria-label="Sipariş özeti"
        className="mb-6 rounded-[24px] border border-[var(--site-line)] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,15,0.04)] sm:p-8"
      >
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--brand-orange-ink)] font-semibold mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl sm:text-[28px] leading-tight text-[var(--site-ink)] mb-4">
          {title}
        </h1>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span className="font-display text-3xl sm:text-[34px] text-[var(--site-ink)]">
            {formatPrice(totalCents)}
          </span>
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--site-body)] hover:text-[var(--site-ink)] underline-offset-4 hover:underline transition-colors"
          >
            <Pencil className="size-3.5" aria-hidden />
            Bilgilerimi düzenle
          </Link>
        </div>
      </section>

      {/* States */}
      {!paytrReady && (
        <div
          role="alert"
          className="mb-6 flex gap-4 rounded-[16px] border border-amber-200 bg-amber-50/70 p-6"
        >
          <Wrench className="size-5 text-amber-700 flex-shrink-0 mt-0.5" aria-hidden />
          <div>
            <h2 className="font-display text-lg text-amber-950 mb-1">
              Ödeme sistemi şu anda yapılandırılıyor
            </h2>
            <p className="text-sm text-amber-900/90">
              Lütfen kısa süre içinde tekrar deneyin veya{" "}
              <Link href="/iletisim" className="underline font-medium">
                bizimle iletişime geçin
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {checkout && !checkout.ok && (
        <div
          role="alert"
          className="mb-6 flex gap-4 rounded-[16px] border border-rose-200 bg-rose-50/70 p-6"
        >
          <AlertTriangle className="size-5 text-rose-700 flex-shrink-0 mt-0.5" aria-hidden />
          <div>
            <h2 className="font-display text-lg text-rose-950 mb-1">
              Ödeme başlatılamadı
            </h2>
            <p className="text-sm text-rose-900/90">{checkout.userMessage}</p>
            <p className="text-xs mt-2 text-rose-900/70">
              Sorun devam ederse{" "}
              <Link href="/iletisim" className="underline font-medium">
                iletişime geçin
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {checkout && checkout.ok && (
        <section
          aria-label="Güvenli ödeme"
          className="overflow-hidden rounded-[24px] border border-[var(--site-line)] bg-white shadow-[0_1px_2px_rgba(20,20,15,0.04)]"
        >
          <iframe
            src={checkout.iframeUrl}
            title="PayTR Güvenli Ödeme"
            scrolling="no"
            style={{ width: "100%", minHeight: 720, border: 0 }}
          />
          <div className="px-5 sm:px-6 py-4 bg-[var(--site-bg-warm)] border-t border-[var(--site-line)] flex items-start gap-3 text-xs text-[var(--site-body)]">
            <ShieldCheck
              className="size-4 text-[var(--brand-orange-ink)] flex-shrink-0 mt-px"
              aria-hidden
            />
            <p>
              Ödemeniz <strong className="text-[var(--site-ink)]">PayTR</strong>{" "}
              güvenli ödeme altyapısı üzerinden gerçekleştirilir. Kart
              bilgileriniz sitemizde saklanmaz; 3D Secure desteklenir.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
