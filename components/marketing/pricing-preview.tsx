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
    <section id="matematik-ders-paketi" className="scroll-mt-24 bg-[#fafafa]">
      <div className="site-container py-24 sm:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <p className="site-eyebrow justify-center">Tek abonelik</p>
          <h2 className="mt-4 font-display text-[clamp(2.8rem,6vw,5.4rem)] leading-[.98] tracking-[-0.04em] text-[var(--site-ink)]">
            Tek paket,<br /><span className="site-hl">net bir matematik yolu.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-7 text-[var(--site-body)]">
            Canlı ders, küçük grup ve ders sonrası takip tek pakette.
          </p>
        </div>

        <div className="mt-20 grid items-start gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-24">
          {/* Neler dahil */}
          <div>
            <h3 className="font-display text-[clamp(1.8rem,3vw,2.6rem)] tracking-[-0.02em] text-[var(--site-ink)]">Neler dahil?</h3>
            <ul className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-1">
              {includedFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[16px] leading-7 text-[var(--site-body)] sm:text-[18px]">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                    <Check size={13} strokeWidth={3} aria-hidden="true" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/ders-paketleri/"
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
