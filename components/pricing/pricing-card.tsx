import { Check, Lock } from "lucide-react";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

export type PricingCardData = {
  name: string;
  category: string;
  subject: string;
  tagline?: string;
  priceLabel: string;
  oldPriceLabel?: string;
  discountLabel?: string;
  /** Pakete özgü sınav odağı. Ortak standart kartta değil, "Neler dahil?" bölümünde anlatılır. */
  highlights: string[];
  highlightsTitle?: string;
  note?: string;
  ctaLabel?: string;
};

export function PricingCard({ data, source }: { data: PricingCardData; source: string }) {
  const [price, per] = splitPrice(data.priceLabel);
  return (
    <article className="flex h-full flex-col rounded-[24px] border border-[var(--site-line)] bg-white p-7 sm:p-9">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]">{data.category} paketi</span>
        {data.discountLabel ? <span className="rounded-full bg-[var(--brand-olive-soft)] px-3 py-1 text-[10px] font-bold text-[var(--brand-olive)]">{data.discountLabel}</span> : null}
      </div>
      <h3 className="mt-5 max-w-[16ch] text-[clamp(1.7rem,3vw,2.25rem)] font-semibold leading-[1.04] tracking-[-.035em] text-[var(--site-ink)]">{data.name}</h3>
      {data.tagline ? <p className="mt-3 text-[14px] leading-6 text-[var(--site-body)]">{data.tagline}</p> : null}
      <div className="mt-7 rounded-[18px] border border-[var(--site-line)] bg-[var(--brand-olive-tint)] p-5">
        {data.oldPriceLabel ? <p className="text-[12px] text-[var(--site-muted)]"><span className="line-through">{data.oldPriceLabel}</span> yerine</p> : null}
        {/*
          Fiyat boyutu VIEWPORT'a bağlanmaz: kart dar bir grid sütunu, ekran
          büyürken kart aynı oranda büyümüyor — vw tabanlı boyut fiyatı kutudan
          taşırır. Ölçülen en dar kutu (lg/1024) baz alınmıştır.
        */}
        <div className="mt-2 flex items-end gap-2">
          <span className="whitespace-nowrap text-[clamp(1.75rem,2.6vw,2.9rem)] font-semibold leading-none tracking-[-.055em] text-[var(--site-ink)]">{price}</span>
          {per ? <span className="mb-1.5 whitespace-nowrap text-[15px] font-medium text-[var(--site-body)]">/ {per}</span> : null}
        </div>
        <p className="mt-3 text-[12px] font-semibold text-[var(--brand-olive)]">Aylık ödeme · taahhüt yok</p>
      </div>
      <div className="mt-8 flex-1 border-t border-[var(--site-line)] pt-7">
        {data.highlightsTitle ? (
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]">{data.highlightsTitle}</p>
        ) : null}
        <ul className="space-y-3">
        {data.highlights.map((item) => (
          <li key={item} className="flex items-start gap-3 text-[14px] leading-6 text-[var(--site-body)]">
            <Check size={16} className="mt-1 shrink-0 text-[var(--brand-olive)]" aria-hidden="true" />{item}
          </li>
        ))}
        </ul>
      </div>
      <PurchaseFunnelTrigger
        source={source}
        packageName={data.name}
        category={data.category}
        subject={data.subject}
        priceLabel={data.priceLabel}
        paymentLink=""
        className="site-btn site-btn-primary mt-8 w-full"
      >
        {data.ctaLabel ?? `${data.category} Paketini Satın Al`}
      </PurchaseFunnelTrigger>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-[var(--site-muted)]"><Lock size={12} aria-hidden="true" />{data.note ?? "PayTR güvenli ödeme · Hesap gerekmez"}</p>
    </article>
  );
}

function splitPrice(label: string): [string, string | null] {
  const idx = label.indexOf("/");
  return idx === -1 ? [label.trim(), null] : [label.slice(0, idx).trim(), label.slice(idx + 1).trim()];
}
