import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import styles from "./legal-page-template.module.css";

export type LegalSection = { title: string; paragraphs: string[] };
type Props = {
  pageTitle: string;
  intro: string;
  effectiveDate: string;
  sections: LegalSection[];
  summary: { title: string; text: string }[];
  reviewNote?: string;
  sources: { title: string; href: string }[];
};
const pages = [
  { title: "Gizlilik Politikası", label: "Gizlilik", href: "/gizlilik" },
  { title: "KVKK Aydınlatma Metni", label: "KVKK", href: "/kvkk" },
  { title: "İade Politikası", label: "İptal & İade", href: "/iade" },
];
export function LegalPageTemplate({ pageTitle, intro, effectiveDate, sections, summary, reviewNote, sources }: Props) {
  const current = pages.find((page) => page.title === pageTitle)!;
  return (
    <div className="site-scope">
      <SchemaJsonLd schema={breadcrumbJsonLd([{ name: "Ana Sayfa", url: "/" }, { name: pageTitle, url: current.href }])} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <header className={styles.hero}>
          <div className="site-container">
            <p className={styles.eyebrow}>Açık bilgi. Net koşullar.</p>
            <h1>{pageTitle}</h1>
            <p className={styles.intro}>{intro}</p>
            <p className={styles.date}>Metin güncellemesi <span aria-hidden="true">·</span> {effectiveDate}</p>
            <nav className={styles.tabs} aria-label="Yasal bilgilendirme sayfaları">
              {pages.map((page) => <Link key={page.href} href={page.href} aria-current={page === current ? "page" : undefined}>{page.label}</Link>)}
            </nav>
          </div>
        </header>
        <div className={`site-container ${styles.content}`}>
          <div className={styles.summary}>
            {summary.map((item, i) => <div key={item.title}><span className={styles.number}>0{i + 1}</span><h2>{item.title}</h2><p>{item.text}</p></div>)}
          </div>
          {reviewNote && <aside className={styles.notice} aria-label="Metin hazırlık durumu"><strong>İnceleme taslağı</strong><p>{reviewNote}</p></aside>}
          <div className={styles.layout}>
            <aside className={styles.sidebar}>
              <p className={styles.eyebrow}>Bu sayfada</p>
              <nav aria-label={`${pageTitle} bölüm başlıkları`}>
                {sections.map((section, i) => <a key={section.title} href={`#bolum-${i + 1}`}><span>{String(i + 1).padStart(2, "0")}</span>{section.title}</a>)}
              </nav>
              <div className={styles.help}><Mail size={20} aria-hidden="true" /><h2>Bir sorunuz mu var?</h2><p>Talebinizi doğru ekibe ulaştıralım.</p><Link href="/iletisim">Bize ulaşın <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
            </aside>
            <div className={styles.document}>
              {sections.map((section, i) => <section key={section.title} id={`bolum-${i + 1}`} className={styles.section}><div className={styles.sectionTitle}><span className={styles.number}>{String(i + 1).padStart(2, "0")}</span><h2>{section.title}</h2></div>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
              <div className={styles.sources}><h2>İlgili resmî kaynaklar</h2>{sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={14} aria-hidden="true" /></a>)}</div>
            </div>
          </div>
          <section className={styles.contact}><div><p className={styles.eyebrow}>İletişim</p><h2>Sorunuz cevapsız kalmasın.</h2><p>Gizlilik, kişisel veriler veya iade talebiniz için bize yazın.</p></div><a href="mailto:iletisim@onlinedershanem.com">E-posta gönder <ArrowUpRight size={18} aria-hidden="true" /></a></section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
