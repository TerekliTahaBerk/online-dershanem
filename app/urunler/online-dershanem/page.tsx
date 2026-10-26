import { ProductReadingLinks } from "@/components/product/reading-links";
import { EditorialProductHero } from "@/components/product/editorial-product-hero";
import { MarketingApplicationLink } from "@/components/forms/marketing-application-link";
import { ConsultationSteps } from "@/components/product/consultation-steps";
import { yonBrand } from "@/lib/yon-brand";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, serviceJsonLd } from "@/lib/seo/jsonld";
import { ClipboardCheck, MessagesSquare, Users } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  ProductDinoBand,
  CrossSellWithPrice,
  ProductFaq,
} from "@/components/product/product-sections";
import {
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
  title: "LGS ve YKS Canlı Online Ders | onlinedershanem.",
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
      <SchemaJsonLd schema={[serviceJsonLd({ name: "Online Dershanem", description: "LGS ve YKS için birebir veya en fazla dört kişilik canlı online ders.", url: "/urunler/online-dershanem", serviceType: "Canlı online ders" }), breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Ürünler", url: "/urunler" }, { name: "onlinedershanem.", url: "/urunler/online-dershanem" }])]} />
      <main id="main-content" tabIndex={-1}>
        <EditorialProductHero
          tone="lesson"
          titleId="lesson-title"
          lines={[{ text: "Canlı derste" }, { text: "öğretmenle", emphasis: "ilerle." }]}
          description="Sorunu o anda sor, zorlandığın konuyu öğretmeninle birlikte çöz. LGS ve YKS için canlı derslerde öğren; ders sonrası özet ve çalışma adımlarıyla öğrendiklerini pekiştir."
          actions={<>
            <MarketingApplicationLink product="online-dershanem" />
            <a href="#ders-secenekleri">Canlı Dersleri Keşfet ↓</a>
          </>}
          facts={[
            { title: "Az kişi, yakın ilgi", detail: "Birebir ya da en fazla 4 kişilik grup" },
            { title: "Anında soru, canlı çözüm", detail: "Öğretmeninle doğrudan etkileşim" },
            { title: "Ders bitince yolun belli", detail: "Konu özeti ve tekrar adımları" },
          ]}
        />

        <section id="ders-secenekleri" className="site-container scroll-mt-36 py-(--dc-section-tight)">
          <h2 className="font-display text-(length:--public-title) leading-tight text-dc-ink">Sınavına ve öğrenme biçimine uygun ders.</h2>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {[
              ["LGS hazırlığı", "Matematik, fen bilimleri, Türkçe, T.C. İnkılap Tarihi, İngilizce ve din kültüründe zorlandığın konuları öğretmeninle çalış."],
              ["YKS hazırlığı", "TYT ve AYT hedefin için matematik, Türkçe, edebiyat, fizik, kimya ve diğer derslerde ihtiyacını belirle; uygun programı birlikte planla."],
              ["Birebir ders", `Dersin odağını kendi ihtiyaçlarına göre öğretmeninle belirle. Aylık paket: ${formatCents(oneToOne.campaignCents!)}.`],
              ["En fazla 4 kişilik grup", `Küçük grupta öğretmene sorularını sor, birlikte çözüm yap. Aylık paket: ${singleProductPriceLabel("dershanem")?.price}.`],
            ].map(([title, body]) => <article key={title} className="rounded-dc-card border border-dc-line bg-white p-6"><h3 className="text-xl font-bold text-dc-ink">{title}</h3><p className="mt-3 text-[15px] leading-relaxed text-dc-ink-body">{body}</p></article>)}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-dc-ink-muted">Ders, gün, saat ve uygun grup seçenekleri başlangıç öncesinde netleştirilir. Her ek ders ayrı fiyatlandırılır.</p>
        </section>

        {/* Derste ve ders sonrasında ne oluyor? */}
        <section className="border-b border-dc-line-soft bg-white">
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
          applicationProduct="online-dershanem"
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
          advantageNote="Birlikte kullanım seçeneklerini ön görüşmede değerlendirebilirsin."
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
          priceFootnote="Ön görüşme ücretsizdir. Başvuru kesin kayıt veya ödeme oluşturmaz."
        />

        <ConsultationSteps product="online-dershanem" />

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

        <section className="site-container py-(--dc-section-tight)">
          <div className="rounded-dc-banner bg-dc-brand-soft p-7 sm:p-12">
            <h2 className="font-display text-(length:--public-title) text-dc-ink">Canlı derse bir adım at.</h2>
            <p className="mt-4 text-dc-ink-body">Hedefini ve zorlandığın konuları paylaş; uygun ders seçeneğini birlikte değerlendirelim.</p>
            <MarketingApplicationLink product="online-dershanem" className="site-btn site-btn-primary mt-6" />
          </div>
        </section>
        <ProductReadingLinks product="online-dershanem" />
      </main>
      <SiteFooter />
    </div>
  );
}
