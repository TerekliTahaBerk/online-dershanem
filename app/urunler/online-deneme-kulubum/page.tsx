import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Plus } from "lucide-react";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PreMeetingLink } from "@/components/forms/pre-meeting-link";
import { singleProductPriceLabel } from "@/lib/commerce/package-builder-pricing";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { denemeLigiBrand as brand } from "@/lib/deneme-ligi-brand";
import styles from "./deneme-ligi.module.css";

export const metadata = buildMarketingMetadata({
  title: brand.name,
  description: brand.description,
  canonical: brand.href,
  imagePath: `${brand.href}/opengraph-image`,
  imageAlt: brand.imageAlt,
});

const steps = [
  { title: "Başvurunu gönder", body: "Başvuru formunda hedef sınavını ve Deneme Ligi’ne katılmak istediğini belirt." },
  { title: "Katılım ve erişimini netleştir", body: "Başlangıcını ve paketinin erişim koşullarını ekibimizle planla." },
  { title: "Denemeni çöz", body: "Paketinde yer alan denemeye, belirtilen takvim ve koşullarda katıl." },
  { title: "Sonucunu değerlendir", body: "Netlerini, ders dağılımını ve konu bazlı sonuçlarını incele." },
  { title: "Gelişimini takip et", body: "Denemelerini karşılaştır; bir sonraki çalışmanın odağını belirle." },
];

const faqs = [
  { q: "Deneme Ligi nedir?", a: "Deneme Ligi, onlinedenemekulübüm. ürününün yeni marka kimliğidir. Online deneme, sonuç analizi ve gelişim takibi onlinedershanem. altyapısı üzerinden sunulur." },
  { q: "Hangi sınavlar için deneme var?", a: "LGS ve YKS öğrencileri için denemeler bulunur. YKS kapsamı TYT ve AYT’dir. Katılacağın denemeler seçtiğin paketin içeriğine bağlıdır." },
  { q: "Deneme Ligi’ne nasıl katılırım?", a: "Lige Başvur butonuyla başvuru formuna git, hedef sınavını ve Deneme Ligi’ni belirt. Hesabını ekibimiz açar; başlangıç ve erişim koşullarını birlikte netleştiririz. Katılım ücretsiz veya otomatik değildir; mevcut paket koşulları geçerlidir." },
  { q: "Hesap açınca denemelere erişebilir miyim?", a: "Kendi kendine hesap açma kapalıdır; hesabını başvurunun ardından ekibimiz oluşturur. Başvurmak tek başına deneme erişimi sağlamaz. Denemelere katılım, hesabına tanımlanan paket ve erişim haklarına bağlıdır." },
  { q: "Lig puanı, sezon veya ödül sistemi var mı?", a: "Bu aşamada ayrı bir lig puanı, sezon veya ödül sistemi sunulmuyor. Deneme Ligi’nin odağı denemeye katılım, sonuçlarını değerlendirme ve kişisel gelişimini takip etmedir." },
  { q: "Deneme takvimi ve erişim koşulları nasıl belirleniyor?", a: "Deneme takvimi, katılım zamanı ve erişim süresi seçtiğin paketin koşullarına göre belirlenir. Katılım öncesinde paket içeriğini ve başlangıç koşullarını ekibimizle netleştirebilirsin." },
];

