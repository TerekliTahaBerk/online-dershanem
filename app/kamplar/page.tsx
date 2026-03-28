import type { Metadata } from "next";
import { BadgeCheck, Users } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";
import { PurchaseIntentForm } from "@/components/sections/purchase-intent-form";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Kamplar",
  description: "YKS ve LGS için butik kamp planları: planlanan kamplar, içerik detayları ve ön başvuru.",
  alternates: {
    canonical: "/kamplar/"
  },
  openGraph: {
    title: "Kamplar | Online Dershanem",
    description: "Geleceğin başarı planı: butik kamplarımız. İçerikleri inceleyip ön başvuru yapın.",
    url: `${siteUrl}/kamplar/`
  }
};

type Camp = {
  name: string;
  detail: string;
  quota: 1 | 2 | 3;
};

const campPaymentLink = "https://www.paytr.com/link/dQECKnq";

const sharedFeatures = [
  "8 Kişilik Sınıf Yapısı",
  "Haftalık Detaylı PDF Materyali",
  "Konu Bazlı Mini Deneme Uygulaması",
  "Soru Çözüm Seansı ve Çözüm Notları",
  "Düzenli Eksik Analizi ve Tekrar Planı"
];

const aytCamps: Camp[] = [
  {
    name: "AYT Belirleyici Konular Kampı",
    detail:
      "Trigonometri, Türev, Limit ve Logaritma konularıyla AYT'de en kritik dört alana odaklanılır.",
    quota: 1
  },
  {
    name: "Fonksiyon ve Polinom Kampı",
    detail:
      "Fonksiyonlar (her yıl düzenli geliyor), Polinomlar, İkinci dereceden denklemler ve eşitsizlikler başlıklarında sistemli tekrar yapılır.",
    quota: 3
  },
  {
    name: "AYT Geometri Ana Kampı",
    detail:
      "Çember ve daire, Doğrunun analitiği, Noktanın analitiği ve Katı cisimler konularında geometri temeli güçlendirilir.",
    quota: 2
  }
];

const tytCamps: Camp[] = [
  {
    name: "Problemler Kampı",
    detail: "Problemler konusu üzerinde soru çözüm stratejileri ve hız çalışmaları yapılır.",
    quota: 2
  },
  {
    name: "Fonksiyon ve Grafik Kampı",
    detail: "Fonksiyonlar ve Grafik yorumlama konularıyla TYT temel yorum gücü geliştirilir.",
    quota: 1
  }
];

const lgsCamps: Camp[] = [
  {
    name: "Yeni Nesil Sorular Kampı",
    detail:
      "Problem çözme, Mantık ve Çok adımlı sorular üzerinden yeni nesil soru bakış açısı kazandırılır.",
    quota: 3
  },
  {
    name: "Geometri Kampı",
    detail:
      "Üçgenler, Eşlik ve benzerlik, Dönüşüm geometrisi başlıklarında geometri temeli pekiştirilir.",
    quota: 2
  },
  {
    name: "Açılar ve Üçgenler Kampı",
    detail: "Açılar ve Üçgenler konularında temel kavramlar ve soru çözüm teknikleri işlenir.",
    quota: 1
  }
];

