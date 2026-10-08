import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { getDinoMarketingCopy } from "@/lib/dino-marketing";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import styles from "./dino.module.css";

export const metadata = buildMarketingMetadata({
  title: "Dino AI | Ders, plan ve deneme bağı",
  description:
    "Dino AI pilot hazırlıkları: ders, plan ve deneme desteği için öğretmen ve koçun kararını destekleyen örnekler. Ayrı satılan bir ürün değildir.",
  canonical: "/dino-ai",
});

const surfaces = [
  {
    tone: "lesson",
    label: "DERSTEN",
    title: "Takıldığın konuyu fark etmek.",
    body: "Öğretmenin paylaşmayı onayladığı ders özetinden, yeniden ele alınabilecek konulara dikkat çekmek hedefleniyor.",
    quote: "Ders notundaki zorlandığın konuya, sonraki çalışmanda birlikte dönebiliriz.",
    href: "/urunler/online-dershanem",
    link: "Canlı dersleri keşfet",
  },
  {
    tone: "coaching",
    label: "PLANA",
    title: "Tekrarı planınla buluşturmak.",
    body: "Ders ve deneme bilgisinin, koçunun haftalık planı değerlendirirken kullanabileceği bir bağlama dönüşmesi amaçlanıyor.",
    quote: "Planında tekrar için yer açmayı birlikte değerlendirebiliriz.",
    href: "/urunler/online-kocum",
    link: "Yön Koçluk’u keşfet",
  },
  {
    tone: "exam",
    label: "DENEMEDEN",
    title: "Sonuçtan bir sonraki adıma.",
    body: "Deneme sonuçlarında yeniden çalışılabilecek konuları anlaşılır kılmak ve öğretmeninle değerlendirmene yardımcı olmak hedefleniyor.",
    quote: "Deneme sonuçlarında yeniden çalışabileceğin konuları birlikte inceleyebiliriz.",
    href: "/urunler/online-deneme-kulubum",
    link: "Deneme Ligi’ni keşfet",
  },
] as const;

export default function DinoAiPage() {
  const copy = getDinoMarketingCopy(getPanelFeatureFlags().dinoAi);
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Dino AI", url: "/dino-ai" }])} />
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <section className={styles.hero} aria-labelledby="dino-title">
          <div className={`site-container ${styles.heroContent}`}>
            <div className={styles.intro}>
              <p className={styles.identity}>Dino<span>AI</span><span className={styles.status}>{copy.status}</span></p>
              <h1 id="dino-title" className={styles.headline}>
                Ders, plan, deneme.<br />Aralarındaki bağ: <span className={styles.marker}>Dino.</span>
              </h1>
              <p className={styles.lede}>Öğrendiklerin, çalıştıkların ve deneme sonuçların aynı hikâyenin parçaları. Dino AI, bu parçaları öğretmenin ve koçun için anlamlı bir bütüne dönüştürmek üzere hazırlanıyor.</p>
              <div className={styles.actions}>
                <a href="#dino-nasil-destekler" className={styles.primary}>Dino’yu tanı <ArrowDown size={18} aria-hidden="true" /></a>
                <Link href="/urunler" className={styles.secondary}>Ürünleri keşfet <ArrowRight size={18} aria-hidden="true" /></Link>
              </div>
              <p className={styles.availability}>{copy.description}</p>
            </div>
          </div>
          <dl className={`site-container ${styles.principles}`}>
            <div><dt>Üç alan, ortak bağ</dt><dd>Ders, çalışma planı ve deneme</dd></div>
            <div><dt>İnsan onayıyla</dt><dd>Karar öğretmeninde ve koçunda</dd></div>
            <div><dt>Deneyimin bir parçası</dt><dd>Ayrı satılan bir ürün değil</dd></div>
          </dl>
        </section>

        <section id="dino-nasil-destekler" className={`site-container ${styles.explainer}`} aria-labelledby="dino-support-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>HAZIRLADIĞIMIZ DENEYİM</p>
            <h2 id="dino-support-title">Birbirinden kopuk bilgilerden,<br /><span>daha anlaşılır bir yol.</span></h2>
            <p>Dino’nun odağı, öğretmenin ve koçun değerlendirmesini desteklemek. Ders, plan ve deneme arasında kurulması hedeflenen bağ şöyle:</p>
          </div>
          <div className={styles.stories}>
            {surfaces.map((surface, index) => (
              <article key={surface.href} className={`${styles.story} ${styles[surface.tone]}`}>
                <div className={styles.storyLabel}><span>{surface.label}</span><span aria-hidden="true">0{index + 1}</span></div>
                <h3>{surface.title}</h3>
                <p>{surface.body}</p>
                <blockquote><span className={styles.example}>ÖRNEK DESTEK İFADESİ</span>“{surface.quote}”</blockquote>
                <Link href={surface.href}>{surface.link}<ArrowRight size={17} aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
          <p className={styles.exampleNote}>Bu ifadeler hedeflenen deneyimi anlatan örneklerdir; kişisel değerlendirme veya kullanılabilirlik sözü değildir.</p>
        </section>

        <section className={styles.human} aria-labelledby="dino-human-title">
          <div className={`site-container ${styles.humanGrid}`}>
            <div><p className={styles.eyebrow}>TEKNOLOJİ DESTEKLER. İNSAN YÖN VERİR.</p><h2 id="dino-human-title">Veriye dikkat.<br /><span>Kararda insan.</span></h2></div>
            <div className={styles.humanBody}>
              <p>Dino’nun hazırladığı öneriyi öğretmenin ve koçun değerlendirir. Planı kuran, önceliklerini belirleyen ve seninle konuşan yine seni tanıyan insanlardır.</p>
              <p>Karar ve paylaşım insan onayından geçer. Dino AI için erişim, pilot kapsamına göre belirlenir.</p>
              <Link href="/paketler">Sana uygun desteği keşfet <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
