import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PackageBuilder } from "@/components/pricing/package-builder";
import { CoverageTable } from "@/components/pricing/coverage-table";
import { ProductFaq, ProductClosingCta } from "@/components/product/product-sections";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Paketler | Kendi paketini oluştur",
  description:
    "Online Dershanem, Online Koçum ve Online Deneme Kulübüm'ü tek tek ya da birlikte seç; online alınabilir ürünü doğrudan satın al, diğer seçimler için ön görüşme talep et.",
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
            Birlikte kullan.
          </h1>
          <p className="mx-auto mt-4 max-w-[640px] text-[18px] leading-[1.65] text-dc-ink-body">
            Satın alınabilir ders paketinin fiyatını doğrudan görürsün. Koçluk, deneme,
            birebir ve birleşik seçimlerin net tutarı ön görüşmede paylaşılır.
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
              a: "Evet. Üç ürün de tek başına seçilebilir. Online ödeme akışı şu an ders paketinde açıktır; diğer tek ürün seçimlerinde net fiyat ve başlangıç planı ön görüşmede paylaşılır.",
            },
            {
              q: "Birden fazla ürün aldığımda fiyat nasıl değişiyor?",
              a: "İki ya da üç ürünü birlikte seçtiğinde toplam tutar düşer. Bu birleşik seçenekler online ödeme adımına açık olmadığı için net rakam ön görüşmede yazılı olarak paylaşılır.",
            },
            {
              q: "Ders fiyatı derse göre değişiyor mu?",
              a: "Hayır. Hangi dersi seçersen seç, maks. 4 kişilik grup dersi aynı fiyat, birebir özel ders aynı fiyattır. Pakete eklediğin her ek ders aynı ders fiyatından hesaplanır.",
            },
            {
              q: "Faturalama nasıl işliyor?",
              a: "Online satın alınabilir ders paketi aylıktır. Koçluk, deneme kulübü ve birleşik seçimlerin faturalama dönemleri kesin teklifte ayrı ayrı belirtilir.",
            },
            {
              q: "Paket fiyatımı sonradan değiştirebilir miyim?",
              a: "Online satın alınabilir ürünün fiyatı ödeme adımında güncel tutarla doğrulanır. Ön görüşmeli seçimlerde ise kabul ettiğin yazılı teklif esas alınır.",
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
