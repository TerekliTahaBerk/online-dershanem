import Link from "next/link";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { StepCards, ProductFaq } from "@/components/product/product-sections";
import {
  YonHero, YonIntroduction, YonCoach, YonWeeklyPlan,
  YonProgress, YonPrice, YonClosing,
} from "@/components/product/yon-sections";
import styles from "@/components/product/yon-brand.module.css";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { yonBrand } from "@/lib/yon-brand";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";
import { getDinoMarketingCopy } from "@/lib/dino-marketing";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export const metadata = buildMarketingMetadata({
  title: `${yonBrand.name} | LGS ve YKS`,
  description: "onlinekoçum. × Yön Koçluk ile LGS ve YKS için tüm derslerini kapsayan kişisel çalışma planı, birebir insan koç görüşmesi ve düzenli uygulama takibi.",
  canonical: yonBrand.href,
  imagePath: yonBrand.ogImage,
  imageAlt: yonBrand.imageAlt,
});

const headingClass = `font-display text-(length:--public-title) leading-[1.12] tracking-tight ${styles.title}`;

export default function OnlineKocumPage() {
  const dino = getDinoMarketingCopy(getPanelFeatureFlags().dinoAi);
  const faqs = [
    { q: "Yön Koçluk, onlinekoçum.’dan farklı bir ürün mü?", a: "Hayır. Yön Koçluk, mevcut onlinekoçum. koçluk deneyiminin yeni marka adıdır. Kişisel plan, birebir koç görüşmesi ve uygulama takibi aynı ürünün kapsamındadır." },
    { q: "Koçum gerçek bir insan mı?", a: "Evet. Planını seni tanıyan insan koçunla kurarsın. Dino AI, pilot kapsamında veri ve önerilerle koçun kararını desteklemek için hazırlanıyor; koçunun yerini almaz." },
    { q: "Görüşme sıklığı ne?", a: "Görüşme sıklığı öğrencinin ihtiyaçlarına ve programına göre ön görüşmede belirlenir." },
    { q: "Plan hangi dersleri kapsıyor?", a: "Kişisel haftalık çalışma planı LGS veya YKS hedefin doğrultusunda tüm derslerini kapsar. Öncelikler ve çalışma kapasiten koçunla birlikte değerlendirilir." },
    { q: "Ders almadan koçluk alabilir miyim?", a: "Evet, onlinekoçum. × Yön Koçluk tek başına planlanabilir. Güncel fiyatı bu sayfada ve paket kurucuda görebilirsin; kontenjan ve başlangıç tarihini ekibimizle netleştirebilirsin." },
    { q: "Nasıl kayıt olabilirim?", a: yonBrand.registrationNote },
    { q: "Dino AI şu anda kullanılabilir mi?", a: dino.description },
  ];
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={[
        breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Ürünler", url: "/urunler" }, { name: yonBrand.mediumName, url: yonBrand.href }]),
        faqJsonLd(faqs),
      ]} />
      <main id="main-content" tabIndex={-1} className={styles.root}>
        <YonHero />
        <YonIntroduction />
        <div id="nasil-calisir" className="scroll-mt-24">
          <StepCards title="Hedefinden haftalık planına, birlikte." steps={[
            { title: "Tanışma ve hedef", body: "Mevcut durumunu, hedef sınavını ve haftalık kapasiteni koçunla netleştir." },
            { title: "Kişisel plan", body: "Tüm derslerini kapsayan, ders ve deneme takviminle uyumlu bir haftalık plan kur." },
            { title: "Birebir görüşme", body: "Planın nasıl ilerlediğini ve zorlandığın noktaları koçunla değerlendir." },
            { title: "Takip ve güncelleme", body: "Uygulama durumuna göre planını güncelle; gerektiğinde veliye uygun özet paylaşılır." },
          ]} />
        </div>
        <YonCoach />
        <YonWeeklyPlan />
        <YonProgress />
        <section className={`site-container ${styles.section}`}>
          <div className="grid items-center gap-8 border-y border-dc-line-soft py-8 lg:grid-cols-2">
            <div>
              <p className={styles.eyebrow}>Dino AI · {dino.status}</p>
              <h2 className={`mt-3 ${headingClass}`}>Koçun kararı, Dino AI’ın bağlamı.</h2>
              <p className="mt-4 text-[16px] leading-[1.65] text-dc-ink-body">{dino.description}</p>
              <p className="mt-3 text-[15px] leading-[1.65] text-dc-ink-muted">Ders ve deneme verisi planın odağını destekleyebilir. Planı kuran ve öğrenciyi tanıyan yine insan koçtur.</p>
              <Link href="/dino-ai" className="mt-3 inline-flex min-h-11 items-center text-[15px] font-bold text-dc-brand-strong">Dino AI’ı tanı →</Link>
            </div>
            <div className={`rounded-dc-card p-6 ${styles.surface}`}>
              <span className={styles.yellowLabel}>Örnek görünüm</span>
              <h3 className="mt-4 text-[18px] font-bold text-dc-ink">Görüşmede değerlendirilebilecek odaklar</h3>
              <ul className="mt-4 space-y-3 text-[15px] text-dc-ink-body"><li>Paragraf çalışmasında süre yönetimi</li><li>Denemede zorlanılan konuların tekrarı</li><li>Haftalık çalışma kapasitesi</li></ul>
              <p className="mt-4 text-[13px] leading-[1.6] text-dc-ink-muted">Temsili içerik; kişisel önerilere erişim Dino AI pilotunun kapsamına bağlıdır.</p>
            </div>
          </div>
        </section>
        <section className={`site-container ${styles.section}`}>
          <h2 className={headingClass}>Öğren, planla, ölç.</h2>
          <p className="mt-4 max-w-[680px] text-[16px] leading-[1.65] text-dc-ink-body">Koçunla planını oluşturur, deneme sonuçlarını sonraki haftanın planına taşırsın. İhtiyaç duyduğun desteği tek başına veya diğer ürünlerle birlikte değerlendirebilirsin.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { href: "/urunler/online-dershanem", name: "onlinedershanem.", title: "Konuyu öğretmenle kapat", body: "Planda eksik kalan konuyu canlı derste öğretmeninle çalış." },
              { href: denemeLigiBrand.href, name: denemeLigiBrand.name, title: "Planın sonucunu ölç", body: "Deneme sonuçlarıyla zorlandığın konuları gör; sonraki haftanın odağını koçunla belirle." },
            ].map((card) => (
              <Link key={card.href} href={card.href} className="rounded-dc-card border border-dc-line bg-white p-6">
                <p className="wrap-break-word text-[12px] font-bold text-dc-ink-muted">{card.name}</p>
                <h3 className="mt-3 text-[20px] font-bold text-dc-ink">{card.title} →</h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-dc-ink-muted">{card.body}</p>
              </Link>
            ))}
          </div>
        </section>
        <YonPrice />
        <ProductFaq title="Yön hakkında merak ettiklerin." items={faqs} />
        <YonClosing />
      </main>
      <SiteFooter />
    </div>
  );
}
