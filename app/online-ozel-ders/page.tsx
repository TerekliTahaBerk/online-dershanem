import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { FooterCta } from "@/components/marketing/footer-cta";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Online Özel Ders mi, Küçük Grup mu? | LGS ve YKS",
  description: "LGS ve YKS için birebir online özel ders ve en fazla 4 kişilik canlı grubu karşılaştırın. Öğretmen etkileşimi, çalışma yönü ve güncel seçenekleri inceleyin.",
  canonical: "/online-ozel-ders",
});
const faqs = [
  { q: "Online özel ders yalnız matematik için mi?", a: "Hayır. onlinedershanem. LGS ve YKS için farklı derslerde canlı öğrenme sunar. Güncel ders ve format seçeneklerini paket kurucuda görebilirsin." },
  { q: "Birebir ve küçük grup arasındaki fark ne?", a: "Birebirde öğretmen bir öğrenciyle çalışır. Küçük grupta en fazla 4 öğrenci birlikte öğrenir; her öğrencinin soru sormasına ve çözümünü göstermesine alan açılır. Uygun format seviye, hedef ve programa göre değerlendirilir." },
  { q: "Koçluk veya deneme almak zorunda mıyım?", a: "Hayır. Canlı dersle başlayabilirsin. Çalışma düzeni için Yön Koçluk, ölçme ve sonuç analizi için Deneme Ligi ayrıca değerlendirilebilir." },
];
const formats = [
  { title: "Birebir online özel ders", body: "Öğretmenle tek öğrenci. Belirli bir konuda kişisel çalışma temposuna ve yoğun bireysel geri bildirime ihtiyaç duyanlar için değerlendirilebilir.", detail: "Bir öğrenci · canlı soru-cevap" },
  { title: "Küçük grupta canlı ders", body: "En fazla 4 öğrenci. Benzer seviye ve hedefte öğrencilerle birlikte çözüm, soru-cevap ve düzenli ders akışı sunar.", detail: "En fazla 4 öğrenci · birlikte öğrenme" },
];
export default function OnlineOzelDersPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={[breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Online özel ders rehberi", url: "/online-ozel-ders" }]), faqJsonLd(faqs)]} />
      <main id="main-content" tabIndex={-1}>
        <PageHero eyebrow="Canlı ders rehberi" align="left" title="Birebir mi, küçük grup mu? İhtiyacına göre seç." subtitle="Online özel ders ararken yalnız ders adına bakma. Öğretmenle etkileşim, çalışma temposu ve ders sonrası yönlendirme de seçimin parçası." actions={<><Link href="/urunler/online-dershanem" className="site-btn site-btn-primary">Canlı öğrenmeyi incele</Link><Link href="/paketler" className="site-btn site-btn-secondary">Format ve fiyatları karşılaştır</Link></>} />
        <section className="site-container py-(--dc-section)">
          <h2 className="font-display text-(length:--public-title) leading-[1.1] tracking-tight text-dc-ink">İki formatta da öğretmenle canlı öğrenme.</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {formats.map((format) => <article key={format.title} className="rounded-dc-card border border-dc-line bg-white p-7"><p className="text-[13px] font-semibold text-dc-brand-strong">{format.detail}</p><h3 className="mt-4 text-[23px] font-bold text-dc-ink">{format.title}</h3><p className="mt-3 text-[16px] leading-7 text-dc-ink-body">{format.body}</p></article>)}
          </div>
          <p className="mt-6 max-w-3xl text-[16px] leading-7 text-dc-ink-body">onlinedershanem. farklı derslerde canlı öğrenme sunar. Bu rehber format seçimine yardımcı olur; güncel ders listesi, fiyat ve başlangıç koşulları ürün sayfasında ve paket kurucuda yer alır.</p>
          <Link href="/ders-paketleri" className="mt-4 inline-flex min-h-11 items-center font-semibold text-dc-brand-strong">Doğrudan satın alınabilir matematik seçenekleri →</Link>
        </section>
        <section className="border-y border-dc-line-soft bg-dc-surface-muted">
          <div className="site-container py-(--dc-section-tight)">
            <h2 className="text-[24px] font-bold text-dc-ink">Seçimini destekleyen rehberler</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { href: "/matematik", label: "Matematikte çalışma ve canlı destek" },
                { href: "/blog/online-ozel-ders-mi-dershane-mi", label: "Online özel ders mi dershane mi?" },
                { href: "/lgs", label: "LGS canlı öğrenme rehberi" },
                { href: "/yks", label: "YKS canlı öğrenme rehberi" },
              ].map((link) => <Link key={link.href} href={link.href} className="rounded-dc-card-sm border border-dc-line bg-white p-5 font-semibold text-dc-ink">{link.label} →</Link>)}
            </div>
          </div>
        </section>
        <FaqAccordion title="Format seçimi hakkında" items={faqs} tone="plain" />
        <FooterCta title="Uygun ders formatını birlikte bulalım." subtitle="Sınıfını, hedefini ve takıldığın konuyu ücretsiz ön görüşmede paylaşabilirsin." ctaLabel="Ücretsiz ön görüşme" ctaHref="/iletisim#on-gorusme" />
      </main>
      <SiteFooter />
    </div>
  );
}
