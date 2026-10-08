import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { EditorialProductHero } from "@/components/product/editorial-product-hero";
import { ArrowDown, ArrowRight } from "lucide-react";
import { PreMeetingLink } from "@/components/forms/pre-meeting-link";
import styles from "./about.module.css";
import { ProductBrandLabel } from "@/components/product/product-brand-label";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { listActivePublicProducts } from "@/lib/public-marketing-products-server";
import { getDinoMarketingCopy } from "@/lib/dino-marketing";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Hakkımızda | Öğrenme, plan ve ölçme aynı çatı altında",
  description: "onlinedershanem. ile canlı öğrenme, Yön Koçluk ile çalışma düzeni, Deneme Ligi ile ölçülebilir ilerleme. İnsan uzmanlığını merkeze alan yaklaşımımızı tanıyın.",
  canonical: "/hakkimizda",
});

const principles = [
  { title: "Gerçek etkileşim", body: "Birebir ya da en fazla 4 kişilik canlı grupta öğrenci soru sorabilmeli, çözümünü gösterebilmeli ve geri bildirim alabilmeli." },
  { title: "İnsan uzmanlığı merkezde", body: "Konuyu öğretmen öğretir, planı öğrenciyi tanıyan insan koç kurar. Teknoloji onların sorumluluğunu devralmaz." },
  { title: "Şeffaf kapsam ve koşullar", body: "Ürünün ne sunduğunu, fiyatını ve erişim koşullarını açıkça anlatırız. Öğrenci ve veli neye başladığını bilmelidir." },
  { title: "Görünür ilerleme", body: "Katılım, çalışma ve deneme sonuçları süreci anlamaya yardımcı olur. Tek bir puan öğrencinin bütün hikâyesini anlatmaz." },
  { title: "Uygulanabilir sonraki adım", body: "Ders veya deneme sonunda öğrencinin elinde çalışabileceği net bir yön olmalı. Plan günlük hayatına sığmalıdır." },
  { title: "Sürdürülebilir destek", body: "İhtiyaç kadar destekle başlamak, küçük grupta öğrenmeyi erişilebilir kılmak ve gerçekçi bir çalışma temposu kurmak için çalışırız." },
];
const roles = { OD: "Öğren", OK: "Planla", ODK: "Ölç", KPSS: "Planla" };

