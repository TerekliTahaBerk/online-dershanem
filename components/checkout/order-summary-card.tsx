"use client";

import Link from "next/link";
import { ShoppingBag, ShieldCheck, Lock } from "lucide-react";

export type OrderSummaryItem = {
  id?: string;
  /** Üst başlık — örn: "TYT-AYT" */
  category?: string;
  /** Ana ad — örn: "Matematik" */
  name: string;
  /** Alt etiket — örn: "180 gün erişim" */
  subtitle?: string;
  /** Birim fiyat (kuruş) */
  priceCents: number;
  /** Adet (default 1) */
  qty?: number;
};

type Props = {
  items: OrderSummaryItem[];
  /** Indirim kodu (opsiyonel) */
  couponCode?: string | null;
  /** "Sepete dön" link href (göstermek için) */
  backHref?: string;
  backLabel?: string;
  /** Eyebrow yazısı — default "Güvenli Ödeme" */
  eyebrow?: string;
  /** Üst başlık — default "Sipariş Özeti" */
  title?: string;
  className?: string;
};

function formatTRY(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * "₺2.000,00" veya "2.000,00 TL" gibi TR formatındaki fiyat string'inden
 * cents değerini parse eder. Parse edilemezse 0 döner.
 */
export function parseTRYToCents(input: string | null | undefined): number {
  if (!input) return 0;
  const cleaned = input
    .replace(/[^0-9.,]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

/**
 * Pair-stil sticky sipariş özeti kartı — checkout/sepet sayfalarında kullanılır.
 * Ürün listesi, ara toplam, toplam, PayTR güvenlik notu ve sepete dön linkini içerir.
 */
export function OrderSummaryCard({
  items,
  couponCode,
  backHref,
  backLabel = "← Sepete dön / düzenle",
  title = "Sipariş Özeti",
  className = "",
}: Props) {
  const itemCount = items.reduce((acc, i) => acc + (i.qty ?? 1), 0);
  const totalCents = items.reduce(
    (acc, i) => acc + i.priceCents * (i.qty ?? 1),
    0,
  );

  return (
    <aside className={`lg:sticky lg:top-24 lg:self-start ${className}`.trim()}>
      <div className="rounded-[16px] border border-[var(--od-line)] bg-[var(--od-paper)] p-6 shadow-[0_1px_2px_rgba(20,20,15,0.04)]">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[20px] tracking-tight text-[var(--od-ink)]">
            {title}
          </h2>
          <span className="text-[12px] text-[var(--od-ink-soft)]">
            {itemCount} ürün
          </span>
        </div>

        <ul className="mt-5 space-y-4 divide-y divide-[var(--od-line)]">
          {items.map((it, idx) => (
            <li key={it.id ?? idx} className="flex gap-3 pt-4 first:pt-0">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                <ShoppingBag size={18} strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                {it.category && (
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--od-olive)]">
                    {it.category}
                  </div>
                )}
                <div className="text-[13px] font-semibold text-[var(--od-ink)] truncate">
                  {it.name}
                </div>
                {(it.subtitle || (it.qty && it.qty > 1)) && (
                  <div className="mt-0.5 text-[11.5px] text-[var(--od-ink-soft)]">
                    {it.subtitle}
                    {it.subtitle && it.qty && it.qty > 1 ? " · " : ""}
                    {it.qty && it.qty > 1 ? `${it.qty} adet` : ""}
                  </div>
                )}
              </div>
              <div className="text-right text-[13px] font-semibold text-[var(--od-ink)] whitespace-nowrap">
                {formatTRY(it.priceCents * (it.qty ?? 1))}
              </div>
            </li>
          ))}
        </ul>

        {couponCode && (
          <div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-[12.5px]">
            <span className="text-emerald-800">
              Kupon: <strong>{couponCode}</strong>
            </span>
            <span className="text-emerald-700 text-[11.5px]">
              Ödeme adımında uygulanır
            </span>
          </div>
        )}

        <div className="mt-5 space-y-2 border-t border-[var(--od-line)] pt-4 text-[13px]">
          <div className="flex justify-between text-[var(--od-ink-soft)]">
            <span>Ara toplam</span>
            <span>{formatTRY(totalCents)}</span>
          </div>
          <div className="flex items-baseline justify-between pt-2 border-t border-[var(--od-line)]">
            <span className="text-[14px] font-semibold text-[var(--od-ink)]">
              Toplam
            </span>
            <span className="font-display text-[22px] text-[var(--od-ink)]">
              {formatTRY(totalCents)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-[10px] bg-[var(--od-cream-2)] p-3 text-[11.5px] text-[var(--od-ink-soft)]">
          <ShieldCheck
            size={16}
            className="mt-0.5 flex-shrink-0 text-emerald-700"
          />
          <span>
            <strong className="text-[var(--od-ink)]">PayTR</strong> ile 256-bit
            SSL güvenli ödeme. Kart bilgileriniz sitemizde saklanmaz; 1/3/6/9
            taksit seçenekleri sunulur.
          </span>
        </div>

        {backHref && (
          <Link
            href={backHref}
            className="mt-4 block text-center text-[12.5px] text-[var(--od-ink-soft)] hover:text-[var(--od-ink)] transition"
          >
            {backLabel}
          </Link>
        )}
      </div>
    </aside>
  );
}

/**
 * Form üstünde gösterilen ortak "Güvenli Ödeme" başlığı.
 */
export function CheckoutPageHeader({
  title = "Bilgileriniz",
  subtitle,
}: {
  title?: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">
        <Lock size={12} /> Güvenli Ödeme
      </span>
      <h1 className="mt-1 font-display text-[32px] leading-[1.05] tracking-tight text-[var(--od-ink)]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-[13.5px] text-[var(--od-ink-soft)]">{subtitle}</p>
      )}
    </div>
  );
}
