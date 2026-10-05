import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HomeHero } from "@/components/home/hero";
import { ProductTrio } from "@/components/home/product-trio";
import { Ecosystem } from "@/components/home/ecosystem";
import { BundleSection } from "@/components/home/bundle-section";
import { PlatformPreview } from "@/components/home/platform-preview";
import { ParentVisibility } from "@/components/home/parent-visibility";
import { HomeFaq, getHomePageFaqs } from "@/components/home/home-faq";
import { ClosingCta } from "@/components/home/closing-cta";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { faqJsonLd, organizationJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "onlinedershanem. | Ders, Koçluk ve Deneme Ürünleri",
  description:
    "LGS ve YKS öğrencileri için onlinedershanem., onlinekoçum. × Yön Koçluk ve onlinedenemekulübüm. × Deneme Ligi ürünlerini keşfedin.",
  canonical: "/",
});

/** ANA SAYFA — sadeleştirilmiş karar akışı: Hero → Üç ürün → Akış → Platform → Paket → Veli → SSS → Kapanış. */
export default function HomePage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd schema={[...organizationJsonLd(), faqJsonLd(getHomePageFaqs())]} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <HomeHero />
        <ProductTrio />
        <Ecosystem />
        <PlatformPreview />
        <BundleSection />
        <ParentVisibility />
        <HomeFaq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