export default async function HakkimizdaPage() {
  const products = await listActivePublicProducts();
  const dino = getDinoMarketingCopy(getPanelFeatureFlags().dinoAi);
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Hakkımızda", url: "/hakkimizda" }])} />
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <EditorialProductHero
          tone="lesson"
          titleId="about-title"
          lines={[{ text: "Bir sonraki adımın" }, { text: "birlikte", emphasis: "netleşsin." }]}
          description="Her öğrencinin ihtiyacı, öğrenme hızı ve hedefi farklı. Canlı ders, kişisel çalışma planı ve online denemeyi aynı çatı altında buluşturuyor; sana uygun bir hazırlık düzeni kurman için çalışıyoruz."
          actions={<>
            <a href="#misyonumuz">Bizi tanı <ArrowDown size={18} aria-hidden="true" /></a>
            <Link href="/urunler">Ürünleri keşfet <ArrowRight size={18} aria-hidden="true" /></Link>
          </>}
          facts={[
            { title: "Öğrenciye yakın", detail: "Küçük grupta veya birebir öğrenme" },
            { title: "İnsan uzmanlığıyla", detail: "Öğretmen ve koç desteği" },
            { title: "İhtiyacın kadar", detail: "Ayrı ayrı veya birlikte kullanım" },
          ]}
        />

        <section id="misyonumuz" className={`site-container ${styles.section} ${styles.mission}`} aria-labelledby="mission-title">
          <div><p className={styles.eyebrow}>NEDEN VARIZ?</p><h2 id="mission-title">Öğrenirken duyulmak.<br />Çalışırken <span>yön bulmak.</span></h2></div>
          <div className={styles.prose}>
            <p>Bir konuyu izlemek başlangıç olabilir. Ama takıldığın soruyu sorabilmek, nasıl çalışacağını bilmek ve ilerlediğini görebilmek de öğrenmenin bir parçası.</p>
            <p>onlinedershanem.’i bu ihtiyaçları bir araya getirmek için kurduk. Amacımız, öğrencinin kalabalıkta kaybolmadan öğrenebildiği ve bir sonraki adımını bildiği bir düzen oluşturmak.</p>
            <p className={styles.missionNote}>Her öğrenci aynı desteğe ihtiyaç duymaz. İhtiyacın olan yerden başlayabilirsin.</p>
          </div>
        </section>

        <section className={styles.productsSection} aria-labelledby="approach-title">
          <div className={`site-container ${styles.section}`}>
            <div className={styles.heading}><p className={styles.eyebrow}>NASIL DESTEK OLUYORUZ?</p><h2 id="approach-title">Farklı ihtiyaçlar.<br /><span>Birbirini tamamlayan destek.</span></h2><p>Öğrenmek, düzenli çalışmak ve ilerlemeyi görmek. Her ürün bu yolculuğun farklı bir adımında yanında.</p></div>
            <div className={styles.products}>
              {products.map((product, index) => (
                <article key={product.slug} className={`${styles.product} ${styles[product.registryCode]}`}>
                  <div className={styles.productTop}><span>{roles[product.registryCode]}</span><span aria-hidden="true">0{index + 1}</span></div>
                  <h3><ProductBrandLabel href={product.href} fallback={product.name} /></h3>
                  <p>{product.description}</p>
                  <Link href={product.href}>Yakından tanı <ArrowRight size={18} aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`site-container ${styles.section}`} aria-labelledby="principles-title">
          <div className={styles.heading}><p className={styles.eyebrow}>BİZE YÖN VEREN İLKELER</p><h2 id="principles-title">Nasıl öğrettiğimiz kadar,<br /><span>nasıl yaklaştığımız da önemli.</span></h2></div>
          <div className={styles.principles}>
            {principles.map((principle, index) => (
              <article key={principle.title} className={styles.principle}>
                <span className={styles.number} aria-hidden="true">0{index + 1}</span>
                <div><h3>{principle.title}</h3><p>{principle.body}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.dino} aria-labelledby="about-dino-title">
          <div className={`site-container ${styles.dinoGrid}`}>
            <div><p className={styles.eyebrow}>DINO AI · {dino.status}</p><h2 id="about-dino-title">Teknoloji destekler.<br /><span>İnsan yol gösterir.</span></h2></div>
            <div className={styles.dinoBody}><p>{dino.description}</p><p>Öğretmenin ve koçun değerlendirmesini destekleyen bir deneyim hazırlıyoruz. Karar ve paylaşım insan onayından geçer.</p><Link href="/dino-ai">Dino AI’ı tanı <ArrowRight size={18} aria-hidden="true" /></Link></div>
          </div>
        </section>

        <section className={`site-container ${styles.section} ${styles.closing}`} aria-labelledby="about-team-title">
          <p className={styles.eyebrow}>TANIŞARAK BAŞLAYALIM</p>
          <h2 id="about-team-title">Hedefini ve ihtiyacını<br /><span>birlikte konuşalım.</span></h2>
          <p>Canlı derslerde öğretmenlerimiz, çalışma düzeninde koçlarımız, deneyimin arkasında ürün ekibimiz var. Aklındaki soruları paylaş; sana uygun desteği birlikte değerlendirelim.</p>
          <div className={styles.actions}><PreMeetingLink source="about_closing" className={styles.primary} /><Link href="/iletisim" className={styles.secondary}>Bize ulaş <ArrowRight size={18} aria-hidden="true" /></Link></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