export default function CampsPage() {
  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <FadeIn>
            <section className="rounded-3xl border border-line bg-gradient-to-br from-white via-paper to-mint p-7 shadow-soft sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Kamplar</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Geleceğin Başarı Planı: Butik Kamplarımız
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
                Müfredatın en kritik konularını 8 kişilik özel gruplarda, uzman eğitmenlerle derinlemesine bitiriyoruz. Açılacak
                kampları inceleyin, ön başvurunuzu yapın.
              </p>
            </section>
          </FadeIn>

          <FadeIn delay={0.06}>
            <section className="mt-8 rounded-3xl border border-line bg-white p-4 shadow-soft sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Takvim</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">Kamplar Takvimi</h2>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">
                  Kamplarımızın başlaması için kontenjanların dolması beklenmektedir. Kamplarımız en geç 18 Nisan tarihinde başlayacaktır.
                </p>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-line">
                <iframe
                  src="https://calendar.google.com/calendar/embed?src=c7e9bc8f3695d608c263a450c1402dba131bc20a71b86ece44737de9115d9772%40group.calendar.google.com&ctz=Europe%2FIstanbul"
                  style={{ border: 0 }}
                  width="100%"
                  height="600"
                  frameBorder="0"
                  scrolling="no"
                  title="Kamplar Takvimi"
                />
              </div>
            </section>
          </FadeIn>

          <section className="mt-10">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">AYT Matematik Kampları</h2>
            </FadeIn>
            <div className="mt-6 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {aytCamps.map((camp, index) => (
                <FadeIn key={camp.name} delay={index * 0.06}>
                  <article className="group relative flex h-full flex-col rounded-3xl border border-line bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex flex-1 flex-col">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-xs font-semibold text-ink">
                        <Users className="h-3.5 w-3.5 text-brand" /> Max 8 Öğrenci
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-pine">
                        <BadgeCheck className="h-3.5 w-3.5 text-brand" /> Canlı İnteraktif Ders
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-ink">{camp.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{camp.detail}</p>

                    <ul className="mt-4 space-y-2 text-xs text-muted">
                      {sharedFeatures.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    </ul>

                    <div className="mt-4 rounded-2xl border border-line bg-soft p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">Kamp Fiyatı</p>
                      <p className="mt-1 inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                        Kontenjan: {camp.quota} Kişi
                      </p>
                      <p className="mt-1 text-sm font-medium text-muted line-through">₺5.000,00</p>
                      <p className="mt-1 text-2xl font-bold text-anchor">₺2.000,00</p>
                    </div>
                  </div>

                    <PurchaseFunnelTrigger
                      source={`camp_${camp.name}_purchase`}
                      packageName={`${camp.name} Kampı`}
                      paymentLink={campPaymentLink}
                      className="mt-5 inline-flex w-fit shrink-0 rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-pine"
                      analyticsId={`camp_${camp.name}_purchase`}
                    >
                      ₺2.000,00 ile Kampa Katıl
                    </PurchaseFunnelTrigger>
                  </article>
                </FadeIn>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">TYT Matematik Kampları</h2>
            </FadeIn>
            <div className="mt-6 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {tytCamps.map((camp, index) => (
                <FadeIn key={camp.name} delay={index * 0.06}>
                  <article className="group relative flex h-full flex-col rounded-3xl border border-line bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex flex-1 flex-col">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-xs font-semibold text-ink">
                        <Users className="h-3.5 w-3.5 text-brand" /> Max 8 Öğrenci
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-pine">
                        <BadgeCheck className="h-3.5 w-3.5 text-brand" /> Canlı İnteraktif Ders
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-ink">{camp.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{camp.detail}</p>

                    <ul className="mt-4 space-y-2 text-xs text-muted">
                      {sharedFeatures.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    </ul>

                    <div className="mt-4 rounded-2xl border border-line bg-soft p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">Kamp Fiyatı</p>
                      <p className="mt-1 inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                        Kontenjan: {camp.quota} Kişi
                      </p>
                      <p className="mt-1 text-sm font-medium text-muted line-through">₺5.000,00</p>
                      <p className="mt-1 text-2xl font-bold text-anchor">₺2.000,00</p>
                    </div>
                  </div>

                    <PurchaseFunnelTrigger
                      source={`camp_${camp.name}_purchase`}
                      packageName={`${camp.name} Kampı`}
                      paymentLink={campPaymentLink}
                      className="mt-5 inline-flex w-fit shrink-0 rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-pine"
                      analyticsId={`camp_${camp.name}_purchase`}
                    >
                      ₺2.000,00 ile Kampa Katıl
                    </PurchaseFunnelTrigger>
                  </article>
                </FadeIn>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">LGS Kampları</h2>
            </FadeIn>
            <div className="mt-6 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {lgsCamps.map((camp, index) => (
                <FadeIn key={camp.name} delay={index * 0.06}>
                  <article className="group relative flex h-full flex-col rounded-3xl border border-line bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex flex-1 flex-col">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-xs font-semibold text-ink">
                        <Users className="h-3.5 w-3.5 text-brand" /> Max 8 Öğrenci
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-pine">
                        <BadgeCheck className="h-3.5 w-3.5 text-brand" /> Canlı İnteraktif Ders
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-ink">{camp.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{camp.detail}</p>

                    <ul className="mt-4 space-y-2 text-xs text-muted">
                      {sharedFeatures.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    </ul>

                    <div className="mt-4 rounded-2xl border border-line bg-soft p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">Kamp Fiyatı</p>
                      <p className="mt-1 inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                        Kontenjan: {camp.quota} Kişi
                      </p>
                      <p className="mt-1 text-sm font-medium text-muted line-through">₺5.000,00</p>
                      <p className="mt-1 text-2xl font-bold text-anchor">₺2.000,00</p>
                    </div>
                  </div>

                    <PurchaseFunnelTrigger
                      source={`camp_${camp.name}_purchase`}
                      packageName={`${camp.name} Kampı`}
                      paymentLink={campPaymentLink}
                      className="mt-5 inline-flex w-fit shrink-0 rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-pine"
                      analyticsId={`camp_${camp.name}_purchase`}
                    >
                      ₺2.000,00 ile Kampa Katıl
                    </PurchaseFunnelTrigger>
                  </article>
                </FadeIn>
              ))}
            </div>
          </section>

          <FadeIn delay={0.1}>
            <section className="mt-12 rounded-3xl border border-line bg-soft p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink sm:text-2xl">Aradığınız konu listede yok mu?</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              4-8 kişilik kendi grubunuzu kurun, size özel kampı biz başlatalım!
            </p>
            <LeadFunnelTrigger
              source="custom_group_camp_request"
              eventName="landing_cta_click"
              className="mt-5 inline-flex rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition hover:bg-pine"
              analyticsId="custom_group_camp_request"
            >
              Özel Grup Talebi - Ön Başvuru Yap
            </LeadFunnelTrigger>
            </section>
          </FadeIn>
        </Container>
      </main>
      <MultiStepLeadForm />
      <PurchaseIntentForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