function JoinLink() {
  return (
    <Link href={brand.joinHref} className={styles.join}>
      {brand.joinLabel}<ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}

export default function OnlineDenemeKulubumPage() {
  const price = singleProductPriceLabel("denemeKulubum");
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={[
        breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Ürünler", url: "/urunler" }, { name: brand.name, url: brand.href }]),
        faqJsonLd(faqs),
      ]} />
      <main id="main-content" tabIndex={-1} className={styles.league}>
        <section className={styles.hero} aria-labelledby="league-title">
          <div className={`site-container ${styles.heroGrid}`}>
            <div>
              <p className={styles.brandName}>{brand.name}</p>
              <h1 id="league-title">Denemeye katıl.{" "}<br /><span>Gelişimini gör.</span></h1>
              <p className={styles.heroBody}>{brand.description}</p>
              <div className={styles.actions}>
                <JoinLink />
                <a href="#nasil-isler" className={styles.outline}>Nasıl İşler?<span aria-hidden="true">↓</span></a>
              </div>
              <p className={styles.participation}>{brand.participationNote}</p>
              <p className={styles.infrastructure}>{brand.infrastructure}</p>
            </div>
            <div className={styles.heroMedia}>
              <Image src="/deneme-ligi/logo.png" alt="Deneme Ligi logosu" width={1254} height={1254} sizes="(max-width: 767px) 88vw, (max-width: 1023px) 40vw, 440px" preload className={styles.squareImage} />
            </div>
          </div>
        </section>

        <section className={`site-container ${styles.section}`} aria-labelledby="tracks-title">
          <div className={styles.sectionHeading}>
            <p className={styles.label}>LGS · TYT · AYT</p>
            <h2 id="tracks-title">Hedefine uygun deneme yolunu seç</h2>
          </div>
          <div className={styles.tracks}>
            <article className={styles.track}>
              <Image src="/deneme-ligi/mascot-lgs.png" alt="" width={1254} height={1254} sizes="(max-width: 599px) 120px, (max-width: 1023px) 180px, 210px" className={styles.trackImage} />
              <div>
                <p className={styles.label}>LGS</p>
                <h3>Temelini güçlendir.<br />Gelişimini takip et.</h3>
                <p>LGS denemeleriyle seviyeni ölç, zorlandığın konuları fark et ve sonraki çalışmana yön ver.</p>
                <span className={styles.trackNote}>LGS hazırlığı</span>
              </div>
            </article>
            <article className={styles.track}>
              <Image src="/deneme-ligi/mascot-yks.png" alt="" width={1254} height={1254} sizes="(max-width: 599px) 120px, (max-width: 1023px) 180px, 210px" className={styles.trackImage} />
              <div>
                <p className={styles.label}>YKS · TYT ve AYT</p>
                <h3>Netlerini değerlendir.<br />Hedefine odaklan.</h3>
                <p>TYT ve AYT denemelerinde sonuçlarını incele; konu bazlı gelişimini ve bir sonraki adımını gör.</p>
                <span className={styles.trackNote}>TYT + AYT hazırlığı</span>
              </div>
            </article>
          </div>
        </section>

        <section id="nasil-isler" className={`site-container ${styles.section} ${styles.process}`} aria-labelledby="process-title">
          <div className={styles.centerHeading}>
            <p className={styles.label}>KATILIMDAN GELİŞİME</p>
            <h2 id="process-title">Deneme Ligi nasıl işler?</h2>
            <p>Her deneme, bir sonraki çalışman için bir başlangıç.</p>
          </div>
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={`site-container ${styles.section} ${styles.analysis}`} aria-labelledby="analysis-title">
          <div>
            <p className={styles.label}>SONUCUNUN ÖTESİNE BAK</p>
            <h2 id="analysis-title">Her denemede bir sonraki adımını gör</h2>
            <p className={styles.lede}>Sadece net sayısında kalma. Sonucunu değerlendir, konu bazlı eksiklerini fark et ve denemeler arasındaki gelişimini takip et.</p>
            <ul className={styles.benefits}>
              {["Net, puan ve ders bazlı sonuçlar", "Konu ve soru tipine göre kayıp analizi", "Denemeler arası gelişim karşılaştırması"].map((benefit) => (
                <li key={benefit}><Check size={18} aria-hidden="true" />{benefit}</li>
              ))}
            </ul>
          </div>
          <figure className={styles.result}>
            <figcaption><span>Denemeler arası gelişim</span><span className={styles.example}>Örnek görünüm</span></figcaption>
            <div className={styles.chart} role="img" aria-label="Temsili net grafiği: birinci deneme 28, ikinci 42, üçüncü 55, dördüncü 68 net. Gerçek öğrenci verisi değildir.">
              {[28, 42, 55, 68].map((net, index) => (
                <div className={styles.chartColumn} key={net}>
                  <span className={styles.bar} style={{ height: `${net * 2.2}px` }}><span>{net}</span></span>
                  <span className={styles.chartLabel}>{index + 1}. deneme</span>
                </div>
              ))}
            </div>
            <p className={styles.chartFootnote}>Temsili verilerle hazırlanmıştır; gelişim veya sonuç garantisi değildir.</p>
          </figure>
        </section>

        <section className={styles.membership} aria-labelledby="membership-title">
          <div className={`site-container ${styles.membershipGrid}`}>
            <div>
              <p className={styles.label}>DENEME LİGİ’NE KATIL</p>
              <h2 id="membership-title">Denemeyle ölç.<br />Bir sonraki adımını belirle.</h2>
              <p className={styles.lede}>LGS, TYT ve AYT için mevcut deneme ürününü seç. İçerik, takvim ve erişim koşullarını katılım öncesinde netleştir.</p>
              {price ? <p className={styles.price}>{price.price}<span>/ dönem</span></p> : <p className={styles.membershipNote}>Güncel fiyatı paket sayfasında incele.</p>}
              <JoinLink />
              <p className={styles.membershipNote}>{brand.participationNote}</p>
            </div>
            <aside className={styles.companions} aria-label="Birlikte kullanabileceğin ürünler">
              <p className={styles.label}>HAZIRLIĞINI TAMAMLA</p>
              <h3>Ders ve koçlukla birlikte de kullanabilirsin.</h3>
              <Link href="/urunler/online-dershanem"><span><strong>onlinedershanem.</strong><span>Eksiğini canlı derste öğretmenle çalış.</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/urunler/online-kocum"><span><strong>onlinekoçum.</strong><span>Deneme sonucunu haftalık planına taşı.</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
            </aside>
          </div>
        </section>

        <section className={`site-container ${styles.section}`} aria-labelledby="faq-title">
          <div className={styles.faqHeading}>
            <div><p className={styles.label}>SIK SORULANLAR</p><h2 id="faq-title">Merak ettiklerin burada.</h2></div>
            <Link href={brand.meetingHref} className={styles.textLink}>Sorunu ekibimizle konuş<ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <div className={styles.faqList}>
            {faqs.map((faq) => (
              <details key={faq.q} className={styles.faq}>
                <summary>{faq.q}<Plus size={20} aria-hidden="true" /></summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`site-container ${styles.closingSection}`} aria-labelledby="closing-title">
          <div className={styles.closing}>
            <Image src="/deneme-ligi/mascot-d.png" alt="" width={1254} height={1254} sizes="(max-width: 767px) 96px, 140px" className={styles.closingImage} />
            <div><h2 id="closing-title">Bir sonraki denemene daha bilinçli hazırlan.</h2><p>{brand.infrastructure}</p></div>
            <div className={styles.closingActions}>
              <JoinLink />
              <PreMeetingLink href={brand.meetingHref} source="deneme_ligi_closing" className={styles.outline} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
