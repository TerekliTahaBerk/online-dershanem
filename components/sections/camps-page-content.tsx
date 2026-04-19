"use client";

import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

type Camp = {
  tag: string;
  title: string;
  desc: string;
  dates: string;
  slots: string;
  hrs: string;
  price: string;
  source: string;
};

const campPaymentLink = "https://www.paytr.com/link/dQECKnq";

const camps: Camp[] = [
  {
    tag: "AYT KAMPI",
    title: "AYT Belirleyici Konular Kampı",
    desc: "Trigonometri, Türev, Limit ve Logaritma konularında net artıran yoğun tekrar.",
    dates: "2 haftalık yoğun program",
    slots: "8 kişi",
    hrs: "Haftada 12 saat",
    price: "₺2.000,00",
    source: "camp_ayt_belirleyici"
  },
  {
    tag: "AYT KAMPI",
    title: "Fonksiyon ve Polinom Kampı",
    desc: "Fonksiyonlar, Polinomlar, ikinci dereceden denklemler ve eşitsizlikler odağında sistemli çalışma.",
    dates: "2 haftalık yoğun program",
    slots: "8 kişi",
    hrs: "Haftada 12 saat",
    price: "₺2.000,00",
    source: "camp_ayt_fonksiyon_polinom"
  },
  {
    tag: "AYT KAMPI",
    title: "AYT Geometri Ana Kampı",
    desc: "Çember-daire, analitik ve katı cisimler konularında geometri temeli güçlendirilir.",
    dates: "2 haftalık yoğun program",
    slots: "8 kişi",
    hrs: "Haftada 12 saat",
    price: "₺2.000,00",
    source: "camp_ayt_geometri"
  },
  {
    tag: "TYT KAMPI",
    title: "Problemler Kampı",
    desc: "Problemler konusu üzerinde soru çözüm stratejileri ve hız çalışmaları yapılır.",
    dates: "10 günlük hız kampı",
    slots: "8 kişi",
    hrs: "Haftada 10 saat",
    price: "₺2.000,00",
    source: "camp_tyt_problemler"
  },
  {
    tag: "TYT KAMPI",
    title: "Fonksiyon ve Grafik Kampı",
    desc: "Fonksiyonlar ve grafik yorumlama konularıyla TYT temel yorum gücü geliştirilir.",
    dates: "10 günlük hız kampı",
    slots: "8 kişi",
    hrs: "Haftada 10 saat",
    price: "₺2.000,00",
    source: "camp_tyt_fonksiyon_grafik"
  },
  {
    tag: "LGS KAMPI",
    title: "Yeni Nesil Sorular Kampı",
    desc: "Problem çözme, mantık ve çok adımlı sorular üzerinden yeni nesil soru bakış açısı kazandırılır.",
    dates: "3 haftalık odak kampı",
    slots: "8 kişi",
    hrs: "Haftada 8 saat",
    price: "₺2.000,00",
    source: "camp_lgs_yeni_nesil"
  },
  {
    tag: "LGS KAMPI",
    title: "Geometri Kampı",
    desc: "Üçgenler, eşlik ve benzerlik, dönüşüm geometrisi başlıklarında geometri temeli pekiştirilir.",
    dates: "3 haftalık odak kampı",
    slots: "8 kişi",
    hrs: "Haftada 8 saat",
    price: "₺2.000,00",
    source: "camp_lgs_geometri"
  },
  {
    tag: "LGS KAMPI",
    title: "Açılar ve Üçgenler Kampı",
    desc: "Açılar ve üçgenler konularında temel kavramlar ve soru çözüm teknikleri işlenir.",
    dates: "3 haftalık odak kampı",
    slots: "8 kişi",
    hrs: "Haftada 8 saat",
    price: "₺2.000,00",
    source: "camp_lgs_acilar_ucgenler"
  }
];

export function CampsPageContent() {
  return (
    <>
      <FadeIn>
        <section className="overflow-hidden rounded-[20px] bg-[#0a0b0a] px-6 py-12 text-white sm:px-10 sm:py-14">
          <div className="relative mx-auto max-w-5xl">
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">Kamplar 2026</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
              Yoğun takipli sınav kampları.
              <br />
              Kısa sürede yüksek net.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              Tatil dönemlerinde ve sınav haftasına kadar sürdürülebilir yüksek tempo. Her kampın sonunda ölçülebilir sonuç.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LeadFunnelTrigger
                source="camps_page_hero_consultation"
                eventName="landing_cta_click"
                className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/90"
                analyticsId="camps_page_hero_consultation"
              >
                Ücretsiz görüşme
              </LeadFunnelTrigger>
              <a
                href="#kamp-listesi"
                className="inline-flex items-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Tüm kamplar
              </a>
            </div>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.05}>
        <section className="mt-8 rounded-[20px] border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Takvim</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">Kamplar Takvimi</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Kamplarımızın başlaması için kontenjanların dolması beklenmektedir. Kamplarımız en geç 1 Mayıs tarihinde başlayacaktır.
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-line">
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

      <section id="kamp-listesi" className="mt-10">
        <FadeIn>
          <div className="mb-8 max-w-3xl">
            <span className="pd-eyebrow">Kamp Listesi</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
              Açılan tüm kampları tek bakışta incele.
            </h2>
          </div>
        </FadeIn>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {camps.map((camp, index) => (
            <FadeIn key={camp.source} delay={index * 0.04}>
              <article className="flex h-full flex-col overflow-hidden rounded-[16px] border border-line bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3 border-b border-line bg-soft px-5 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">{camp.tag}</div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-emerald-700">
                    Kayıt Açık
                  </span>
                </div>

                <div className="flex flex-1 flex-col px-5 py-5">
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-ink">{camp.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{camp.desc}</p>

                  <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.04em] text-muted">Tarih</div>
                      <div className="mt-1 text-sm font-medium text-ink">{camp.dates}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.04em] text-muted">Kontenjan</div>
                      <div className="mt-1 text-sm font-medium text-ink">{camp.slots}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.04em] text-muted">Süre</div>
                      <div className="mt-1 text-sm font-medium text-ink">{camp.hrs}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.04em] text-muted">Yer</div>
                      <div className="mt-1 text-sm font-medium text-ink">Online / Canlı</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
                  <div>
                    <div className="text-lg font-semibold tracking-[-0.02em] text-ink">{camp.price}</div>
                    <div className="text-xs text-muted">tek seferlik</div>
                  </div>
                  <PurchaseFunnelTrigger
                    source={camp.source}
                    packageName={`${camp.title} Kampı`}
                    paymentLink={campPaymentLink}
                    className="inline-flex items-center rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-ink/90"
                    analyticsId={camp.source}
                  >
                    Detaylar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </PurchaseFunnelTrigger>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </section>

      <FadeIn delay={0.08}>
        <section className="mt-10 rounded-[16px] border border-line bg-white p-8 text-center shadow-soft">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Aradığınız konu listede yok mu?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted">
            4-8 kişilik kendi grubunuzu kurun, size özel kampı biz başlatalım.
          </p>
          <LeadFunnelTrigger
            source="custom_group_camp_request"
            eventName="landing_cta_click"
            className="mt-6 inline-flex rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition hover:bg-pine"
            analyticsId="custom_group_camp_request"
          >
            Özel Grup Talebi - Ön Başvuru Yap
          </LeadFunnelTrigger>
        </section>
      </FadeIn>
    </>
  );
}
