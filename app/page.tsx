import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { TeachersSection } from "@/components/sections/teachers-section";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { contact, faq, siteUrl, subjectPackageGroups } from "@/lib/content";

const lessonPkg = subjectPackageGroups[0].packages.find(
  (p) => p.subject === "Ders Paketi",
)!;

const cartItem = {
  id: `${lessonPkg.category}__${lessonPkg.subject}`,
  name: lessonPkg.name,
  category: lessonPkg.category,
  subject: lessonPkg.subject,
  priceCents: lessonPkg.priceCents,
  priceLabel: lessonPkg.discountedPrice,
};

export const metadata: Metadata = {
  title: "Online Matematik Dersi | Online Dershanem",
  description:
    "En fazla 4 öğrencilik canlı matematik dersleriyle öğrenciniz derste görünür olur, soru sorar ve ders sonrası ne çalışacağını bilir.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Online Matematik Dersi | Online Dershanem",
    description:
      "En fazla 4 öğrencilik canlı matematik dersi, ders içi soru-cevap ve veliye sade gelişim özeti.",
    url: `${siteUrl}/`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Matematik Dersi | Online Dershanem",
    description:
      "En fazla 4 öğrencilik canlı matematik dersiyle öğrenciniz derste görünür olur.",
  },
};

const trustPoints = [
  "En fazla 4 kişilik grup",
  "Canlı matematik dersi",
  "Ders sonrası takip",
  "Hesabı ekibimiz hazırlar",
];

const problems = [
  "Kalabalık sınıfta öğrenci kolayca sessizleşir.",
  "Veli çoğu zaman hangi konunun eksik olduğunu göremez.",
  "Ders biter ama öğrencinin ne çalışacağı netleşmez.",
];

const systemSteps = [
  "Seviyeyi ve hedefi anlarız.",
  "Uygun küçük gruba yerleştiririz.",
  "Canlı derste eksikleri işleriz.",
  "Ders sonrası çalışma yönünü netleştiririz.",
];

const checkoutSteps = [
  "Paketi seç ve sepete ekle",
  "Ödemeyi güvenle tamamla",
  "Ekibimiz sizinle iletişime geçer",
  "Kısa seviye görüşmesi yapılır",
  "Öğrenci uygun gruba yerleşir",
  "İlk canlı matematik dersi",
];

const levelFit = [
  {
    tag: "LGS",
    title: "8. sınıf matematiği",
    body: "Konu eksiklerini kapatma, yeni nesil soru ve süre yönetimi; sınav temposuna birlikte alışma.",
  },
  {
    tag: "TYT",
    title: "Temel matematik",
    body: "TYT matematik ve temel konularda hız ile doğruluk; düzenli deneme analiziyle net artışı.",
  },
  {
    tag: "AYT",
    title: "İleri matematik",
    body: "AYT matematik konularında derinleşme, soru tipi tanıma ve çözüm stratejisi.",
  },
];

const trustSignals = [
  {
    title: "Google Meet'te canlı ders",
    body: "Kayıt video değil; gerçek zamanlı ders. Öğrenci soru sorar, çözümünü gösterir.",
  },
  {
    title: "PayTR ile güvenli ödeme",
    body: "256-bit SSL korumalı ödeme. Kart bilgileriniz bizimle paylaşılmaz.",
  },
  {
    title: "En fazla 4 öğrenci",
    body: "Grup mevcudu net ve sınırlı; kalabalık sınıfta kaybolma yok.",
  },
  {
    title: "Ödeme sonrası net süreç",
    body: "Hesabı ekibimiz hazırlar, giriş bilgilerini sizinle paylaşır.",
  },
];

