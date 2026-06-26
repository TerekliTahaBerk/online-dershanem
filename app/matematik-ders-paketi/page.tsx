import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { FadeIn } from "@/components/ui/fade-in";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import {
  breadcrumbJsonLd,
  courseJsonLd,
  productJsonLd,
} from "@/lib/seo/jsonld";
import { siteUrl, subjectPackageGroups } from "@/lib/content";

export const metadata: Metadata = {
  title: "Matematik Ders Paketi — Butik Canlı Matematik Dersi",
  description:
    "En fazla 4 öğrencilik grupta canlı matematik dersi, derste soru-cevap, ders sonrası ödevlendirme ve veliye sade gelişim özeti. Aylık ₺3.000.",
  alternates: { canonical: "/matematik-ders-paketi/" },
  openGraph: {
    title: "Matematik Ders Paketi | Online Dershanem",
    description:
      "En fazla 4 öğrencilik grupta canlı matematik dersi, öğretmen notu ve ders sonrası net çalışma yönü.",
    url: `${siteUrl}/matematik-ders-paketi/`,
  },
};

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

const pillars = [
  {
    title: "En fazla 4 öğrenci",
    body: "Kalabalık online sınıf yok. Öğretmen her öğrenciyi adıyla ve çözüm tarzıyla tanır.",
  },
  {
    title: "Derste görünür ol",
    body: "Öğrenci ekranın arkasında kaybolmaz; soruda ve çözümde aktif olur.",
  },
  {
    title: "Soru sorabilmek",
    body: "Takıldığın anda sorarsın. Konu derste bitirilir, ertesi güne soru işareti kalmaz.",
  },
  {
    title: "Net çalışma yönü",
    body: "Ders sonunda öğrenci hangi konuyu, hangi sorularla çalışacağını bilir.",
  },
];

const lessonFlow = [
  { t: "Seviye analizi", d: "Öğrencinin matematik seviyesi ve hedefi dinlenir, doğru gruba yerleşir." },
  { t: "Canlı ders", d: "Butik grupta konu anlatımı, birlikte çözüm ve aktif soru-cevap." },
  { t: "Ödevlendirme", d: "Ders sonrası seviyeye uygun ödev verilir; öğrenci ne çalışacağını bilir." },
  { t: "Veli özeti", d: "Veliye çocuğunun nerede zorlandığını anlatan kısa ve sade bir not gider." },
];

// Dürüst, iddiasız kadro bloğu — sahte isim/üniversite/derece iddiası yok.
const faculty = [
  {
    title: "Yalnızca matematik",
    body: "Kadromuzdaki her öğretmen tek branşa odaklanır: matematik. Dağılma yok; tüm hazırlık tek derse kurulur.",
  },
  {
    title: "Sınav müfredatına hâkim",
    body: "LGS, TYT ve AYT matematik konuları ve güncel soru tipleriyle düzenli çalışan öğretmenlerle dersler kurulur.",
  },
  {
    title: "Adıyla tanıyan takip",
    body: "En fazla 4 kişilik grupta öğretmen her öğrencinin çözüm tarzını ve takıldığı noktaları yakından izler.",
  },
];

const faq = [
  { q: "Grup gerçekten en fazla 4 kişi mi?", a: "Evet. Matematik Ders Paketi en fazla 4 öğrencilik küçük grup modelidir. Bu sayede öğretmen her öğrenciyle yeterince ilgilenebilir." },
  { q: "Dersler nasıl işleniyor?", a: "Dersler Google Meet üzerinden canlı yapılır. Konu anlatımı, birlikte soru çözümü ve aktif soru-cevap bir aradadır; ders sonunda ödevlendirme yapılır." },
  { q: "Public satışta başka paket var mı?", a: "Hayır. Şu anda public satışta yalnızca Matematik Ders Paketi var. Odak canlı matematik dersi, küçük grup ve ders sonrası net çalışma yönüdür." },
  { q: "Fiyat aylık mı?", a: "Evet. Matematik Ders Paketi aylık ₺3.000'dir (eski fiyat ₺5.000)." },
  { q: "Hesap açmam gerekiyor mu?", a: "Hayır. Ödeme öncesi hesap açmanıza gerek yok. Ödeme sonrası öğrenci hesabınız ekibimiz tarafından oluşturulur ve giriş bilgileri sizinle paylaşılır." },
];

