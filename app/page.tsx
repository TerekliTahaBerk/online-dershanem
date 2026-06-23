import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
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
  "En fazla 4 öğrenci",
  "Canlı matematik dersi",
  "Derste soru-cevap",
  "Hesabı ekibimiz hazırlar",
];

const problems = [
  "Çocuk çalışıyor ama hangi adımda koptuğunu tarif edemiyor.",
  "Kalabalık derste soru sormadan oturumu kapatabiliyor.",
  "Veli sonuç görüyor, fakat nedenini anlayacak sade bir özet alamıyor.",
  "Ders bitince öğrencinin önünde net bir çalışma yönü kalmıyor.",
];

const systemSteps = [
  "Öğrencinin seviyesini ve sınav hedefini dinleriz.",
  "Benzer tempodaki küçük gruba yerleştiririz.",
  "Canlı derste çözümü öğrencinin sesiyle kurarız.",
  "Ders sonunda ne çalışacağını kısa ve net bırakırız.",
];

const lessonHighlights = [
  "Öğretmen öğrenciyi adıyla ve çözüm tarzıyla tanır.",
  "Soru sormak dersin doğal parçasıdır.",
  "Öğrenci çözümünü gösterir, hatasını derste görür.",
  "Veli, haftanın matematik resmini sade şekilde alır.",
];

const checkoutSteps = [
  "Paketi seç",
  "Sepete ekle",
  "Ödemeyi tamamla",
  "Ekibimiz öğrenci hesabını hazırlar",
];