const confidenceQuestions = [
  {
    q: "Dersler kaç kişilik?",
    a: "Matematik dersleri en fazla 4 öğrencilik küçük gruplarla ilerler; öğretmen her öğrenciyi adıyla tanır.",
  },
  {
    q: "Öğrenci derste soru sorabiliyor mu?",
    a: "Evet. Soru sormak dersin doğal parçasıdır. Öğrenci çözümünü gösterir, takıldığı yeri aynı derste birlikte açarız.",
  },
  {
    q: "Ödeme sonrası ne olacak?",
    a: "Ödeme tamamlandıktan sonra ekibimiz sizinle iletişime geçer, öğrenci hesabını hazırlar ve giriş bilgilerini paylaşır.",
  },
  {
    q: "Hesap bilgileri nasıl verilecek?",
    a: "Giriş bilgilerini ekibimiz hazırlayıp size iletir. Satın almak için önceden hesap oluşturmanız gerekmez.",
  },
  {
    q: "Ders başlamadan önce görüşebilir miyiz?",
    a: "Evet. Öğrencinin sınıfını, hedefini ve matematikte nerede zorlandığını başlamadan önce birlikte değerlendirebiliriz.",
  },
  {
    q: "Çocuğum matematikte çok gerideyse uygun mu?",
    a: "Uygundur. Önce eksiğin nerede başladığını görürüz ve dersi tam o noktadan kurarız; tempo öğrenciye göre ayarlanır.",
  },
];

const comparison = {
  columns: ["Birebir özel ders", "Klasik online dershane", "Online Dershanem"],
  rows: [
    {
      label: "Grup mevcudu",
      values: ["1 öğrenci", "Kalabalık sınıf (20+)", "En fazla 4 öğrenci"],
    },
    {
      label: "Aylık maliyet",
      values: ["Yüksek", "Düşük", "₺3.000 / ay"],
    },
    {
      label: "Derste soru sorma",
      values: ["Her an", "Sınırlı", "Rahatça, sırası gelir"],
    },
    {
      label: "Ders sonrası takip",
      values: ["Öğretmene göre değişir", "Genelde yok", "Her ders sonu net çalışma yönü"],
    },
    {
      label: "Veli bilgilendirme",
      values: ["Sözlü, düzensiz", "Sınırlı", "Sade gelişim özeti"],
    },
    {
      label: "Seviyeye göre grup",
      values: ["—", "Genelde yok", "Benzer seviye ve hedefe göre"],
    },
  ],
};

const suitableFor = [
  "Derste soru sorup çözümünü göstermek isteyen öğrenciler",
  "Kalabalık sınıfta sessizleşen, geri planda kalan öğrenciler",
  "Eksiğinin nerede başladığını görmek isteyen öğrenciler",
  "LGS, TYT veya AYT matematiğinde düzenli takip arayan veliler",
];

const notSuitableFor = [
  "Tek seferlik, sınav öncesi “hap” çözüm bekleyenler",
  "Hiç canlı derse katılmadan yalnızca kayıt video isteyenler",
  "Matematik dışında çoklu branş desteği arayanlar",
  "Tamamen kişiye özel birebir program bekleyenler",
];

const sampleReport = {
  student: "8. sınıf öğrencisi",
  date: "Hafta 3 · Matematik",
  fields: [
    {
      label: "Bu derste işlenen konu",
      value: "Üslü sayılar — çarpma ve bölme kuralları",
    },
    {
      label: "Öğrencinin zorlandığı yer",
      value: "Negatif üslerde işaret hatası; kuralı uygularken acele ediyor.",
    },
    {
      label: "Bu hafta ödevi",
      value: "Karışık 20 soruluk set + 2 yeni nesil problem",
    },
    {
      label: "Sonraki ders hedefi",
      value: "Köklü sayılara geçiş; üslü–köklü ilişkisini kurmak",
    },
  ],
};

