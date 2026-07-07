import { Check, Lock } from "lucide-react";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

export type PricingCardData = {
  name: string;
  category: string;
  subject: string;
  priceLabel: string; // ör. "₺3.000/ay"
  oldPriceLabel?: string; // ör. "₺5.000/ay"
  discountLabel?: string; // ör. "İNDİRİMLİ"
  highlights: string[];
  note?: string;
};

/**
 * Öne çıkan yeşil gradient fiyat kartı (referanstaki featured plan kartı).
 * Satın alma CTA'sı mevcut checkout akışını (cart → /sepet → PayTR) korur.
 */
export function PricingCard({
  data,
  source,
}: {
  data: PricingCardData;
  source: string;
}) {
  const [price, per] = splitPrice(data.priceLabel);
  return (
    <div
      className="relative overflow-hidden rounded-[32px] p-7 text-white shadow-[0_30px_60px_-28px_rgba(44,58,32,0.55)] sm:p-9"
      style={{
        background:
          "linear-gradient(160deg, var(--brand-orange-bright) 0%, var(--brand-orange) 55%, var(--brand-orange-strong) 100%)",
      }}
    >
      {data.discountLabel ? (
        <span className="absolute right-6 top-6 rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold backdrop-blur">
          {data.discountLabel}
        </span>
      ) : null}

      <div className="text-[14px] font-semibold uppercase tracking-[0.08em] text-white/85">{data.name}</div>

      <div className="mt-4 flex items-end gap-3">
        <span className="font-display text-[clamp(2.6rem,6vw,3.4rem)] leading-none">{price}</span>
        {per ? <span className="mb-2 text-[16px] text-white/85">/ {per}</span> : null}
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        {data.oldPriceLabel ? (
          <span className="text-[16px] text-white/70 line-through">{data.oldPriceLabel}</span>
        ) : null}
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[12.5px] font-medium">Aylık sabit fiyat</span>
      </div>

      <ul className="mt-7 flex flex-col gap-3">
        {data.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2.5 text-[15px] text-white/95">
            <Check size={18} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
            {h}
          </li>
        ))}
      </ul>

      <PurchaseFunnelTrigger
        source={source}
        packageName={data.name}
        category={data.category}
        subject={data.subject}
        priceLabel={data.priceLabel}
        paymentLink=""
        className="mt-8 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-[16px] font-bold text-[var(--brand-orange-ink)] transition-colors hover:bg-[var(--brand-orange-tint)]"
      >
        Matematik Dersini Satın Al
      </PurchaseFunnelTrigger>

      <p className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[12.5px] text-white/85">
        <Lock size={13} aria-hidden="true" />
        {data.note ?? "PayTR güvenli ödeme · Kart bilgisi paylaşılmaz"}
      </p>
    </div>
  );
}

function splitPrice(label: string): [string, string | null] {
  const idx = label.indexOf("/");
  if (idx === -1) return [label.trim(), null];
  return [label.slice(0, idx).trim(), label.slice(idx + 1).trim()];
}
