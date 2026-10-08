import Link from "next/link";
import { PreMeetingLink } from "@/components/forms/pre-meeting-link";
import { singleProductPriceLabel } from "@/lib/commerce/package-builder-pricing";
import { yonBrand } from "@/lib/yon-brand";
import { EditorialProductHero } from "./editorial-product-hero";
import styles from "./yon-brand.module.css";

const headingClass = `font-display text-(length:--public-title) leading-[1.12] tracking-tight ${styles.title}`;
const bodyClass = "mt-4 text-[16px] leading-[1.65] text-dc-ink-body";

export function YonHero() {
  return (
    <EditorialProductHero
      tone="coaching"
      titleId="coaching-title"
      lines={[{ text: "Yönünü belirle." }, { text: "Planını", emphasis: "uygula." }]}
      description="Hedefini, her hafta uygulayabileceğin bir plana dönüştür. LGS ve YKS hazırlığında tüm derslerini koçunla planla; birebir görüşmelerle çalışma düzenini takip et ve ihtiyaçlarına göre güncelle."
      actions={<>
        <PreMeetingLink href={yonBrand.meetingHref} source="product_hero" className="" />
        <a href="#nasil-calisir">Koçluk nasıl çalışır? <span aria-hidden="true">↓</span></a>
      </>}
      facts={[
        { title: "Seni tanıyan bir koç", detail: "Birebir görüşme ve yol gösterme" },
        { title: "Hayatına uyan bir plan", detail: "Tüm dersler için kişisel haftalık plan" },
        { title: "Düzenli takip, güncel plan", detail: "Uygulama takibi ve plan güncelleme" },
      ]}
    />
  );
}