export default function MatematikDersPaketiPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const productLd = productJsonLd({
    name: lessonPkg.name,
    description:
      "En fazla 4 öğrencilik grupta canlı matematik dersi, derste soru-cevap, ders sonrası ödevlendirme ve veliye sade gelişim özeti.",
    url: "/matematik-ders-paketi/",
    priceCents: lessonPkg.priceCents,
    sku: lessonPkg.id,
  });

  const courseLd = courseJsonLd({
    name: lessonPkg.name,
    description:
      "LGS, TYT ve AYT hedeflerine göre, en fazla 4 öğrencilik küçük grupta canlı matematik dersi.",
    url: "/matematik-ders-paketi/",
  });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "Matematik Ders Paketi", url: "/matematik-ders-paketi/" },
  ]);

  return (
    <>
      <SchemaJsonLd schema={[faqJsonLd, productLd, courseLd, breadcrumbLd]} />
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* HERO — sade, ortalı, editorial */}
        <section className="relative overflow-hidden border-b border-[var(--od-line)] bg-[var(--od-cream)]">
          <div className="mx-auto max-w-3xl px-5 pt-28 pb-16 text-center sm:pt-36 sm:pb-24">
            <h1 className="text-[38px] font-black leading-[1.05] tracking-tight text-[var(--od-ink)] sm:text-[58px]">
              Butik grupta canlı matematik dersi.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[16px] leading-7 text-[var(--od-ink-soft)] sm:text-[18px]">
              En fazla 4 öğrencilik grupta öğrenci derste görünür olur, soru
              sorar ve çözümünü öğretmenle birlikte düzeltir. Kalabalık online
              sınıf hissini bilinçli olarak geride bırakıyoruz.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PurchaseFunnelTrigger
                source="ders_paketi_hero"
                packageName={lessonPkg.name}
                category={lessonPkg.category}
                subject={lessonPkg.subject}
                priceLabel={lessonPkg.discountedPrice}
                paymentLink=""
                analyticsId="ders_paketi_hero"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--od-olive)] px-7 py-3 text-[14.5px] font-bold text-white transition hover:bg-[#2E3B24]"
              >
                Matematik Dersini Satın Al
                <ArrowRight size={15} strokeWidth={2} />
              </PurchaseFunnelTrigger>
              <Link
                href="/iletisim/"
                className="inline-flex items-center rounded-full border border-[var(--od-ink)]/15 bg-white px-7 py-3 text-[14.5px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
              >
                Önce Bizimle Görüşün
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-[14px]">
              <span className="text-[22px] font-black text-[var(--od-ink)]">{lessonPkg.discountedPrice}</span>
              {lessonPkg.oldPrice ? (
                <span className="text-[13px] text-[#A0A095] line-through">{lessonPkg.oldPrice}</span>
              ) : null}
            </div>
          </div>
        </section>

        {/* PILLARS */}
        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="mt-3 font-display text-[34px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[44px]">
                  Kalabalık sınıf değil, derste gerçek temas.
                </h2>
              </div>
            </FadeIn>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pillars.map(({ title, body }, i) => (
                <FadeIn key={title} delay={i * 0.04}>
                  <div className="h-full rounded-[22px] border border-[var(--od-line)] bg-[var(--od-cream)] p-6">
                    <h3 className="font-display text-[18px] font-medium leading-tight text-[var(--od-ink)]">{title}</h3>
                    <p className="mt-2 text-[13.5px] leading-6 text-[var(--od-ink-soft)]">{body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* LESSON FLOW */}
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <FadeIn>
              <div className="max-w-2xl">
                <h2 className="mt-3 font-display text-[34px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[44px]">
                  Anlatım, çözüm, ödev, sade geri bildirim.
                </h2>
              </div>
            </FadeIn>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {lessonFlow.map((step, i) => (
                <FadeIn key={step.t} delay={i * 0.05}>
                  <div className="flex h-full flex-col rounded-[22px] border border-[var(--od-line)] bg-white p-6">
                    <span className="font-display text-[28px] leading-none text-[var(--od-olive)]">0{i + 1}</span>
                    <h3 className="mt-5 font-display text-[18px] leading-tight text-[var(--od-ink)]">{step.t}</h3>
                    <p className="mt-2 text-[13.5px] leading-6 text-[var(--od-ink-soft)]">{step.d}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* FACULTY — dürüst, iddiasız kadro yaklaşımı */}
        <section className="border-b border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="mt-3 font-display text-[34px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[44px]">
                  Deneyimli, yalnızca matematik.
                </h2>
                <p className="mt-4 text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
                  Tek branşa odaklanan, butik grupta öğrenciyi yakından takip eden
                  matematik öğretmenleriyle çalışıyoruz.
                </p>
              </div>
            </FadeIn>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {faculty.map((f, i) => (
                <FadeIn key={f.title} delay={i * 0.05}>
                  <div className="flex h-full flex-col rounded-2xl border border-[var(--od-line)] bg-white p-6">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                      <GraduationCap className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <h3 className="mt-4 font-display text-[19px] leading-tight text-[var(--od-ink)]">{f.title}</h3>
                    <p className="mt-3 flex-1 text-[13.5px] leading-6 text-[var(--od-ink-soft)]">{f.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* PRICE */}
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <div className="mx-auto max-w-md rounded-[24px] border border-[var(--od-line)] bg-[var(--od-olive)] p-8 text-white shadow-[0_28px_70px_-46px_rgba(20,20,15,0.36)]">
              <h3 className="font-display text-[24px] leading-tight tracking-tight">{lessonPkg.name}</h3>
              <p className="mt-2 text-[13.5px] leading-6 text-white/70">{lessonPkg.tagline}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-[40px] leading-none tracking-tight">{lessonPkg.discountedPrice}</span>
                {lessonPkg.oldPrice ? (
                  <span className="text-[14px] text-white/50 line-through">{lessonPkg.oldPrice}</span>
                ) : null}
              </div>
              <p className="mt-3 text-[12.5px] leading-6 text-white/70">
                Kalabalık dershane ile birebir özel ders arasında butik bir orta
                yol — aylık sabit fiyat, en fazla 4 kişilik grup.
              </p>
              <ul className="mt-6 space-y-3">
                {lessonPkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[13.5px] leading-6 text-white/90">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--od-yellow)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-col gap-2">
                <PurchaseFunnelTrigger
                  source="ders_paketi_price"
                  packageName={lessonPkg.name}
                  category={lessonPkg.category}
                  subject={lessonPkg.subject}
                  priceLabel={lessonPkg.discountedPrice}
                  paymentLink=""
                  analyticsId="ders_paketi_price"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--od-yellow)] px-5 py-3 text-[14px] font-bold text-[var(--od-ink)] transition hover:bg-[#F0CE52]"
                >
                  Matematik Dersini Satın Al
                  <ArrowRight size={14} strokeWidth={2} />
                </PurchaseFunnelTrigger>
                <AddToCartButton
                  item={cartItem}
                  analyticsSource="ders_paketi_price"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/25 px-5 py-2.5 text-[13px] font-medium text-white transition hover:border-white/50"
                />
              </div>
              <p className="mt-4 text-center text-[12px] leading-6 text-white/70">
                Ödeme sonrası hesabınız ekibimiz tarafından oluşturulur.
              </p>
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/iletisim/"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--od-olive)] hover:text-[var(--od-ink)]"
              >
                Sorularınız mı var? Önce bizimle görüşün
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-5 py-20 sm:py-24">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="mt-3 font-display text-[34px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[42px]">Merak edilenler.</h2>
              </div>
            </FadeIn>
            <div className="mt-10 divide-y divide-[var(--od-line)] overflow-hidden rounded-[20px] border border-[var(--od-line)] bg-[var(--od-cream)]">
              {faq.map((item) => (
                <details key={item.q} className="group px-5 py-5 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[15px] font-medium text-[var(--od-ink)]">
                    {item.q}
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--od-line)] bg-white text-[var(--od-olive)] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[var(--od-ink-soft)]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
