import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ProductTrio } from "@/components/home/product-trio";
import { Ecosystem } from "@/components/home/ecosystem";
import { DinoLayer } from "@/components/home/dino-layer";
import { ClosingCta } from "@/components/home/closing-cta";
import { ProductCompare } from "@/components/home/product-compare";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Ürünler | onlinedershanem., onlinekoçum. × Yön Koçluk ve onlinedenemekulübüm. × Deneme Ligi",
  description:
    "LGS ve YKS için canlı ders, haftalık koçluk ve deneme analizi. Üç ürünü tek tek ya da birlikte alabilirsin.",
  canonical: "/urunler",
});

/**
 * ÜRÜNLER — üç ürünün giriş sayfası.
 *
 * Bu sayfa daha önce ESKİ tasarım sisteminde (`--site-*` token'ları,
 * `site-kicker`) kalmıştı: menüden erişilebilir olduğu hâlde sitenin geri
 * kalanından farklı görünüyordu. Ana sayfayla aynı bölümleri kullanır —
 * ürün kartları, birlikte çalışma akışı, Dino AI ve kapanış. Bölümler bir
 * kez yazıldığı için ikisi birbirinden ayrışamaz.
 */
export default function ProductsPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Ürünler", url: "/urunler" }])} />
      <main id="main-content" tabIndex={-1}>
        <section className="site-container pb-2 pt-14 text-center sm:pt-[72px]">
          <p className="dc-eyebrow">Ürünler</p>
          <h1 className="mx-auto mt-4 max-w-[760px] font-display text-(length:--public-display) leading-[1.08] tracking-[-0.03em] text-dc-ink">
            Üç ayrı ürün. Hangisine ihtiyacın varsa onu al.
          </h1>
          <p className="mx-auto mt-4 max-w-[620px] text-[18px] leading-[1.65] text-dc-ink-body">
            Biri konuyu öğretir, biri haftanı düzenler, biri nerede durduğunu
            ölçer. Tek başlarına da çalışırlar, birlikte de.
          </p>
        </section>

        <ProductTrio
          title="Üç ürün, üç ayrı iş"
          lede="Aşağıda her birinin ne yaptığı ve kimin için olduğu yazıyor."
        />
        <ProductCompare />
        <Ecosystem showDinoLayer={false} />
        <DinoLayer />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
