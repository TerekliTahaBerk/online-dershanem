import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Hero } from "@/components/marketing/hero";
import { SocialProof } from "@/components/marketing/social-proof";
import { ValueProps } from "@/components/marketing/value-props";
import { ProductTour } from "@/components/marketing/product-tour";
import { ResultsSection } from "@/components/marketing/results-section";
import { TestimonialsCarousel } from "@/components/marketing/testimonials-carousel";
import { First30Days } from "@/components/marketing/first-30-days";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FooterCta } from "@/components/marketing/footer-cta";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { productJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { homeFaqs } from "@/lib/site-content";
import { lessonPackages } from "@/lib/pricing-content";
import { StickyCheckoutBar } from "@/components/pricing/sticky-checkout-bar";
import { parsePriceToCents } from "@/lib/content";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Online Dershanem | Küçük Grup Canlı Matematik Dersi",
  description:
    "LGS ve YKS için en fazla 4 kişilik canlı matematik dersi, öğretmen geri bildirimi, ders sonrası yönlendirme ve güvenli ödeme.",
  canonical: "/",
});

export default function HomePage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={[
          ...lessonPackages.map((pkg) =>
            productJsonLd({
              name: pkg.name,
              description:
                "En fazla 4 öğrencilik canlı matematik dersi, ders sonrası çalışma yönü ve öğretmen geri bildirimi.",
              url: "/ders-paketleri/",
              image: "/logo.png",
              priceCents: pkg.priceCents,
              originalPriceCents: pkg.oldPriceLabel
                ? parsePriceToCents(pkg.oldPriceLabel)
                : null,
              sku: `${pkg.category.toLowerCase()}-matematik-ders-paketi`,
            }),
          ),
          faqJsonLd(homeFaqs),
        ]}
      />
      <SiteHeader />
      <main>
        <Hero />
        <SocialProof />
        <ValueProps />
        <ProductTour />
        <PricingPreview />
        <First30Days />
        <TestimonialsCarousel />
        <ResultsSection />
        <FaqAccordion items={homeFaqs} />
        <FooterCta
          title="Matematik yolunu birlikte netleştirelim."
          subtitle="Ücretsiz ön görüşmede öğrencinin seviyesini, hedefini ve uygun küçük grup ihtimalini konuşalım."
          ctaLabel="Ücretsiz görüşme"
          ctaHref="/iletisim/"
        />
      </main>
      <SiteFooter />
      <StickyCheckoutBar
        packages={lessonPackages}
        note="aylık sabit fiyat"
      />
    </div>
  );
}
