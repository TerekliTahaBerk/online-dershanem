import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { EditorialProductHero } from "@/components/product/editorial-product-hero";
import { PreMeetingLink } from "@/components/forms/pre-meeting-link";
import { getDinoMarketingCopy } from "@/lib/dino-marketing";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import styles from "./products.module.css";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ProductTrio } from "@/components/home/product-trio";
import { ProductCompare } from "@/components/home/product-compare";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Ürünler | onlinedershanem., onlinekoçum. × Yön Koçluk ve onlinedenemekulübüm. × Deneme Ligi",
  description:
    "LGS ve YKS için canlı ders, haftalık koçluk ve deneme analizi. Üç ürünü tek tek ya da birlikte alabilirsin.",
  canonical: "/urunler",
});

export default function ProductsPage() {
  const dino = getDinoMarketingCopy(getPanelFeatureFlags().dinoAi);
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Ürünler", url: "/urunler" }])} />
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <EditorialProductHero
          tone="lesson"
          titleId="products-title"
          lines={[{ text: "İhtiyacına göre seç." }, { text: "Kendi düzenini", emphasis: "kur." }]}
          description="Konuyu anlamak için canlı ders, haftanı planlamak için koçluk, gelişimini görmek için online deneme. LGS ve YKS hazırlığında ihtiyacın olan desteği tek başına veya birlikte kullan."
          actions={<>
            <a href="#urunleri-kesfet">Ürünleri keşfet <ArrowDown size={18} aria-hidden="true" /></a>
            <Link href="/paketler">Paketini oluştur <ArrowRight size={18} aria-hidden="true" /></Link>
          </>}
          facts={[
            { title: "Canlı derste öğren", detail: "Birebir ya da en fazla 4 kişilik grup" },
            { title: "Koçunla planla", detail: "Kişisel çalışma planı ve takip" },
            { title: "Denemeyle ölç", detail: "LGS, TYT ve AYT için analiz" },
          ]}
        />
        <div id="urunleri-kesfet" className={styles.catalog}>
          <ProductTrio title="Bugün hangi desteğe ihtiyacın var?" lede="Takıldığın konudan çalışma düzenine, deneme sonuçlarından sonraki adımına: sana uygun ürünü yakından tanı." />
        </div>
        <div className={styles.compare}><ProductCompare /></div>

        <section aria-labelledby="together-title">
          <div className={`site-container ${styles.section}`}>
            <p className={styles.eyebrow}>BİRLİKTE KULLANDIĞINDA</p>
            <h2 id="together-title">Derste başlayan öğrenme,<br /><span>haftanın tamamına yayılsın.</span></h2>
            <p className={styles.lede}>Her hizmeti ayrı ayrı seçebilirsin. Birlikte kullandığında ders, çalışma planı ve deneme sonuçları birbirine yön verir.</p>
            <ol className={styles.steps}>
              <li><span className={styles.stepNumber}>01 · ÖĞREN</span><h3>Konuyu öğretmeninle çalış.</h3><p>Canlı derste sorunu sor, takıldığın adımı öğretmeninle birlikte ele al.</p></li>
              <li><span className={styles.stepNumber}>02 · PLANLA</span><h3>Tekrarı haftana yerleştir.</h3><p>Koçunla çalışma kapasiteni ve önceliklerini değerlendir, öğrendiklerine planında yer aç.</p></li>
              <li><span className={styles.stepNumber}>03 · ÖLÇ</span><h3>Sonuçlarla yönünü güncelle.</h3><p>Denemede zorlandığın konuları gör; sonraki dersinin ve çalışmanın odağını belirle.</p></li>
            </ol>
            <Link href="/paketler" className={styles.textLink}>Birlikte kullanım seçeneklerini gör <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>

        <section className={styles.dino} aria-labelledby="products-dino-title">
          <div className={`site-container ${styles.dinoGrid}`}>
            <div><p className={styles.eyebrow}>DINO AI · {dino.status}</p><h2 id="products-dino-title">Ders, plan ve deneme.<br /><span>Aralarındaki bağ: Dino.</span></h2></div>
            <div><p>{dino.description}</p><p className={styles.dinoNote}>Öğretmenin ve koçun değerlendirmesini desteklemek için hazırlanıyor; karar ve paylaşım insan onayından geçer.</p><Link href="/dino-ai">Dino AI’ı tanı <ArrowRight size={18} aria-hidden="true" /></Link></div>
          </div>
        </section>

        <section className={`site-container ${styles.section} ${styles.closing}`} aria-labelledby="products-closing-title">
          <p className={styles.eyebrow}>İLK ADIMI BİRLİKTE BELİRLEYELİM</p>
          <h2 id="products-closing-title">Sana uygun desteği<br /><span>konuşarak bulalım.</span></h2>
          <p className={styles.lede}>Hedefini, çalışma düzenini ve zorlandığın noktaları paylaş. Canlı ders, koçluk ve denemeden hangisine ihtiyaç duyduğunu birlikte değerlendirelim.</p>
          <div className={styles.actions}><PreMeetingLink source="products_closing" className={styles.primary} /><Link href="/paketler" className={styles.secondary}>Paketini oluştur <ArrowRight size={18} aria-hidden="true" /></Link></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
