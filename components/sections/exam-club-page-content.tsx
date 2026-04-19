import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  Clock3,
  FileText,
  Sparkles,
  Target
} from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

const stats = [
  { value: "Haftada 1", label: "deneme" },
  { value: "Detaylı", label: "sonuç analizi" },
  { value: "Eksik", label: "konu takibi" },
  { value: "Paket", label: "odaklı yapı" }
];

const weeklyFlow = [
  {
    title: "Denemeyi çöz",
    body: "Her pakette haftada 1 deneme uygulanır. Amaç çok sınav değil, düzenli ölçüm ve takip."
  },
  {
    title: "Raporunu gör",
    body: "Doğru-yanlış sayısının ötesine geçilir; branş, süre ve soru davranışı birlikte yorumlanır."
  },
  {
    title: "Eksikleri ayıkla",
    body: "Tekrarlayan konu boşlukları, dikkat hataları ve hız problemleri görünür hale getirilir."
  },
  {
    title: "Yeni haftaya yön veril",
    body: "Bir sonraki hafta hangi konuya ağırlık verileceği netleştirilir ve öğrenci buna göre ilerler."
  }
];

const benefits = [
  "Haftalık tek denemeyle sürdürülebilir ritim",
  "Derinlemesine sonuç okuması",
  "Eksik konu listesi ve zayıf alan takibi",
  "Öğrenciye düzenli yönlendirme ve bilgilendirme"
];

const packageCards = [
  {
    key: "yks",
    title: "YKS Deneme Paketi",
    label: "TYT + AYT",
    summary: "YKS öğrencisinin haftalık deneme düzenini, sonuç analizini ve eksik konu takibini tek pakette toplar.",
    tone: "bg-[#f3f7f5]",
    features: [
      "Haftada 1 TYT veya AYT denemesi",
      "Branş bazlı analiz raporu",
      "Eksik konu ve süre problemi takibi",
      "Yeni hafta için net odak listesi"
    ]
  },
  {
    key: "lgs",
    title: "LGS Deneme Paketi",
    label: "LGS",
    summary: "LGS öğrencisinin deneme sonrası dağılmadan ilerleyebilmesi için kurulmuş takipli analiz yapısı.",
    tone: "bg-[#f6f5f0]",
    features: [
      "Haftada 1 LGS denemesi",
      "Yeni nesil soru davranışı analizi",
      "Konu eksiği ve dikkat takibi",
      "Veliyi de besleyen özet bilgilendirme"
    ]
  },
  {
    key: "problemler",
    title: "Problemler Paketi",
    label: "Konu bazlı",
    summary: "Tek bir konuda tıkanan öğrenciler için mini deneme + analiz + konu yönlendirmesi sunar.",
    tone: "bg-[#eef5fb]",
    features: [
      "Haftada 1 problem odaklı deneme",
      "Soru tipi bazlı hata analizi",
      "Eksik kazanım listesi",
      "Sonraki hafta için konu önerisi"
    ]
  }
];

const comparisonRows = [
  { point: "Deneme uygulaması", regular: "Var", odk: "Var" },
  { point: "Derin sonuç analizi", regular: "-", odk: "Var" },
  { point: "Eksik konu takibi", regular: "-", odk: "Var" },
  { point: "Haftalık yönlendirme", regular: "-", odk: "Var" }
];

const faq = [
  {
    q: "Deneme Kulübü tam olarak ne satıyor?",
    a: "Deneme Kulübü sadece sınav erişimi satmıyor. Haftada 1 deneme, detaylı sonuç analizi, eksik konu takibi ve düzenli yönlendirme içeren paketler sunuyor."
  },
  {
    q: "Bu paketler dershaneden bağımsız alınabilir mi?",
    a: "Evet. Deneme Kulübü paketleri tek başına alınabilir. Öğrencinin deneme verisini görünür ve anlamlı hale getirmek amaçlanır."
  },
  {
    q: "Paketler neye göre ayrılıyor?",
    a: "Sınav türüne veya ihtiyaca göre ayrılıyor. YKS, LGS ve konu bazlı paketler farklı analiz ihtiyaçlarına göre kuruluyor."
  },
  {
    q: "Buradaki asıl fark ne?",
    a: "Asıl fark, denemenin yalnız bırakılmaması. ODK denemeyi sonuç raporu ve takip mekanizmasına dönüştürüyor."
  }
];

