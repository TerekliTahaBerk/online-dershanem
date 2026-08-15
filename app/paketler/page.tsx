import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PackageBuilder } from "@/components/pricing/package-builder";
import { CoverageTable } from "@/components/pricing/coverage-table";
import { ProductFaq, ProductClosingCta } from "@/components/product/product-sections";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Paketler | Kendi paketini oluştur",
  description:
    "Online Dershanem, Online Koçum ve Online Deneme Kulübüm'ü tek tek ya da birlikte seç. Birlikte aldığında toplam paket fiyatın düşer.",
  canonical: "/paketler",
});

export default function PackagesPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="site-container pt-16 text-center sm:pt-[72px]">
          <p className="dc-eyebrow">Paketler</p>
          <h1 className="mx-auto mt-4 max-w-[760px] font-display text-[length:var(--public-display)] leading-[1.08] tracking-[-0.03em] text-dc-ink">
            İhtiyacın olan desteği seç.
            <br />
            Birlikte aldıkça daha avantajlı.
          </h1>
          <p className="mx-auto mt-4 max-w-[640px] text-[18px] leading-[1.65] text-dc-ink-body">
            Üç ürünü tek tek alabilirsin. İki veya üç ürünü birleştirdiğinde toplam paket
            fiyatın tek tek toplamın altına düşer.
          </p>
        </section>

        <section className="pt-11">
          <PackageBuilder />
        </section>

        <section id="kapsam" className="site-container scroll-mt-6 pb-[var(--dc-section)] pt-[88px]">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-dc-ink pb-[18px]">
            <div>
              <h2 className="font-display text-[34px] leading-[1.1] tracking-[-0.02em] text-dc-ink">
                Paketlerin tüm kapsamı
              </h2>
              <p className="mt-2.5 max-w-[620px] text-[15.5px] leading-[1.6] text-dc-ink-muted">
                Karar vermek için üstteki üç ürün ve fiyat yeterli. Ayrıntıyı görmek
                istersen tüm kapsam burada, konu başlıklarına göre.
              </p>
            </div>
          </div>

          <CoverageTable />
        </section>

        <ProductFaq
          title="Fiyat ve paket soruları"
          items={[
            {
              q: "Ürünleri ayrı ayrı alabilir miyim?",
              a: "Evet. Üç ürün de tek başına satın alınabilir. İhtiyacın tek üründeyse yalnızca onu seçebilirsin.",
            },
            {
              q: "Birden fazla ürün aldığımda fiyat nasıl değişiyor?",
              a: "Her ürünün zaten indirimli bir kampanya fiyatı var. İki ürünü birlikte aldığında bunun üstüne bir de paket indirimi eklenir; üç ürün en avantajlı toplamı verir. Özet kutusunda liste fiyatı, kampanya indirimi ve paket indirimi ayrı ayrı gösterilir.",
            },
            {
              q: "Ders fiyatı derse göre değişiyor mu?",
              a: "Hayır. Hangi dersi seçersen seç, maks. 4 kişilik grup dersi aynı fiyat, birebir özel ders aynı fiyattır. Pakete eklediğin her ek ders aynı ders fiyatından hesaplanır.",
            },
            {
              q: "Faturalama nasıl işliyor?",
              a: "Ders ve koçluk aylık, deneme kulübü dönemsel faturalanır. Farklı dönemler paket özetinde ayrı gösterilir.",
            },
            {
              q: "Paket fiyatımı sonradan değiştirebilir miyim?",
              a: "Ürün ekleme ve çıkarma talebini ön görüşmede ilettiğinde paketin yeniden hesaplanır.",
            },
          ]}
        />

        <ProductClosingCta
          title="Hedefine uygun paketi oluştur."
          body="Ders, koçluk ve denemeyi ihtiyacına göre seç."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
