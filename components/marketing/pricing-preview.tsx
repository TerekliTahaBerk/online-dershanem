import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { lessonPackage, includedFeatures, cardHighlights } from "@/lib/pricing-content";
import { PricingCard } from "@/components/pricing/pricing-card";

/**
 * Ana sayfa fiyat önizlemesi — solda "Neler dahil?", sağda öne çıkan gradient
 * kart. Fiyat `lib/content.ts` kaynağından türetilir (değiştirilmez).
 */
export function PricingPreview() {
  return (
    <section id="matematik-ders-paketi" className="scroll-mt-24 bg-white">
      <div className="site-container py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="site-eyebrow justify-center">Tek abonelik</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.08] tracking-[-0.02em] text-[var(--site-ink)]">
            Tek abonelik, <span className="site-hl">tüm matematik</span> ihtiyacın.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-7 text-[var(--site-body)]">
            LGS, TYT ve AYT matematik için tek, sade bir paket. Karmaşık seçenek yok; aylık ilerler,
            istediğin zaman bırakabilirsin.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Neler dahil */}
          <div>
            <h3 className="font-display text-[24px] tracking-[-0.01em] text-[var(--site-ink)]">Neler dahil?</h3>
            <ul className="mt-6 grid gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-1">
              {includedFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[15px] leading-6 text-[var(--site-body)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/paketler/"
              className="mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--brand-orange-ink)] hover:underline"
            >
              Ders Paketleri sayfasını gör
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {/* Fiyat kartı */}
          <div className="lg:pl-6">
            <PricingCard
              source="home_pricing_preview"
              data={{
                name: lessonPackage.name,
                category: lessonPackage.category,
                subject: lessonPackage.subject,
                priceLabel: lessonPackage.priceLabel,
                oldPriceLabel: lessonPackage.oldPriceLabel,
                discountLabel: lessonPackage.discountLabel,
                highlights: cardHighlights,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