export function ExamClubPageContent() {
  return (
    <>
      <FadeIn>
        <section className="rounded-[24px] border border-line bg-[#f5f7f6] px-6 py-10 text-center sm:px-8 sm:py-14">
          <span className="pd-eyebrow justify-center">Deneme Kulübü</span>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
            Denemeyi ölçümden çıkar,
            <br className="hidden sm:block" /> pakete dönüştür.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-muted sm:text-base">
            ODK, haftada 1 denemeyi tek başına bırakmaz. Sonuçları derinlemesine analiz eder, eksik konuları işaretler ve
            öğrenciyi bir sonraki haftaya yönlendirir. Ana amaç yarış göstermek değil, öğrencinin gelişimini görünür kılmaktır.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LeadFunnelTrigger
              source="exam_club_hero_cta"
              eventName="landing_cta_click"
              className="inline-flex items-center rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition hover:bg-pine"
              analyticsId="exam_club_hero_cta"
            >
              Ön kayıt bırak
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </LeadFunnelTrigger>
            <a
              href="#paketler"
              className="inline-flex items-center rounded-full border border-line-strong bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-soft"
            >
              Paketleri gör
            </a>
          </div>
        </section>
      </FadeIn>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <FadeIn key={stat.label} delay={index * 0.03}>
            <div className="rounded-[20px] border border-line bg-white px-5 py-6 text-center shadow-soft">
              <div className="text-2xl font-semibold tracking-[-0.03em] text-ink">{stat.value}</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{stat.label}</div>
            </div>
          </FadeIn>
        ))}
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <FadeIn>
          <div className="rounded-[22px] border border-line bg-white shadow-soft">
            <div className="border-b border-line px-6 py-5">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">ODK nasıl çalışır?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                Her hafta aynı akış işler. Öğrenci denemeyi çözer, sonuç görünür hale gelir, eksikler ayrıştırılır ve yeni haftaya net
                planla geçilir.
              </p>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              {weeklyFlow.map((item, index) => (
                <div
                  key={item.title}
                  className={`px-6 py-6 ${index % 2 === 0 ? "md:border-r" : ""} ${index < 2 ? "border-b" : ""} border-line`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Adım {index + 1}</div>
                  <h3 className="mt-3 text-lg font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        <div className="grid gap-5">
          <FadeIn delay={0.05}>
            <div className="rounded-[22px] border border-line bg-white p-6 shadow-soft">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                <BarChart3 className="h-4 w-4 text-brand" />
                Neler kazanıyorsun
              </div>
              <div className="mt-5 space-y-3">
                {benefits.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm text-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="rounded-[22px] border border-line bg-[#0f172a] p-6 text-white shadow-soft">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                <FileText className="h-4 w-4 text-emerald-300" />
                Deneme sonrası çıktı
              </div>
              <div className="mt-5 space-y-3">
                {[
                  "Detaylı sonuç raporu",
                  "Eksik konu listesi",
                  "Bir sonraki hafta odakları",
                  "Gerekli öğrenci/veli bilgilendirmesi"
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="mt-10 rounded-[22px] border border-line bg-white p-6 shadow-soft sm:p-8">
        <FadeIn>
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <span className="pd-eyebrow">Fark</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">Klasik deneme mantığı değil.</h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                ODK’nın değeri sınavı açıp kapatmakta değil, o sınavı öğrencinin haftalık gelişim kararına dönüştürmesinde.
              </p>
            </div>

            <div className="grid gap-3">
              {comparisonRows.map((row) => (
                <div key={row.point} className="grid grid-cols-[1.5fr_0.55fr_0.55fr] items-center gap-3 rounded-[18px] bg-[#f8faf9] px-4 py-3">
                  <div className="text-sm text-ink">{row.point}</div>
                  <div className="text-center text-xs font-semibold text-muted">{row.regular}</div>
                  <div className="text-center text-xs font-semibold text-emerald-700">{row.odk}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      <section id="paketler" className="mt-10">
        <FadeIn>
          <div className="mb-8 max-w-3xl">
            <span className="pd-eyebrow">Paketler</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">Deneme Kulübü paket olarak satılır.</h2>
            <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
              YKS, LGS ve konu bazlı paketler aynı mantıkla çalışır: haftada 1 deneme, detaylı analiz, eksik konu takibi ve düzenli
              bilgilendirme.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-5 lg:grid-cols-3">
          {packageCards.map((card, index) => (
            <FadeIn key={card.key} delay={index * 0.05}>
              <article className="flex h-full flex-col rounded-[22px] border border-line bg-white shadow-soft">
                <div className={`border-b border-line px-6 py-6 ${card.tone}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{card.label}</div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{card.summary}</p>
                </div>

                <div className="flex flex-1 flex-col px-6 py-6">
                  <div className="space-y-3">
                    {card.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5 text-sm text-muted">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <LeadFunnelTrigger
                    source={`exam_club_package_${card.key}`}
                    eventName="landing_cta_click"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-anchor"
                    analyticsId={`exam_club_package_${card.key}`}
                  >
                    Ön kayıt oluştur
                  </LeadFunnelTrigger>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[22px] border border-line bg-white p-6 shadow-soft sm:p-8">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <span className="pd-eyebrow justify-center">Sık Sorulanlar</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">Merak edilenler.</h2>
          </div>
        </FadeIn>

        <div className="mx-auto mt-8 max-w-4xl divide-y divide-line rounded-[20px] border border-line bg-[#fbfcfb]">
          {faq.map((item, index) => (
            <FadeIn key={item.q} delay={index * 0.03}>
              <details className="group px-5 py-5 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-ink">
                  {item.q}
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-brand transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{item.a}</p>
              </details>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="mt-10 overflow-hidden rounded-[24px] bg-[#0f172a] px-6 py-10 text-white sm:px-8 sm:py-12">
        <FadeIn>
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <Image src="/odklogo1.png" alt="odk." width={92} height={92} className="h-16 w-16 rounded-xl bg-white p-1.5 object-contain" />
              <h2 className="mt-6 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Deneme düzenini sistemli hale getir.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                Paket açıldığında erkenden haberdar olmak ve sana uygun yapıyı ilk sırada görmek için ön kayıt bırak.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <LeadFunnelTrigger
                  source="exam_club_final_cta"
                  eventName="landing_cta_click"
                  className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0f172a] transition hover:bg-white/92"
                  analyticsId="exam_club_final_cta"
                >
                  Ön kayıt bırak
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </LeadFunnelTrigger>
                <span className="inline-flex items-center rounded-full border border-white/10 px-4 py-3 text-xs font-medium text-white/60">
                  1 dakikadan kısa
                </span>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                <Clock3 className="h-4 w-4 text-emerald-300" />
                Ön kayıtta ne kazanırsın
              </div>
              <div className="mt-5 space-y-3">
                {[
                  "Paket açılışını ilk öğrenenler arasında olursun",
                  "Kontenjan oluştuğunda öncelikli sıraya girersin",
                  "Sana uygun paket yapısı netleştiğinde doğrudan haber alırsın",
                  "Süreci plansız değil, hazırlıklı başlatırsın"
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
