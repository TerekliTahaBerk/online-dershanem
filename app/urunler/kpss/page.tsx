import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  CrossSellWithPrice,
  ProductClosingCta,
  ProductDinoBand,
  ProductFaq,
  ProductHero,
  StepCards,
} from "@/components/product/product-sections";
import { listActivePublicProductCodes } from "@/lib/public-marketing-products-server";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const activeProductCodes = await listActivePublicProductCodes();
  if (!activeProductCodes.includes("KPSS")) notFound();

  return buildMarketingMetadata({
    title: "KPSS Hazırlık | Sınav gününe kadar net çalışma planı",
    description:
      "Öğretmen adayları için sınav tarihine, çalışma kapasitesine ve konu ilerlemesine göre şekillenen KPSS hazırlık planı.",
    canonical: "/urunler/kpss",
  });
}

const weekDays = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

export default async function KpssProductPage() {
  const activeProductCodes = await listActivePublicProductCodes();
  if (!activeProductCodes.includes("KPSS")) notFound();

  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <div className="site-container pt-5">
          <p className="rounded-dc-card-sm border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-900">
            TASLAK — pazarlama ekibi onayı bekliyor
          </p>
        </div>

        <ProductHero
          eyebrow="Ürün · KPSS"
          title="Sınav gününe kadar planın net olsun."
          body="Hedef tarihini, haftalık çalışma kapasiteni ve konu ilerlemeni tek bir uygulanabilir planda birleştir. Her gün neye odaklanacağını gör, ritmini sürdürülebilir biçimde koru."
          tracks={["KPSS", "Eğitim Bilimleri"]}
          note="Yetişkin ve özerk hazırlık düzeni"
          secondaryCta={{ label: "Ücretsiz Ön Görüşme", href: "/iletisim" }}
          visual={
            <div className="rounded-dc-card border border-dc-line bg-white p-5 shadow-[0_14px_34px_rgba(20,32,28,.07)]">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[11px] font-semibold text-[var(--dc-ink-faint)]">
                  BU HAFTANIN PLANI
                </p>
                <span className="text-[12px] font-semibold text-dc-brand-hover">
                  Sınava 84 gün
                </span>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {weekDays.map((day, index) => (
                  <div key={day} className="text-center">
                    <span className="text-[10.5px] font-semibold text-dc-ink-faint">
                      {day}
                    </span>
                    <span
                      className={`mt-1.5 block h-16 rounded-lg ${
                        index === 6
                          ? "border border-dashed border-[#D6E2DC] bg-dc-surface-muted"
                          : index === 1 || index === 4
                            ? "bg-dc-brand"
                            : "bg-dc-brand-soft"
                      }`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-dc-line-soft pt-4">
                <div className="flex items-center justify-between text-[13px] font-semibold text-dc-ink-muted">
                  <span>Haftalık kapasite</span>
                  <span>360 dakika</span>
                </div>
                <span className="mt-2 block h-1.5 rounded-full bg-[#E4EBE7]">
                  <span className="block h-full w-[64%] rounded-full bg-dc-brand" />
                </span>
              </div>
            </div>
          }
        />

        <StepCards
          title="Hazırlık düzeni nasıl işler?"
          steps={[
            {
              title: "Hedef tarihini belirle",
              body: "Sınava kalan süre planın temel sınırını oluşturur.",
            },
            {
              title: "Kapasiteni tanımla",
              body: "Haftalık ayırabileceğin süre gerçekçi bir tempoya çevrilir.",
            },
            {
              title: "Konu odağını gör",
              body: "Eksik ve güçlü alanlar sıradaki çalışma adımını belirler.",
            },
            {
              title: "Planı sürdür",
              body: "Tamamlanan görevlerle tempo ve kalan yük yeniden dengelenir.",
            },
          ]}
        />

        <ProductDinoBand
          eyebrow="Dino AI · KPSS plan önerisi"
          title="Kalan süreyi bugünün adımına çevir."
          body="Dino AI, sınav tarihi ile tamamlanan çalışmaları birlikte değerlendirir ve uygulanabilir bir sonraki odağı açıklar. Önerinin gerekçesini de aynı yerde görürsün."
          quote="Bu hafta Ölçme ve Değerlendirme odağını öne al."
          quoteBody="Gerekçe: son çalışma sonuçları ve sınava kalan süre. Önerilen adım: üç kısa tekrar görevi."
        />

        <CrossSellWithPrice
          cards={[
            {
              eyebrow: "+ Canlı ders desteği",
              title: "Takıldığın konuyu uzmanla çalış",
              body: "Planındaki belirli bir konu için birebir veya küçük grup desteği ekleyebilirsin.",
            },
            {
              eyebrow: "+ Ölçme desteği",
              title: "İlerlemeni sonuçla karşılaştır",
              body: "Uygun ölçme içerikleri açıldığında planın sonuç verisiyle güncellenebilir.",
            },
          ]}
          advantageNote="Ek hizmetler ihtiyaca göre ayrı planlanır."
          price={null}
          priceSuffix=""
          features={[
            "Sınav tarihine göre haftalık plan",
            "Kapasiteye göre günlük görevler",
            "Dino AI odak ve gerekçe önerileri",
          ]}
          priceFootnote="Paket kapsamı ve fiyatı yayına çıkmadan önce ayrıca duyurulur."
        />

        <ProductFaq
          items={[
            {
              q: "Plan sabit mi kalır?",
              a: "Hayır. Tamamlanan görevler, kalan süre ve güncel kapasite değiştikçe sonraki hafta yeniden dengelenir.",
            },
            {
              q: "Günde ne kadar çalışmam gerekir?",
              a: "Tek bir süre herkese uygulanmaz. Plan, bildirdiğin haftalık kapasiteyi günlük ve sürdürülebilir parçalara böler.",
            },
            {
              q: "Dino AI neye göre öneri verir?",
              a: "Yalnız sistemde bulunan çalışma, konu ilerlemesi ve hedef tarihi verilerini kullanır; önerinin dayanağını görünür biçimde açıklar.",
            },
            {
              q: "Paket ne zaman satışa açılacak?",
              a: "İçerik, kapsam ve fiyat onayları tamamlandığında duyurulacak. Şu anda ödeme alınmıyor.",
            },
          ]}
        />

        <ProductClosingCta
          title="KPSS hazırlığını net bir plana dönüştür."
          body="Hedef tarihinden bugünün çalışma adımına kadar tek bir düzen kur."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