export default function HomePage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Online Dershanem",
    description:
      "En fazla 4 öğrencilik canlı matematik dersleriyle öğrencinin derste görünür olduğu online matematik dershanesi.",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: contact.phone,
      contactType: "customer support",
      areaServed: "TR",
    },
  };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: lessonPkg.name,
    description:
      "En fazla 4 öğrencilik canlı matematik dersi, ders içi soru-cevap, ders sonrası ödevlendirme ve veliye sade gelişim özeti.",
    brand: { "@type": "Brand", name: "Online Dershanem" },
    offers: {
      "@type": "Offer",
      price: (lessonPkg.priceCents / 100).toFixed(2),
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/`,
    },
  };

  return (
    <>
      <SchemaJsonLd schema={[faqJsonLd, orgJsonLd, productJsonLd]} />
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="relative overflow-hidden border-b border-[var(--od-line)] bg-[linear-gradient(180deg,#FFFFFE_0%,#F5F3EC_100%)]">
          <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-24 text-center sm:pb-24 sm:pt-32">
            <h1 className="mx-auto max-w-4xl text-[40px] font-black leading-[1.04] tracking-tight text-[var(--od-ink)] sm:text-[64px] lg:text-[72px]">
              Çocuğunuz matematikte nerede takıldığını bilsin; biz tam oradan başlayalım.
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-[17px] leading-8 text-[var(--od-ink-soft)] sm:text-[19px]">
              Maksimum 4 kişilik canlı matematik dersleriyle öğrencinin
              eksiklerini takip eder, ders sonrası ne çalışacağını netleştirir ve
              veliyi süreçten haberdar ederiz.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/matematik-ders-paketi/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--od-olive)] px-7 py-3 text-[15px] font-bold text-white transition hover:bg-[#2E3B24]"
              >
                Matematik Ders Paketini İncele
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--od-ink)]/15 bg-white/90 px-7 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
              >
                Ön Görüşme Talep Et
              </Link>
            </div>
            <p className="mx-auto mt-4 max-w-xl text-[13.5px] leading-6 text-[var(--od-ink-soft)]">
              Satın almak için hesap oluşturmanız gerekmez. Ödeme sonrası
              ekibimiz öğrenci hesabınızı hazırlar.
            </p>
            <div className="mx-auto mt-12 grid max-w-3xl gap-x-8 gap-y-5 border-t border-[var(--od-line)] pt-8 sm:grid-cols-2 lg:grid-cols-4">
              {trustPoints.map((point) => (
                <div key={point} className="text-center sm:text-left">
                  <span className="text-[14px] font-semibold leading-6 text-[var(--od-ink)]">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                Matematikte sorun çoğu zaman çalışmamak değil, nerede takıldığını görememektir.
              </h2>
              <p className="mt-6 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Öğrenci soru çözer, video izler, defter doldurur; ama aynı konu
                tekrar karşısına çıktığında yine duraksar. Biz önce o duraksamanın
                nedenini görünür hale getiririz.
              </p>
            </div>
            <div className="space-y-3">
              {problems.map((item, index) => (
                <div key={item} className="grid grid-cols-[44px_1fr] items-start border-t border-[var(--od-line)] py-5">
                  <span className="text-[15px] font-extrabold text-[var(--od-olive)]">0{index + 1}</span>
                  <p className="text-[18px] font-semibold leading-7 text-[var(--od-ink)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-[var(--od-cream)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <div className="max-w-3xl">
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[54px]">
                Dersi anlatıp bırakmıyoruz; öğrencinin matematik yolunu takip ediyoruz.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Küçük grup dersi, öğretmen gözlemi ve ders sonrası yönlendirme aynı
                planın içinde ilerler.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {systemSteps.map((step, index) => (
                <div key={step} className="min-h-[190px] rounded-[22px] border border-[var(--od-line)] bg-white p-5">
                  <div className="text-[30px] font-black text-[var(--od-olive)]">0{index + 1}</div>
                  <p className="mt-8 text-[17px] font-bold leading-7 text-[var(--od-ink)]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-[var(--od-cream)]">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
            <h2 className="text-[32px] font-black leading-[1.08] tracking-normal text-[var(--od-ink)] sm:text-[48px]">
              Ders bittiğinde öğrencinin ne çalışacağını bilmesini isteriz.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-[var(--od-ink-soft)] sm:text-[18px]">
              Her dersin sonunda konu, ödev ve tekrar yönü sade şekilde netleşir.
              Öğrenci yalnız kalmaz; veli de sürecin nereye gittiğini daha kolay
              takip eder.
            </p>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                Veli, sonuç değil; çocuğunun nerede olduğunu görür.
              </h2>
              <p className="mt-6 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Karne ya da çıplak net yerine sade bir gelişim özeti paylaşırız:
                hangi konu çalışıldı, öğrenci nerede zorlandı, bu hafta ne
                yapacak ve sıradaki hedef ne. Aşağıdaki örnek temsilîdir.
              </p>
            </div>
            <figure className="overflow-hidden rounded-[24px] border border-[var(--od-line)] bg-white shadow-[0_30px_70px_-44px_rgba(20,20,15,0.34)]">
              {/* Pencere başlık çubuğu — ürün ekranı hissi */}
              <div className="flex items-center gap-2 border-b border-[var(--od-line)] bg-[var(--od-cream-2)] px-5 py-3">
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E0DCCB]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E0DCCB]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E0DCCB]" />
                </span>
                <span className="ml-1 text-[12px] font-semibold text-[var(--od-ink-soft)]">
                  Veli Paneli
                </span>
              </div>
              <div className="p-6 sm:p-7">
                <figcaption className="flex items-start justify-between gap-3">
                  <div>
                    <span className="block text-[17px] font-extrabold text-[var(--od-ink)]">
                      Ders Sonrası Veli Özeti
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-[var(--od-ink-soft)]">
                      {sampleReport.student} · {sampleReport.date}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--od-olive)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--od-olive)]">
                    Örnek / Temsilî
                  </span>
                </figcaption>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  {sampleReport.fields.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-[16px] border border-[var(--od-line)] bg-[var(--od-cream)] p-4"
                    >
                      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#8B8B7E]">
                        {row.label}
                      </dt>
                      <dd className="mt-1.5 text-[14px] leading-6 text-[var(--od-ink)]">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 border-t border-[var(--od-line)] pt-4 text-[12.5px] leading-6 text-[var(--od-ink-soft)]">
                  Bu özet, velinin çocuğunun matematikte nerede olduğunu takip
                  edebilmesi için sadeleştirilmiştir.
                </p>
              </div>
            </figure>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-[var(--od-cream)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <div className="max-w-3xl">
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                Bu model kimler için uygun, kimler için değil?
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Dürüst olmak en doğrusu: küçük grupta canlı matematik takibi her
                öğrenci için doğru tercih olmayabilir. İşte net çerçeve.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[var(--od-line)] bg-white p-7">
                <h3 className="text-[18px] font-extrabold text-[var(--od-ink)]">Uygun</h3>
                <ul className="mt-5 space-y-2.5 text-[14.5px] text-[var(--od-ink)]">
                  {suitableFor.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-[var(--od-olive)]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[22px] border border-[var(--od-line)] bg-white p-7">
                <h3 className="text-[18px] font-extrabold text-[var(--od-ink)]">Şimdilik uygun değil</h3>
                <ul className="mt-5 space-y-2.5 text-[14.5px] text-[var(--od-ink-soft)]">
                  {notSuitableFor.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <X size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-[#B0392F]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <div className="max-w-3xl">
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                LGS, TYT ve AYT matematiği — öğrencinin seviyesine göre.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Önce kısa bir değerlendirmeyle öğrencinin nerede olduğunu görür,
                dersi tam o seviyeden kurarız. Aynı grupta benzer seviye ve
                hedefteki öğrenciler bir arada ilerler.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {levelFit.map((lvl) => (
                <div
                  key={lvl.tag}
                  className="rounded-[22px] border border-[var(--od-line)] bg-[var(--od-cream)] p-6"
                >
                  <div className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[var(--od-olive)]">
                    {lvl.tag}
                  </div>
                  <h3 className="mt-3 text-[19px] font-bold leading-tight text-[var(--od-ink)]">
                    {lvl.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
                    {lvl.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-[var(--od-cream)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <div className="max-w-3xl">
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                Özel ders kadar yakın, online dershane kadar erişilebilir.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Birebir özel dersin maliyeti ile kalabalık online sınıfın
                mesafesi arasında butik bir orta yol. Üç modeli aynı ölçütlerle
                karşılaştırın.
              </p>
            </div>

            {/* Semantik tablo — ekran okuyucu için tek kaynak (mobilde sr-only,
                desktop'ta görünür). Mobil kart versiyonu aria-hidden. */}
            <div className="mt-10 overflow-hidden rounded-[22px] border border-[var(--od-line)] bg-white sr-only md:not-sr-only md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Birebir özel ders, klasik online dershane ve Online Dershanem
                  karşılaştırması
                </caption>
                <thead>
                  <tr className="border-b border-[var(--od-line)]">
                    <th scope="col" className="px-5 py-4 text-[13px] font-semibold text-[var(--od-ink-soft)]">
                      Ölçüt
                    </th>
                    {comparison.columns.map((col, i) => (
                      <th
                        key={col}
                        scope="col"
                        className={`px-5 py-4 text-[14px] font-extrabold ${
                          i === comparison.columns.length - 1
                            ? "bg-[var(--od-olive)] text-white"
                            : "text-[var(--od-ink)]"
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.label} className="border-b border-[var(--od-line)] last:border-b-0">
                      <th scope="row" className="px-5 py-4 text-[14px] font-semibold text-[var(--od-ink)]">
                        {row.label}
                      </th>
                      {row.values.map((val, i) => (
                        <td
                          key={comparison.columns[i]}
                          className={`px-5 py-4 text-[14px] leading-6 ${
                            i === row.values.length - 1
                              ? "bg-[var(--od-olive)]/[0.06] font-semibold text-[var(--od-ink)]"
                              : "text-[var(--od-ink-soft)]"
                          }`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobil: kart layout — görsel; AT için tablo okunur (aria-hidden) */}
            <div className="mt-8 grid gap-3 md:hidden" aria-hidden="true">
              {comparison.rows.map((row) => (
                <div key={row.label} className="rounded-[18px] border border-[var(--od-line)] bg-white p-4">
                  <div className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--od-olive)]">
                    {row.label}
                  </div>
                  <dl className="mt-3 space-y-1.5">
                    {row.values.map((val, i) => (
                      <div
                        key={comparison.columns[i]}
                        className={`flex items-start justify-between gap-4 rounded-lg px-2.5 py-1.5 ${
                          i === row.values.length - 1 ? "bg-[var(--od-olive)]/[0.07]" : ""
                        }`}
                      >
                        <dt className="text-[12.5px] text-[var(--od-ink-soft)]">{comparison.columns[i]}</dt>
                        <dd
                          className={`text-right text-[13px] ${
                            i === row.values.length - 1
                              ? "font-bold text-[var(--od-ink)]"
                              : "font-medium text-[var(--od-ink)]"
                          }`}
                        >
                          {val}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="matematik-ders-paketi" className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[54px]">
                Tek ürün: Matematik Ders Paketi.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Diğer branş ve ek ürünler bu public satış akışında yer almıyor.
                Odak küçük grupta canlı matematik dersi.
              </p>
            </div>
            <article className="rounded-[24px] border border-[var(--od-line)] bg-[var(--od-cream)] p-6 shadow-[0_24px_60px_-46px_rgba(20,20,15,0.28)] sm:p-8">
              <div className="flex flex-col gap-5 border-b border-[var(--od-line)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-[30px] font-black leading-tight text-[var(--od-ink)]">
                    {lessonPkg.name}
                  </h3>
                  <p className="mt-2 text-[15px] leading-7 text-[var(--od-ink-soft)]">
                    Canlı matematik dersi, maksimum 4 kişilik butik grup ve ders
                    sonrası takip tek pakette.
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  {lessonPkg.oldPrice ? (
                    <div className="text-[15px] font-semibold text-[var(--od-ink-soft)] line-through">
                      {lessonPkg.oldPrice}
                    </div>
                  ) : null}
                  <div className="text-[40px] font-black leading-none text-[var(--od-ink)]">
                    {lessonPkg.discountedPrice}
                  </div>
                </div>
              </div>
              <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {lessonPkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 border-t border-[var(--od-line)] pt-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--od-olive)]" />
                    <span className="text-[15px] font-semibold leading-6 text-[var(--od-ink)]">{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-[var(--od-line)] pt-5 text-[13px] leading-6 text-[var(--od-ink-soft)]">
                Kalabalık online sınıf ile birebir özel ders arasında butik bir
                orta yol: aylık sabit <strong className="font-semibold text-[var(--od-ink)]">₺3.000</strong>,
                en fazla 4 kişilik grupta düzenli canlı matematik dersi ve ders
                sonrası takip.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <PurchaseFunnelTrigger
                  source="home_package_primary"
                  packageName={lessonPkg.name}
                  category={lessonPkg.category}
                  subject={lessonPkg.subject}
                  priceLabel={lessonPkg.discountedPrice}
                  paymentLink=""
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--od-olive)] px-6 py-3 text-[15px] font-bold text-white transition hover:bg-[#2E3B24]"
                >
                  Matematik Dersini Satın Al
                  <ArrowRight size={17} />
                </PurchaseFunnelTrigger>
                <AddToCartButton
                  item={cartItem}
                  analyticsSource="home_package_add_to_cart"
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40 data-[justadded=1]:border-emerald-300 data-[justadded=1]:bg-emerald-50 data-[justadded=1]:text-emerald-800"
                />
              </div>
            </article>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                Ödemeden ilk derse, adım adım.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Satın almak için hesap oluşturmanıza gerek yok. Paketi seçer,
                ödemenizi güvenle tamamlarsınız; ardından ekibimiz sizinle
                iletişime geçer, öğrenciyi doğru gruba yerleştirir ve ilk canlı
                dersi birlikte planlarız.
              </p>
            </div>
            <div className="grid gap-3">
              {checkoutSteps.map((step, index) => (
                <div key={step} className="grid grid-cols-[52px_1fr] items-center rounded-[18px] border border-[var(--od-line)] bg-white p-4">
                  <span className="text-[18px] font-black text-[var(--od-olive)]">0{index + 1}</span>
                  <span className="text-[17px] font-bold text-[var(--od-ink)]">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <h2 className="max-w-3xl text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
              Velilerin karar vermeden önce bilmek istediği şeyler.
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {confidenceQuestions.map((item) => (
                <div key={item.q} className="rounded-[20px] border border-[var(--od-line)] bg-[var(--od-cream)] p-5">
                  <h3 className="text-[18px] font-extrabold text-[var(--od-ink)]">{item.q}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-[var(--od-ink-soft)]">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-[var(--od-cream)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <h2 className="max-w-3xl text-[34px] font-black leading-[1.05] tracking-normal sm:text-[48px]">
              Velinin güvenle başlaması için.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trustSignals.map((s) => (
                <div
                  key={s.title}
                  className="rounded-[20px] border border-[var(--od-line)] bg-white p-5"
                >
                  <h3 className="text-[16px] font-extrabold text-[var(--od-ink)]">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-7 text-[var(--od-ink-soft)]">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <TeachersSection />

        <section className="bg-[var(--od-yellow-soft)]">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
            <h2 className="text-[32px] font-black leading-[1.06] tracking-normal text-[var(--od-ink)] sm:text-[52px]">
              Kararsızsanız önce konuşalım.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-8 text-[var(--od-ink-soft)]">
              Öğrencinin sınıfını, hedefini ve matematikte zorlandığı konuları
              birlikte değerlendirelim. Size en doğru yönlendirmeyi yapalım.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--od-olive)] px-7 py-3 text-[15px] font-bold text-white transition hover:bg-[#2E3B24]"
              >
                İletişime Geç
              </Link>
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--od-ink)]/20 bg-white px-7 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
              >
                WhatsApp&apos;tan Yazın
              </a>
              <PurchaseFunnelTrigger
                source="home_final_primary"
                packageName={lessonPkg.name}
                category={lessonPkg.category}
                subject={lessonPkg.subject}
                priceLabel={lessonPkg.discountedPrice}
                paymentLink=""
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--od-ink)]/20 bg-white px-7 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
              >
                Matematik Dersini Satın Al
                <ArrowRight size={16} />
              </PurchaseFunnelTrigger>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
