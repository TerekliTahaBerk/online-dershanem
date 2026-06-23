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
    "Maksimum 4 kişilik canlı matematik dersleriyle öğrencinizin eksiklerini takip edin. Online Dershanem'de ödeme sonrası hesabınız ekibimiz tarafından hazırlanır.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Online Matematik Dersi | Online Dershanem",
    description:
      "Maksimum 4 kişilik canlı matematik dersleriyle öğrencinizin eksiklerini takip edin. Ödeme sonrası hesabınız ekibimiz tarafından hazırlanır.",
    url: `${siteUrl}/`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Matematik Dersi | Online Dershanem",
    description:
      "Maksimum 4 kişilik canlı matematik dersleriyle öğrencinizin eksiklerini takip edin.",
  },
};

const trustPoints = [
  "Maksimum 4 kişilik grup",
  "Canlı matematik dersi",
  "Ders sonrası takip",
  "Ödeme sonrası hesabı ekibimiz hazırlar",
];

const problems = [
  "Çocuk soru çözüyor ama aynı konularda tekrar takılıyor.",
  "Kalabalık sınıfta derse katılıp katılmadığı görünmüyor.",
  "Veli hangi konunun eksik kaldığını net anlayamıyor.",
  "Online dersler çoğu zaman ders sonrası takip vermiyor.",
];

const systemSteps = [
  "Öğrencinin seviyesini ve hedefini anlarız.",
  "Uygun küçük gruba yerleştiririz.",
  "Canlı matematik dersleriyle eksikleri işleriz.",
  "Ders sonrası takip ve yönlendirme yaparız.",
];