export function YonIntroduction() {
  return (
    <section className={`site-container ${styles.section}`}>
      <h2 className={`max-w-[700px] ${headingClass}`}>Hedefini uygulanabilir bir düzene çevir.</h2>
      <p className={`max-w-[700px] ${bodyClass}`}>
        Yön, onlinekoçum.’un koçluk deneyiminin yeni marka adıdır. Yalnızca plan hazırlamaz;
        planını uygulamana ve doğru yönde kalmana yardımcı olur.
      </p>
      <dl className="mt-8 grid gap-6 sm:grid-cols-3">
        {[
          ["Hedef", "Nereden başladığını ve neye ulaşmak istediğini koçunla netleştir."],
          ["Plan", "Haftalık kapasiteni ve tüm derslerini kapsayan uygulanabilir bir plan kur."],
          ["Takip", "Yaptıklarını birlikte değerlendir, ihtiyaçlarına göre planını güncelle."],
        ].map(([title, body], i) => (
          <div key={title} className="border-t border-dc-brand-soft-line pt-4">
            <dt className={`text-[22px] font-extrabold ${styles.title}`}>
              <span className="mr-3 font-mono text-[12px] text-dc-brand-strong">0{i + 1}</span>{title}
            </dt>
            <dd className="mt-2 text-[15px] leading-[1.65] text-dc-ink-muted">{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function YonCoach() {
  return (
    <section className={`site-container grid items-center gap-8 lg:grid-cols-2 ${styles.section}`}>
      <div>
        <p className={styles.eyebrow}>Birebir insan koç</p>
        <h2 className={`mt-3 ${headingClass}`}>Planını, seni tanıyan koçunla kur.</h2>
        <p className={bodyClass}>
          Hedefin kadar zamanın, zorlandığın dersler ve çalışma düzenin de önemli.
          Koçunla birebir görüşmelerde planın nasıl ilerlediğini konuşur, tıkanan noktalar
          için birlikte bir sonraki adımı belirlersin.
        </p>
        <p className="mt-3 text-[14px] leading-[1.6] text-dc-ink-muted">
          Görüşme sıklığı, ihtiyaçların ve programın doğrultusunda ön görüşmede belirlenir.
        </p>
      </div>
      <div className={`rounded-dc-card p-6 sm:p-8 ${styles.surface}`}>
        <h3 className="text-[18px] font-bold text-dc-ink">Görüşmede neleri konuşuruz?</h3>
        <ol className="mt-4 divide-y divide-dc-brand-soft-line text-[15px] leading-[1.6] text-dc-ink-body">
          {[
            "Bu hafta hangi çalışmaları uygulayabildin?",
            "Hangi konularda veya çalışma düzeninde zorlandın?",
            "Gelecek haftanın planında neyi güncelleyelim?",
          ].map((text) => <li key={text} className="py-3 first:pt-0 last:pb-0">{text}</li>)}
        </ol>
      </div>
    </section>
  );
}

export function YonWeeklyPlan() {
  return (
    <section className={`site-container grid items-center gap-8 lg:grid-cols-2 ${styles.section}`}>
      <div>
        <p className={styles.eyebrow}>Haftalık Yön</p>
        <h2 className={`mt-3 ${headingClass}`}>Bu haftaki yönün net olsun.</h2>
        <p className={bodyClass}>
          Ne çalışacağını, hangi derse zaman ayıracağını ve haftalık hedefini koçunla belirle.
          Planın uygulanmasını görüşmelerde birlikte değerlendir.
        </p>
        <p className="mt-3 text-[14px] leading-[1.6] text-dc-ink-muted">
          Bu bir ürün ekranı değil, haftalık planın nasıl anlatılabileceğini gösteren örnek bir görünüm.
        </p>
      </div>
      <div className={`rounded-dc-card p-5 sm:p-7 ${styles.surface}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[20px] font-extrabold text-dc-ink">Bu haftaki yönün</h3>
          <span className={styles.yellowLabel}>Örnek görünüm</span>
        </div>
        <p className="mt-4 text-[14px] leading-[1.6] text-dc-ink-body">
          <strong>Haftalık hedef:</strong> Paragraf çalışmasını düzenli sürdür, denemede zorlandığın konuları tekrar et.
        </p>
        <ul className="mt-5 space-y-3">
          {[
            { day: "Pazartesi", lesson: "Türkçe · Paragraf çalışması", status: "Tamamlandı" },
            { day: "Çarşamba", lesson: "Matematik · Konu tekrarı", status: "Tamamlandı" },
            { day: "Cuma", lesson: "Fen · Deneme değerlendirmesi", status: "Planda" },
          ].map(({ day, lesson, status }) => (
            <li key={day} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dc-brand-soft-line bg-white p-3.5">
              <div><p className="text-[12px] font-semibold text-dc-ink-muted">{day}</p><p className="mt-1 text-[14px] font-bold text-dc-ink">{lesson}</p></div>
              <span className="text-[12px] font-semibold text-dc-brand-strong">{status}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] font-semibold text-dc-ink-muted">2 çalışma tamamlandı · 1 çalışma planda</p>
      </div>
    </section>
  );
}

export function YonProgress() {
  return (
    <section className={`site-container ${styles.section}`}>
      <div className="grid gap-6 rounded-dc-card border border-dc-line bg-white p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className={headingClass}>Planın nasıl ilerlediğini birlikte gör.</h2>
          <p className={bodyClass}>
            Planın ne kadarını uyguladığın kadar, nerede zorlandığın da takip edilir.
            Koçunla bu bilgileri değerlendirir, sonraki haftanın planını ihtiyaçlarına göre güncellersin.
          </p>
        </div>
        <div className="lg:border-l lg:border-dc-line lg:pl-8">
          <h3 className="text-[18px] font-bold text-dc-ink">Gerektiğinde veliye uygun bir özet.</h3>
          <p className="mt-3 text-[15px] leading-[1.65] text-dc-ink-muted">
            Veliyle planın uygulanma durumu ve gelişim özeti paylaşılabilir. Öğrencinin ekranı birebir
            yansıtılmaz; takip bilgileri uygun bir özet olarak sunulur.
          </p>
        </div>
      </div>
    </section>
  );
}

export function YonPrice() {
  const price = singleProductPriceLabel("kocum");
  return (
    <section className={`site-container grid gap-8 lg:grid-cols-[1.1fr_1fr] ${styles.section}`}>
      <div>
        <p className={styles.eyebrow}>Fiyat ve başlangıç</p>
        <h2 className={`mt-3 ${headingClass}`}>Koçluk desteğini birlikte planlayalım.</h2>
        <p className={bodyClass}>
          Tek başına koçluk desteğini veya ders ve denemeyle birlikte kullanımı değerlendirebilirsin.
          Güncel birlikte alım avantajını paket sayfasında gör.
        </p>
        <Link href="/paketler" className="mt-4 inline-flex min-h-11 items-center text-[15px] font-bold text-dc-brand-strong">Paketleri karşılaştır →</Link>
      </div>
      <div className={`rounded-dc-card p-6 sm:p-8 ${styles.surface}`}>
        <h3 className="text-[18px] font-bold text-dc-ink">{yonBrand.shortName}</h3>
        {price ? (
          <div className="mt-3">
            {price.listPrice ? <span className="text-[14px] text-dc-ink-muted line-through">{price.listPrice}</span> : null}
            <p className="flex flex-wrap items-baseline gap-2"><span className={`font-display text-[40px] tracking-tight ${styles.title}`}>{price.price}</span><span className="text-[14px] text-dc-ink-muted">/ ay</span></p>
          </div>
        ) : <p className="mt-3 text-[15px] font-semibold text-dc-ink">Fiyat ön görüşmede netleşir</p>}
        <ul className="mt-5 space-y-2 text-[15px] leading-[1.6] text-dc-ink-body">
          <li>Kişisel haftalık çalışma planı</li><li>Birebir insan koç görüşmesi</li><li>Tüm dersleri kapsayan uygulama takibi</li>
        </ul>
        <p className="mt-5 border-t border-dc-brand-soft-line pt-5 text-[14px] leading-[1.65] text-dc-ink-muted">{yonBrand.registrationNote}</p>
        <PreMeetingLink href={yonBrand.meetingHref} source="product_hero" className={`site-btn mt-5 w-full ${styles.primary}`} />
      </div>
    </section>
  );
}

export function YonClosing() {
  return (
    <section className={`site-container pb-(--dc-section-tight) ${styles.section}`}>
      <div className={`flex flex-col items-start justify-between gap-7 rounded-dc-banner p-7 sm:p-12 lg:flex-row lg:items-center ${styles.closing}`}>
        <div><h2 className="font-display text-[30px] leading-tight sm:text-[36px]">Haftana bir yön ver.</h2><p className="mt-3 max-w-[550px] text-[16px] leading-[1.65]">Hedefini, mevcut düzenini ve ihtiyacın olan desteği birlikte değerlendirelim.</p></div>
        <PreMeetingLink href={yonBrand.meetingHref} source="product_hero" className={`site-btn flex-none ${styles.primary}`} />
      </div>
    </section>
  );
}
