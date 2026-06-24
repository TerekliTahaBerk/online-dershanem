import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
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
              <PurchaseFunnelTrigger
                source="home_hero_primary"
                packageName={lessonPkg.name}
                category={lessonPkg.category}
                subject={lessonPkg.subject}
                priceLabel={lessonPkg.discountedPrice}
                paymentLink=""
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--od-olive)] px-7 py-3 text-[15px] font-bold text-white transition hover:bg-[#2E3B24]"
              >
                Matematik Dersini Satın Al
                <ArrowRight size={17} />
              </PurchaseFunnelTrigger>
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--od-ink)]/15 bg-white/90 px-7 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
              >
                Önce Bizimle Görüşün
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
