import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Hero } from "@/components/marketing/hero";
import { ProductDiscovery } from "@/components/marketing/product-discovery";
import { UniversityMarquee } from "@/components/marketing/university-marquee";
import { ProductTour } from "@/components/marketing/product-tour";
import { DinoAiLayer } from "@/components/marketing/dino-ai-layer";
import { ResultsSection } from "@/components/marketing/results-section";
import { First30Days } from "@/components/marketing/first-30-days";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FooterCta } from "@/components/marketing/footer-cta";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { faqJsonLd } from "@/lib/seo/jsonld";
import { homeFaqs } from "@/lib/site-content";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Online Dershanem | Ders, Koçluk ve Deneme Ürünleri",
  description:
    "LGS ve YKS öğrencileri için Online Dershanem, Online Koçum ve Online Deneme Kulübüm ürünlerini keşfedin.",
  canonical: "/",
});

export default function HomePage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={faqJsonLd(homeFaqs)}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <ProductDiscovery />
        <UniversityMarquee />
        <ProductTour />
        <DinoAiLayer />
        <First30Days />
        <ResultsSection />
        <FaqAccordion items={homeFaqs} showAllLink />
        <FooterCta
          title="Bugün hangi desteğe ihtiyaç olduğunu birlikte bulalım."
          subtitle="Üç ürünü karşılaştırın veya öğrencinin sınıfı ve hedefi için bize ulaşın."
          ctaLabel="Ürünleri karşılaştır"
          ctaHref="/urunler/"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
