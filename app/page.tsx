import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HomeHero } from "@/components/home/hero";
import { ProductTrio } from "@/components/home/product-trio";
import { Ecosystem } from "@/components/home/ecosystem";
import { CourseDiscovery } from "@/components/home/course-discovery";
import { DinoLayer } from "@/components/home/dino-layer";
import { BundleSection } from "@/components/home/bundle-section";
import { PlatformPreview } from "@/components/home/platform-preview";
import { HowItWorks } from "@/components/home/how-it-works";
import { ParentVisibility } from "@/components/home/parent-visibility";
import { HomeFaq } from "@/components/home/home-faq";
import { ClosingCta } from "@/components/home/closing-cta";
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

/**
 * ANA SAYFA — onaylı tasarımın bölüm haritası (Web.dc.html → handoff):
 * 01 Navbar · 02 Hero · 03 Gerçek bilgi · 04 Üç ürün · 05 Ekosistem ·
 * 06 Ders keşfi · 07 Dino AI · 08 Paket kurucu · 09 Platform · 10 Nasıl başlar ·
 * 11 Veli görünürlüğü · 13 SSS · 14 Kapanış · 15 Footer.
 *
 * 12 (yorumlar) doğrulanmış veri olmadığı için yayına alınmadı —
 * bkz. `parent-visibility.tsx`.
 */
export default function HomePage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd schema={faqJsonLd(homeFaqs)} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <HomeHero />
        <ProductTrio />
        <Ecosystem />
        <CourseDiscovery />
        <DinoLayer />
        <BundleSection />
        <PlatformPreview />
        <HowItWorks />
        <ParentVisibility />
        <HomeFaq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
