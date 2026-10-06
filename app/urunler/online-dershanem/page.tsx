import { yonBrand } from "@/lib/yon-brand";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { ClipboardCheck, MessagesSquare, Users } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  ProductHero,
  ProductDinoBand,
  CrossSellWithPrice,
  ProductFaq,
  ProductClosingCta,
} from "@/components/product/product-sections";
import {
  LessonBoardVisual,
  ParentSummaryVisual,
  StudentScheduleVisual,
} from "@/components/product/product-visuals";
import {
  formatCents,
  lessonFormatPrices,
  singleProductPriceLabel,
} from "@/lib/commerce/package-builder-pricing";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "onlinedershanem. | Canlı derste öğretmenle ilerle",
  description:
    "LGS ve YKS için birebir ya da en fazla 4 kişilik grupta canlı ders, ders takibi, veli özeti ve ders sonrası çalışma yönü.",
  canonical: "/urunler/online-dershanem",
});

/** ÜRÜN · ONLINE DERSHANEM — onaylı tasarım (Web.dc.html → isOD). */
export default function OnlineDershanemPage() {
  // İki ders formatının da fiyatı gerçek; sayfada ikisi birden gösterilir.
  const oneToOne = lessonFormatPrices().birebir;

  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Ürünler", url: "/urunler" }, { name: "onlinedershanem.", url: "/urunler/online-dershanem" }])} />
      <main id="main-content" tabIndex={-1}>
        <ProductHero
          eyebrow="Ürün · onlinedershanem."
          title="Canlı derste öğretmenle ilerle."
          body="Birebir ya da en fazla 4 kişilik grupta ders. Öğretmen soruyu derste seninle çözer; ders bitince neyi tekrar edeceğin yazılı olarak kalır."
          tracks={["LGS", "YKS"]}
          secondaryCta={{ label: "Ücretsiz Ön Görüşme", href: "/iletisim?urun=onlinedershanem#on-gorusme" }}
          note="Birebir ya da en fazla 4 kişilik grup"
          visual={
            <div className="rounded-dc-card border border-dc-line bg-white p-3.5 shadow-[0_14px_34px_rgba(20,32,28,.07)]">
              <LessonBoardVisual />
            </div>
          }
        />

        {/* Derste ve ders sonrasında ne oluyor? */}
        <section className="mt-(--dc-section-tight) border-y border-dc-line-soft bg-white">
          <div className="site-container py-(--dc-section-tight)">
            <h2 className="max-w-[560px] font-display text-(length:--public-title) leading-[1.1] tracking-tight text-dc-ink">
              Derste ve ders sonrasında ne oluyor?
            </h2>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  Icon: Users,
                  title: "Küçük grup",
                  body: "Maks. 4 öğrenci; öğretmen her öğrenciye dönebiliyor.",
                },
                {
                  Icon: MessagesSquare,
                  title: "Öğretmen etkileşimi",
                  body: "Soru çözümü ders içinde, anlık geri bildirimle ilerliyor.",
                },
                {
                  Icon: ClipboardCheck,
                  title: "Ders takibi",
                  body: "Ders sonrası özet; katılım ve konu ilerlemesi kayıtlı.",
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-[18px] border border-dc-line p-6"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-dc-brand-soft text-dc-brand-strong"
                  >
                    <c.Icon size={20} strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-4 text-[19px] font-bold text-dc-ink">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-[1.6] text-dc-ink-muted">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[18px] border border-dc-line p-5">
                <h3 className="text-[17px] font-bold text-dc-ink">
                  Öğrenci ne görüyor?
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-[1.6] text-dc-ink-muted">
                  Sıradaki dersi, o hafta ne çalışacağını ve açık ödevlerini tek
                  ekranda.
                </p>
                <div className="mt-4">
                  <StudentScheduleVisual />
                </div>
              </div>
              <div className="rounded-[18px] border border-dc-line p-5">
                <h3 className="text-[17px] font-bold text-dc-ink">
                  Veli ne görüyor?
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-[1.6] text-dc-ink-muted">
                  Derse katılım ve konu ilerlemesi. Not değil, süreç.
                </p>
                <div className="mt-4">
                  <ParentSummaryVisual />
                </div>
              </div>
            </div>
          </div>
        </section>

        <ProductDinoBand
          eyebrow="Dino AI · Ders analizi"
          title="Derste zorlandığın yer kaybolmuyor."
          body="Dino AI’ın ders sonrası zorlanılan kazanımları öne çıkarıp tekrar için açıklayıcı önerilerle destek olması hedefleniyor. Koçluk planına nasıl yansıyacağına koçunla birlikte karar verilir."
          quote="&ldquo;Bu derste türev kurallarında zorlandın.&rdquo;"
          quoteBody="Önerilen tekrar: 2 soru seti + kısa video özeti."
        />

        <CrossSellWithPrice
          cards={[
            {
              eyebrow: `+ ${yonBrand.name}`,
              title: "Haftalık plan ve takip",
              body: "Derste öğrendiğini hangi gün, ne kadar çalışacağın netleşir.",
            },
            {
              eyebrow: "+ onlinedenemekulübüm. × Deneme Ligi",
              title: "Ölçme ve analiz",
              body: "Öğrendiğin konunun sınavda karşılığını görürsün.",
            },
          ]}
          advantageNote="Birlikte aldığında paket fiyatın düşer."
          price={singleProductPriceLabel("dershanem")}
          priceLabel="Maks. 4 kişilik grup · aylık paket"
          priceSuffix="/ ay"
          secondaryPrice={
            oneToOne.campaignCents === null
              ? null
              : {
                  label: "Birebir özel ders · aylık paket",
                  price: formatCents(oneToOne.campaignCents),
                  listPrice:
                    oneToOne.listCents === null
                      ? null
                      : formatCents(oneToOne.listCents),
                  suffix: "/ ay",
                }
          }
          features={[
            "Canlı dersler",
            "Ders takibi ve veli özeti",
            "Ders sonrası çalışma yönü",
          ]}
          priceFootnote="Koçluk da eklediğinde toplamda daha avantajlı."
        />

        <ProductFaq
          items={[
            {
              q: "Dersler canlı mı?",
              a: "Evet. Ders saatinde öğretmen ve öğrenciler aynı anda bağlanır; kayıttan izlenen bir video dersi değildir.",
            },
            {
              q: "Derse katılamazsam ne olur?",
              a: "Kaçırılan ders için ayrı bir canlı telafi dersi açılmıyor. Bunun yerine panelde konu özeti, aktif materyal ve küçük çalışma adımı içeren telafi paketi paylaşılır.",
            },
            {
              q: "Hangi dersler var?",
              a: "LGS'de matematik, fen bilimleri, Türkçe, T.C. İnkılap Tarihi, İngilizce ve din kültürü; YKS'de matematik, Türkçe, edebiyat, fizik, kimya, biyoloji, tarih, coğrafya, felsefe, İngilizce ve din kültürü. Ders fiyatı derse göre değişmez; güncel liste paket kurucudadır.",
            },
          ]}
        />

        <ProductClosingCta
          title="Canlı derse başla."
          body="İstersen yalnız ders, istersen koçluk ve denemeyle birlikte."
          secondaryCta={{
            href: "/ders-paketleri",
            label: "Ders Paketlerini Gör",
          }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
