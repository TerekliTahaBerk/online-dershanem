import type { Metadata } from "next";
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
import { lessonPackage } from "@/lib/pricing-content";
import { parsePriceToCents, siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "YKS ve LGS için Koçluk ve Akıllı Takip",
  description:
    "En fazla 4 kişilik canlı matematik dersi, kişiye özel çalışma planı ve veliye net gelişim notu. LGS, TYT ve AYT hazırlığını tek yerden yönet.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Online Dershanem | YKS ve LGS için Koçluk ve Akıllı Takip",
    description:
      "Koçluk, kişiye özel plan ve akıllı takip sistemiyle matematik hazırlığını sadeleştir.",
    url: `${siteUrl}/`,
  },
};

export default function HomePage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={[
          productJsonLd({
            name: lessonPackage.name,
            description:
              "En fazla 4 öğrencilik canlı matematik dersi, kişiye özel haftalık plan, ödevlendirme ve veliye gelişim notu.",
            url: "/paketler/",
            image: "/logo.png",
            priceCents: lessonPackage.priceCents,
            originalPriceCents: lessonPackage.oldPriceLabel
              ? parsePriceToCents(lessonPackage.oldPriceLabel)
              : null,
            sku: "matematik-ders-paketi",
          }),
          faqJsonLd(homeFaqs),
        ]}
      />
      <SiteHeader />
      <main>
        <Hero />
        <SocialProof />
        <ValueProps />
        <ProductTour />
        <ResultsSection />
        <TestimonialsCarousel />
        <First30Days />
        <PricingPreview />
        <FaqAccordion items={homeFaqs} />
        <FooterCta />
      </main>
      <SiteFooter />
    </div>
  );
}
