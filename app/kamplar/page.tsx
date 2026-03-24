import type { Metadata } from "next";
import { BadgeCheck, CalendarClock, Hourglass, Users } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Kamplar",
  description: "YKS ve LGS için butik kamp planları: planlanan kamplar, içerik detayları ve ön başvuru.",
  alternates: {
    canonical: "/kamplar/"
  },
  openGraph: {
    title: "Kamplar | Online Dershanem",
    description: "Geleceğin başarı planı: butik kamplarımız planlanıyor. İçerikleri inceleyip ön başvuru yapın.",
    url: `${siteUrl}/kamplar/`
  }
};

type Camp = {
  name: string;
  detail: string;
  duration: string;
  status: string;
};

const sharedFeatures = ["Haftalık Detaylı PDF Materyali", "Kişiye Özel Ödev Takibi"];

const yksMathCamps: Camp[] = [
  {
    name: "Fonksiyonlar & Polinomlar",
    detail:
      "AYT Matematik'in %60'ına temel oluşturan; grafik okuma, bileşke ve ters fonksiyon, polinom bölmesi ve kalan bulma odaklı kritik başlangıç.",
    duration: "2 Hafta (4 Oturum)",
    status: "Planlanıyor"
  },
  {
    name: "Problemler Ustalık Kampı",
    detail:
      "TYT'nin 12-14 soruluk dev bölümü. Sayı-Kesir, Yaş, Yüzde-Kar-Zarar ve Hız problemlerinde yeni nesil denklem kurma ve zaman yönetimi.",
    duration: "4 Hafta (8 Oturum)",
    status: "Planlanıyor"
  },
  {
    name: "Limit - Türev - İntegral (LTİ)",
    detail:
      "AYT'nin zirvesi. 10-12 netlik devasa kazanım. Süreklilik, türev alma kuralları, geometrik yorum ve belirli integral ile alan hesabı üzerine derinlemesine analiz.",
    duration: "6 Hafta (12 Oturum)",
    status: "Planlanıyor"
  },
  {
    name: "Trigonometri & Logaritma",
    detail:
      "Birim çemberden toplam-fark formüllerine, logaritma özelliklerinden dizilere kadar AYT'nin net deposu olan konuların full tekrarı.",
    duration: "3 Hafta (6 Oturum)",
    status: "Planlanıyor"
  },
  {
    name: 'Geometri: Üçgenler & Analitik',
    detail:
      '"Göremiyorum" diyenler için; üçgende yardımcı elemanlar, benzerlik ve analitik düzlemde doğru-nokta ilişkisi üzerine görme teknikleri eğitimi.',
    duration: "4 Hafta (8 Oturum)",
    status: "Planlanıyor"
  }
];

const lgsMathCamps: Camp[] = [
  {
    name: "LGS Yeni Nesil Soru Analizi",
    detail:
      'Çarpanlar ve Katlar, Üslü İfadeler ve Kareköklü Sayılar konularında MEB örnek soruları üzerinden "Soruyu Anlama ve Çözme" stratejileri.',
    duration: "4 Hafta (8 Oturum)",
    status: "Planlanıyor"
  },
  {
    name: "Denklemler & Eğim Maratonu",
    detail:
      "Doğrusal denklemler, koordinat sistemi ve eğim konularında en zorlayıcı soru tiplerinin pratik çözüm yöntemleri ve mantık yürütme.",
    duration: "3 Hafta (6 Oturum)",
    status: "Planlanıyor"
  },
  {
    name: "Geometri & Veri İşleme",
    detail:
      "Üçgenler, eşlik-benzerlik ve dönüşüm geometrisi konularının görsel hafıza teknikleriyle full tekrarı.",
    duration: "3 Hafta (6 Oturum)",
    status: "Planlanıyor"
  }
];

export default function CampsPage() {
  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <section className="rounded-3xl border border-line bg-gradient-to-br from-white via-paper to-mint p-7 shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Kamplar</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Geleceğin Başarı Planı: Butik Kamplarımız Planlanıyor
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              Müfredatın en kritik konularını 8 kişilik özel gruplarda, uzman eğitmenlerle derinlemesine bitiriyoruz. Açılacak
              kampları inceleyin, ön başvurunuzu yapın.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">YKS (TYT-AYT) Matematik Kampları</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {yksMathCamps.map((camp) => (
                <article key={camp.name} className="group relative rounded-3xl border border-line bg-white p-5 shadow-soft">
                  <div className="pointer-events-none absolute left-1/2 top-3 z-10 w-[88%] -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-center text-[11px] font-semibold text-amber-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Kontenjanlar sınırlı tutulacaktır
                  </div>

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

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 font-semibold text-ink">
                      <CalendarClock className="h-3.5 w-3.5 text-brand" /> {camp.duration}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 font-semibold text-muted">
                      <Hourglass className="h-3.5 w-3.5 text-brand" /> {camp.status}
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-muted">
                    {sharedFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <LeadFunnelTrigger
                    source={`camp_${camp.name}_info`}
                    eventName="landing_cta_click"
                    className="mt-5 inline-flex rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-pine"
                    analyticsId={`camp_${camp.name}_planned_info`}
                  >
                    Planlanıyor - Bilgi Al
                  </LeadFunnelTrigger>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">LGS Matematik Kampları</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {lgsMathCamps.map((camp) => (
                <article key={camp.name} className="group relative rounded-3xl border border-line bg-white p-5 shadow-soft">
                  <div className="pointer-events-none absolute left-1/2 top-3 z-10 w-[88%] -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-center text-[11px] font-semibold text-amber-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Kontenjanlar sınırlı tutulacaktır
                  </div>

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

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 font-semibold text-ink">
                      <CalendarClock className="h-3.5 w-3.5 text-brand" /> {camp.duration}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 font-semibold text-muted">
                      <Hourglass className="h-3.5 w-3.5 text-brand" /> {camp.status}
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-muted">
                    {sharedFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <LeadFunnelTrigger
                    source={`camp_${camp.name}_preapply`}
                    eventName="landing_cta_click"
                    className="mt-5 inline-flex rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-pine"
                    analyticsId={`camp_${camp.name}_preapply`}
                  >
                    Ön Başvuru Yap
                  </LeadFunnelTrigger>
                </article>
              ))}
            </div>
          </section>

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
        </Container>
      </main>
      <MultiStepLeadForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
