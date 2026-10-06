import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PackageBuilder } from "@/components/pricing/package-builder";
import { CoverageTable } from "@/components/pricing/coverage-table";
import {
  ProductFaq,
  ProductClosingCta,
} from "@/components/product/product-sections";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { listActivePublicProductCodes } from "@/lib/public-marketing-products-server";
import { getPublicPricingCopy } from "@/lib/commerce/public-pricing-copy";
import { application } from "@/lib/application";

export const metadata = buildMarketingMetadata({
  title: "Paketler | Kendi paketini oluştur",
  description:
    "onlinedershanem., onlinekoçum. × Yön Koçluk ve onlinedenemekulübüm. × Deneme Ligi’ni tek tek ya da birlikte seç; güncel fiyatları ve birlikte alım avantajını gör, başlangıcını planla.",
  canonical: "/paketler",
  imagePath: "/paketler/opengraph-image",
  imageAlt: "Paketini Oluştur — Canlı ders, Yön Koçluk ve Deneme Ligi",
});

export default async function PackagesPage() {
  const activeRegistryCodes = await listActivePublicProductCodes();
  const pricing = getPublicPricingCopy();
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Paketler", url: "/paketler" }])} />
      <main id="main-content" tabIndex={-1}>
        <section className="site-container pt-16 text-center sm:pt-[72px]">
          <p className="dc-eyebrow">Paketler</p>
          <h1 className="mx-auto mt-4 max-w-[760px] font-display text-(length:--public-display) leading-[1.08] tracking-[-0.03em] text-dc-ink">
            İhtiyacın olan desteği seç.
            <br />
            Birlikte kullan.
          </h1>
          <p className="mx-auto mt-4 max-w-[640px] text-[18px] leading-[1.65] text-dc-ink-body">
            Ders, koçluk ve denemenin güncel fiyatlarını doğrudan görürsün.
            Birlikte alım avantajı paket özetinde, aylık ve dönemlik tutarlar
            ayrı ayrı gösterilir.
          </p>
        </section>

        <section className="pt-11">
          <PackageBuilder activeRegistryCodes={activeRegistryCodes} />
        </section>

        <section
          id="kapsam"
          className="site-container scroll-mt-6 pb-(--dc-section) pt-[88px]"
        >
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-dc-ink pb-[18px]">
            <div>
              <h2 className="font-display text-[34px] leading-[1.1] tracking-[-0.02em] text-dc-ink">
                Paketlerin tüm kapsamı
              </h2>
              <p className="mt-2.5 max-w-[620px] text-[15.5px] leading-[1.6] text-dc-ink-muted">
                Karar vermek için üstteki üç ürün ve fiyat yeterli. Ayrıntıyı
                görmek istersen tüm kapsam burada, konu başlıklarına göre.
              </p>
            </div>
          </div>

          <CoverageTable activeRegistryCodes={activeRegistryCodes} />
        </section>

        <ProductFaq
          title="Fiyat ve paket soruları"
          items={[
            {
              q: "Ürünleri ayrı ayrı alabilir miyim?",
              a: `Evet. ${pricing.standalone} Fiyatını hesapladıktan sonra başvuru formunda seçimini belirt; başlangıcını ekibimizle planlayabilirsin.`,
            },
            {
              q: "Birden fazla ürün aldığımda fiyat nasıl değişiyor?",
              a: pricing.bundles,
            },
            {
              q: "Ders fiyatı derse göre değişiyor mu?",
              a: "Hayır. Hangi dersi seçersen seç, maks. 4 kişilik grup dersi aynı fiyat, birebir özel ders aynı fiyattır. Pakete eklediğin her ek ders aynı ders fiyatından hesaplanır.",
            },
            {
              q: "Başvuru yaptıktan sonra ne olur?",
              a: "Formda hedef sınavını ve seçtiğin paketi belirt. Ekibimiz başvurunu değerlendirip seninle iletişime geçer; hesabını oluşturur ve paket erişim koşullarını netleştirir. Formu göndermek otomatik hesap veya ürün erişimi sağlamaz.",
            },
            {
              q: "Faturalama nasıl işliyor?",
              a: "Ders ve onlinekoçum. × Yön Koçluk aylık, onlinedenemekulübüm. × Deneme Ligi dönemliktir. Birlikte seçtiğinde aylık ve dönemlik tutarlar paket özetinde ayrı ayrı görünür.",
            },
            {
              q: "Paket fiyatımı sonradan değiştirebilir miyim?",
              a: "Seçimini paket kurucuda güncel fiyatlarla yeniden hesaplayabilirsin. Başvuru sonrasında kapsamı ve başlangıç koşullarını ekibimizle netleştirebilirsin. Fiyatı hesaplanamayan özel bir kapsam için yazılı teklif paylaşılır.",
            },
          ]}
        />

        <ProductClosingCta
          title="Seçimini yaptın. Birlikte başlayalım."
          body="Başvuru formunda hedefini ve seçtiğin paketi belirt; hesabını ve başlangıcını ekibimiz planlasın."
          primaryCta={application}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