const confidenceQuestions = [
  {
    q: "Öğrenci kaç kişilik grupta olacak?",
    a: "Matematik dersleri en fazla 4 öğrencilik küçük gruplarla ilerler.",
  },
  {
    q: "Dersler nasıl işlenecek?",
    a: "Canlı derste konu anlatımı, birlikte soru çözümü ve öğrencinin takıldığı noktaya geri dönüş aynı oturumda yapılır.",
  },
  {
    q: "Ödeme sonrası ne olacak?",
    a: "Satın alma tamamlandıktan sonra ekibimiz sizinle iletişime geçer, öğrenci hesabını hazırlar ve giriş bilgilerini paylaşır.",
  },
  {
    q: "Ders başlamadan önce görüşebilir miyiz?",
    a: "Evet. Kararsızsanız öğrencinin sınıfı, hedefi ve derste nerede zorlandığını önce birlikte değerlendirebiliriz.",
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
        <section className="relative overflow-hidden border-b border-[var(--od-line)] bg-[linear-gradient(180deg,#FBFAF6_0%,#F4F0E8_100%)]">
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-24 sm:pb-20 sm:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-[42px] font-black leading-[1.02] tracking-normal text-[var(--od-ink)] sm:text-[68px] lg:text-[78px]">
                Matematikte nerede koptuğunu bulup derste geri bağlıyoruz.
              </h1>
              <p className="mt-7 max-w-2xl text-[17px] leading-8 text-[var(--od-ink-soft)] sm:text-[19px]">
                En fazla dört öğrencilik canlı matematik derslerinde öğrenci
                çözümünü gösterir, sorusunu sorar ve ders sonunda bir sonraki
                adımını bilir. Veliye de sonucu değil, nedeni anlatan sade bir
                özet gider.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <PurchaseFunnelTrigger
                  source="home_hero_primary"
                  packageName={lessonPkg.name}
                  category={lessonPkg.category}
                  subject={lessonPkg.subject}
                  priceLabel={lessonPkg.discountedPrice}
                  paymentLink=""
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--od-olive)] px-6 py-3 text-[15px] font-bold text-white transition hover:bg-[#2E3B24]"
                >
                  Ders Paketini İncele
                  <ArrowRight size={17} />
                </PurchaseFunnelTrigger>
                <Link
                  href="/iletisim/"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--od-ink)]/15 bg-white/90 px-6 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
                >
                  Ön Görüşme Talep Et
                  <MessageCircle size={17} />
                </Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {trustPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3 border-t border-[var(--od-line)] pt-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--od-olive)]" />
                    <span className="text-[14px] font-semibold leading-6 text-[var(--od-ink)]">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--od-line)] bg-white/92 p-5 shadow-[0_24px_60px_-42px_rgba(20,20,15,0.32)]">
              <div className="flex items-center justify-between border-b border-[var(--od-line)] pb-4">
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--od-olive)]">
                    Canlı Ders Sonrası
                  </div>
                  <div className="mt-1 text-[18px] font-extrabold text-[var(--od-ink)]">
                    Haftanın çalışma yönü
                  </div>
                </div>
                <ClipboardCheck className="h-7 w-7 text-[var(--od-olive)]" />
              </div>
              <div className="mt-5 rounded-2xl border border-[var(--od-line)] bg-[var(--od-sky-soft)] p-5 font-mono text-[13px] leading-7 text-[var(--od-ink)]">
                <div className="text-[var(--od-olive)]">f(x) = 3x^2 - 12x + 7</div>
                <div>f&apos;(x) = 6x - 12</div>
                <div>6x - 12 = 0 =&gt; x = 2</div>
                <div className="mt-4 border-t border-white/70 pt-4 text-[var(--od-ink-soft)]">
                  Bu hafta: Parabol yorumu, türevle ekstremum, 18 hedef soru,
                  cuma kısa kontrol.
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {["Seviye", "Katılım", "Ödev", "Veli özeti"].map((label, index) => (
                  <div key={label} className="rounded-2xl border border-[var(--od-line)] bg-[var(--od-cream)] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--od-ink-soft)]">
                      {label}
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white">
                      <div
                        className="h-2 rounded-full bg-[var(--od-olive-soft)]"
                        style={{ width: `${[68, 82, 74, 90][index]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                Matematikte mesele çoğu zaman çalışmamak değil, nerede koptuğunu görememektir.
              </h2>
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
                Dersi anlatıp bırakmıyoruz; öğrencinin çözümünü derste görünür kılıyoruz.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Ders öncesi seviye, ders içi katılım, ders sonrası ödev ve veli
                özeti aynı akışta ilerler.
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

        <section className="border-b border-[var(--od-line)] bg-[var(--od-sky-soft)] text-[var(--od-ink)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[54px]">
                Kalabalık online sınıf değil, öğrencinin sesinin duyulduğu küçük grup.
              </h2>
              <p className="mt-5 max-w-2xl text-[17px] leading-8 text-[var(--od-ink-soft)]">
                En fazla 4 öğrencilik canlı matematik dersinde öğrenci pasif
                dinleyiciye dönüşmez. Öğretmen çözümü izler, soruyu derste ele
                alır ve ders sonrası çalışma yönünü netleştirir.
              </p>
            </div>
            <div className="grid gap-3">
              {lessonHighlights.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[18px] border border-white/70 bg-white/75 p-4">
                  <CheckCircle2 className="h-5 w-5 text-[var(--od-olive)]" />
                  <span className="text-[16px] font-semibold">{item}</span>
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
                    En fazla dört öğrenci. Aynı öğretmen, aynı tempo, ders sonrası net çalışma yönü.
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
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {lessonPkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--od-olive)]" />
                    <span className="text-[15px] font-semibold leading-6 text-[var(--od-ink)]">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <PurchaseFunnelTrigger
                  source="home_package_primary"
                  packageName={lessonPkg.name}
                  category={lessonPkg.category}
                  subject={lessonPkg.subject}
                  priceLabel={lessonPkg.discountedPrice}
                  paymentLink=""
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--od-olive)] px-6 py-3 text-[15px] font-bold text-white transition hover:bg-[#2E3B24]"
                >
                  Satın Al
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
              <ShieldCheck className="h-9 w-9 text-[var(--od-olive)]" />
              <h2 className="mt-5 text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                Satın almak için önce hesap açmanız gerekmez.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Matematik ders paketini sepete ekler, bilgilerinizi girer ve
                ödemeyi güvenle tamamlarsınız. Ödeme sonrası ekibimiz sizinle
                iletişime geçerek öğrenci hesabını hazırlar ve giriş bilgisini paylaşır.
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
              Velinin aklındaki soruları en baştan sadeleştiriyoruz.
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

        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:py-24 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                Kararsızsanız önce konuşalım.
              </h2>
              <p className="mt-4 max-w-2xl text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Öğrencinin sınıfı, hedefi ve matematikte nerede zorlandığını
                birlikte değerlendirelim.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--od-olive)] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#2E3B24]"
              >
                Ön Görüşme Talep Et
              </Link>
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
              >
                WhatsApp&apos;tan Yazın
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[var(--od-blush)]/65">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="max-w-3xl text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
              Matematikte daha anlaşılır, daha insani bir çalışma yolu açalım.
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <PurchaseFunnelTrigger
                source="home_final_primary"
                packageName={lessonPkg.name}
                category={lessonPkg.category}
                subject={lessonPkg.subject}
                priceLabel={lessonPkg.discountedPrice}
                paymentLink=""
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--od-olive)] px-6 py-3 text-[15px] font-bold text-white transition hover:bg-[#2E3B24]"
              >
                Ders Paketini İncele
                <ArrowRight size={17} />
              </PurchaseFunnelTrigger>
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
              >
                Ön Görüşme Talep Et
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
