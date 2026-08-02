import Link from "next/link";
import { lessonPackages } from "@/lib/pricing-content";
import { PricingCard } from "@/components/pricing/pricing-card";

export function PricingPreview() {
  return (
    <section id="paketler" className="scroll-mt-24 bg-white">
      <div className="site-container site-section">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-.045em] text-[var(--site-ink)]">Özel ders kadar yakın. Dershane kadar erişilebilir.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-[var(--site-body)]">Aynı küçük grup standardı, öğrencinin sınav hedefine göre iki ayrı matematik paketi.</p>
        </div>
        <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2 sm:mt-20">
          {lessonPackages.map((pkg) => (
            <PricingCard key={`${pkg.category}-${pkg.subject}`} source={`home_pricing_preview_${pkg.category.toLowerCase()}`} data={{
              name: pkg.name, category: pkg.category, subject: pkg.subject, tagline: pkg.tagline, priceLabel: pkg.priceLabel,
              oldPriceLabel: pkg.oldPriceLabel, discountLabel: pkg.discountLabel,
              highlightsTitle: `${pkg.category} odağı`, highlights: pkg.examFocus,
            }} />
          ))}
        </div>
        <p className="mt-8 text-center"><Link href="/ders-paketleri/" className="text-[14px] font-semibold text-[var(--brand-olive)] hover:underline">Paket kapsamlarını ayrıntılı incele</Link></p>
      </div>
    </section>
  );
}