const lessonHighlights = [
  "Öğretmen öğrenciyi adıyla tanır.",
  "Soru sorma alanı vardır.",
  "Derste pasif kalma azalır.",
  "Ders sonrası ne çalışacağı netleşir.",
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
    a: "Matematik dersleri maksimum 4 kişilik küçük gruplarla ilerler.",
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
    a: "Evet. Kararsızsanız öğrencinin sınıfı, hedefi ve zorlandığı konuları önce birlikte değerlendirebiliriz.",
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
      "Maksimum 4 kişilik canlı matematik dersleriyle öğrencinin eksiklerini takip eden online matematik dershanesi.",
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
      "Maksimum 4 kişilik canlı matematik dersi, haftalık konu takibi, ders sonrası ödevlendirme ve veli bilgilendirmesi.",
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
        <section className="relative overflow-hidden border-b border-[var(--od-line)]">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(20,20,15,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,15,0.055) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "linear-gradient(180deg, black, transparent 78%)",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-24 sm:pb-20 sm:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-[44px] font-black leading-[0.96] tracking-normal text-[var(--od-ink)] sm:text-[72px] lg:text-[86px]">
                Matematikte geride kalmasın diye her hafta yanında oluruz.
              </h1>
              <p className="mt-7 max-w-2xl text-[17px] leading-8 text-[var(--od-ink-soft)] sm:text-[19px]">
                Online Dershanem, maksimum 4 kişilik canlı matematik dersleriyle
                öğrencinin eksiklerini takip eder, ders sonrası ne çalışacağını
                netleştirir ve veliyi süreçten haberdar eder.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <PurchaseFunnelTrigger
                  source="home_hero_primary"
                  packageName={lessonPkg.name}
                  category={lessonPkg.category}
                  subject={lessonPkg.subject}
                  priceLabel={lessonPkg.discountedPrice}
                  paymentLink=""
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--od-ink)] px-6 py-3 text-[15px] font-extrabold text-white transition hover:bg-black"
                >
                  Matematik Dersini Satın Al
                  <ArrowRight size={17} />
                </PurchaseFunnelTrigger>
                <Link
                  href="/iletisim/"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[var(--od-ink)]/20 bg-white px-6 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/50"
                >
                  Veli Bilgilendirmesi Al
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

            <div className="rounded-lg border border-[var(--od-ink)] bg-white p-5 shadow-[0_36px_80px_-44px_rgba(20,20,15,0.42)]">
              <div className="flex items-center justify-between border-b border-[var(--od-line)] pb-4">
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--od-olive)]">
                    Haftalık Matematik Takibi
                  </div>
                  <div className="mt-1 text-[18px] font-extrabold text-[var(--od-ink)]">
                    Eksik konu planı
                  </div>
                </div>
                <ClipboardCheck className="h-7 w-7 text-[var(--od-olive)]" />
              </div>
              <div className="mt-5 rounded-md bg-[var(--od-ink)] p-5 font-mono text-[13px] leading-7 text-[#F5F1E7]">
                <div className="text-[#F4D86A]">f(x) = 3x^2 - 12x + 7</div>
                <div>f&apos;(x) = 6x - 12</div>
                <div>6x - 12 = 0 =&gt; x = 2</div>
                <div className="mt-4 border-t border-white/15 pt-4 text-white/72">
                  Bu hafta: Parabolde tepe noktası, türevle ekstremum,
                  18 hedef soru, ders sonrası kontrol.
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {["Seviye", "Katılım", "Ödev", "Veli notu"].map((label, index) => (
                  <div key={label} className="rounded-md border border-[var(--od-line)] bg-[var(--od-cream)] p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--od-ink-soft)]">
                      {label}
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[var(--od-line)]">
                      <div
                        className="h-2 rounded-full bg-[var(--od-olive)]"
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
                Matematikte sorun çoğu zaman çalışmamak değil, nerede takıldığını görememektir.
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

        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <div className="max-w-3xl">
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[54px]">
                Biz matematiği sadece anlatmıyor, öğrenciyi takip ediyoruz.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Ders öncesi seviye, ders içi katılım, ders sonrası ödev ve veli
                bilgilendirmesi aynı akışta ilerler.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {systemSteps.map((step, index) => (
                <div key={step} className="min-h-[190px] rounded-md border border-[var(--od-line)] bg-white p-5">
                  <div className="text-[30px] font-black text-[var(--od-olive)]">0{index + 1}</div>
                  <p className="mt-8 text-[17px] font-bold leading-7 text-[var(--od-ink)]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--od-line)] bg-[var(--od-ink)] text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <h2 className="text-[34px] font-black leading-[1.05] tracking-normal sm:text-[54px]">
                Kalabalık online sınıf değil, öğrencinin göründüğü küçük grup.
              </h2>
              <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/72">
                Maksimum 4 kişilik canlı matematik dersinde öğrenci pasif
                dinleyiciye dönüşmez. Öğretmen katılımı izler, soruyu derste
                çözer ve ders sonrası çalışma yönünü netleştirir.
              </p>
            </div>
            <div className="grid gap-3">
              {lessonHighlights.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-white/14 bg-white/6 p-4">
                  <CheckCircle2 className="h-5 w-5 text-[#F4D86A]" />
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
                Odak yalnızca canlı matematik dersi.
              </p>
            </div>
            <article className="rounded-lg border border-[var(--od-ink)] bg-[var(--od-cream)] p-6 shadow-[0_36px_80px_-44px_rgba(20,20,15,0.36)] sm:p-8">
              <div className="flex flex-col gap-5 border-b border-[var(--od-line)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-[30px] font-black leading-tight text-[var(--od-ink)]">
                    {lessonPkg.name}
                  </h3>
                  <p className="mt-2 text-[15px] leading-7 text-[var(--od-ink-soft)]">
                    Canlı ders, küçük grup, ödevlendirme, öğretmen geri bildirimi ve veli bilgilendirmesi.
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
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-[var(--od-ink)] px-6 py-3 text-[15px] font-extrabold text-white transition hover:bg-black"
                >
                  Matematik Dersini Satın Al
                  <ArrowRight size={17} />
                </PurchaseFunnelTrigger>
                <AddToCartButton
                  item={cartItem}
                  analyticsSource="home_package_add_to_cart"
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--od-ink)]/20 bg-white px-6 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/50 data-[justadded=1]:border-emerald-300 data-[justadded=1]:bg-emerald-50 data-[justadded=1]:text-emerald-800"
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
                Satın almak için hesap oluşturmanız gerekmez.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Matematik ders paketini sepete ekler, bilgilerinizi girer ve
                ödemeyi güvenle tamamlarsınız. Ödeme sonrası ekibimiz sizinle
                iletişime geçerek öğrenci hesabınızı hazırlar ve giriş
                bilgilerinizi paylaşır.
              </p>
            </div>
            <div className="grid gap-3">
              {checkoutSteps.map((step, index) => (
                <div key={step} className="grid grid-cols-[52px_1fr] items-center rounded-md border border-[var(--od-line)] bg-white p-4">
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
              Velinin aklındaki soruları en baştan cevaplıyoruz.
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {confidenceQuestions.map((item) => (
                <div key={item.q} className="rounded-md border border-[var(--od-line)] bg-[var(--od-cream)] p-5">
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
                Öğrencinin sınıfı, hedefi ve matematikte zorlandığı konuları
                birlikte değerlendirelim.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--od-ink)] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-black"
              >
                Veli Bilgilendirmesi Al
              </Link>
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`}
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-[var(--od-ink)]/20 bg-white px-6 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/50"
              >
                WhatsApp&apos;tan Yazın
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[var(--od-yellow-soft)]">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="max-w-3xl text-[34px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
              Matematikte daha görünür, daha takip edilebilir bir yol açalım.
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <PurchaseFunnelTrigger
                source="home_final_primary"
                packageName={lessonPkg.name}
                category={lessonPkg.category}
                subject={lessonPkg.subject}
                priceLabel={lessonPkg.discountedPrice}
                paymentLink=""
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--od-ink)] px-6 py-3 text-[15px] font-extrabold text-white transition hover:bg-black"
              >
                Matematik Dersini Satın Al
                <ArrowRight size={17} />
              </PurchaseFunnelTrigger>
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-[var(--od-ink)]/20 bg-white px-6 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/50"
              >
                Bizimle İletişime Geç
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
