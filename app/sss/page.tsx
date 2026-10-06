import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { PublicAccordion } from "@/components/public/accordion";
import { FooterCta } from "@/components/marketing/footer-cta";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { getPublicFaqCategories } from "@/lib/public-faq";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Sıkça Sorulan Sorular",
  description: "Canlı ders, Yön Koçluk, Deneme Ligi, Dino AI, başvuru, satın alma ve panel erişimi hakkında sorular ve açık yanıtlar.",
  canonical: "/sss",
});

export default function SssPage() {
  const categories = getPublicFaqCategories(getPanelFeatureFlags().dinoAi);
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={[
        breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Sıkça sorulan sorular", url: "/sss" }]),
        faqJsonLd(categories.flatMap((category) => category.items)),
      ]} />
      <main id="main-content" tabIndex={-1}>
        <PageHero eyebrow="Destek" title="Sık sorulan sorular" subtitle="İhtiyacın olan desteği, nasıl başlayacağını ve erişim koşullarını birlikte netleştirelim." />
        <section className="site-container py-(--dc-section)">
          <nav aria-label="Soru kategorileri" className="mx-auto mb-12 flex max-w-3xl flex-wrap gap-3">
            {categories.map((category, index) => <Link key={category.category} href={`#kategori-${index}`} className="site-btn site-btn-secondary">{category.category}</Link>)}
          </nav>
          <div className="mx-auto max-w-3xl space-y-12">
            {categories.map((category, index) => (
              <section key={category.category} id={`kategori-${index}`} className="scroll-mt-24" aria-labelledby={`kategori-${index}-title`}>
                <h2 id={`kategori-${index}-title`} className="mb-5 text-[20px] font-bold text-dc-ink">{category.category}</h2>
                <PublicAccordion items={category.items.map((item) => ({ title: item.q, content: item.a }))} />
              </section>
            ))}
            <p className="text-[15px] text-dc-ink-body"><Link href="/iade" className="font-semibold text-dc-brand-strong underline">İade koşulları</Link> veya <Link href="/giris" className="font-semibold text-dc-brand-strong underline">hesap girişi</Link> için ilgili sayfadan devam edebilirsin.</p>
          </div>
        </section>
        <FooterCta title="Yanıtını bulamadın mı?" subtitle="Öğrencinin hedefini ve ihtiyaç duyduğu desteği ücretsiz ön görüşmede konuşalım." ctaLabel="Bize ulaş" ctaHref="/iletisim#on-gorusme" />
      </main>
      <SiteFooter />
    </div>
  );
}
