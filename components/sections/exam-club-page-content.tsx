import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  Clock3,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

const stats = [
  { value: "Haftada 1", label: "deneme ritmi" },
  { value: "Derin", label: "sonuç analizi" },
  { value: "Eksik", label: "konu takibi" },
  { value: "Düzenli", label: "bilgilendirme" }
];

const pillars = [
  {
    icon: BarChart3,
    title: "Derinlemesine sonuç analizi",
    body: "Net, süre, branş ve soru davranışı birlikte okunur. Sonuç ekranı sadece puan göstermez; neden düştüğünü veya yükseldiğini de anlatır."
  },
  {
    icon: Target,
    title: "Eksik konu takibi",
    body: "Hangi konu tekrar ediyor, hangi başlıkta kalıcı boşluk var, nerede hız sorunu oluşuyor net biçimde ayrıştırılır."
  },
  {
    icon: BellRing,
    title: "Bilgilendirme ve yönlendirme",
    body: "Deneme sonrası öğrencinin önüne net bir haftalık odak çıkar. Gerekirse veli veya öğrenciye doğrudan yönlendirme yapılır."
  }
];

const steps = [
  {
    no: "01",
    title: "Haftalık denemeni çöz",
    body: "Paketine göre her hafta düzenli tek deneme uygulanır. Amaç yoğunluk değil, sürdürülebilir ölçüm ritmi kurmak."
  },
  {
    no: "02",
    title: "Sonuç raporunu incele",
    body: "Sadece doğru-yanlış değil; süre, branş dengesi ve soru davranışı birlikte yorumlanır."
  },
  {
    no: "03",
    title: "Eksik konu listeni çıkar",
    body: "Tekrarlayan konu eksikleri ve zayıf alanlar haftalık bazda işaretlenir."
  },
  {
    no: "04",
    title: "Yeni haftayı buna göre kur",
    body: "Bir sonraki hafta hangi başlığa ağırlık vereceğin belirsiz kalmaz. Paket, analizden sonra yön verir."
  }
];

const packageCards = [
  {
    key: "yks",
    title: "YKS Deneme Paketi",
    label: "TYT + AYT odaklı",
    accent: "bg-[#0f766e]",
    summary: "YKS öğrencisi için haftalık deneme düzeni, derin sonuç analizi ve eksik konu takibi tek pakette toplanır.",
    details: [
      "Haftada 1 TYT veya AYT denemesi",
      "Branş bazlı sonuç okuması",
      "Eksik konu ve hız problemi takibi",
      "Haftalık yönlendirme notu"
    ]
  },
  {
    key: "lgs",
    title: "LGS Deneme Paketi",
    label: "LGS hazırlık ritmi",
    accent: "bg-[#111827]",
    summary: "LGS öğrencisinin denemeden sonra dağılıp kalmaması için kurulmuş takipli paket yapısı.",
    details: [
      "Haftada 1 LGS denemesi",
      "Yeni nesil soru davranışı analizi",
      "Konu eksiği ve dikkat takibi",
      "Veliye uygun özet bilgilendirme"
    ]
  },
  {
    key: "problemler",
    title: "Problemler Paketi",
    label: "Konu bazlı performans paketi",
    accent: "bg-[#166534]",
    summary: "Tek bir alanda tıkanan öğrenci için, konu merkezli mini deneme ve analiz düzeni kurulur.",
    details: [
      "Haftada 1 problem odaklı deneme",
      "Soru tipi bazlı hata analizi",
      "Eksik kazanım listesi",
      "Sonraki hafta için net konu yönlendirmesi"
    ]
  }
];

const comparisonRows = [
  { point: "Deneme uygulaması", classic: "Var", odk: "Var" },
  { point: "Derinlemesine sonuç analizi", classic: "-", odk: "Var" },
  { point: "Eksik konu takibi", classic: "-", odk: "Var" },
  { point: "Haftalık odak bilgilendirmesi", classic: "-", odk: "Var" },
  { point: "Paket bazlı düzenli sistem", classic: "-", odk: "Var" }
];

const faq = [
  {
    q: "Deneme Kulübü nasıl çalışıyor?",
    a: "Her pakette haftada 1 deneme uygulanır. Deneme sonrası sonuçlar sadece yayınlanmaz; analiz edilir, eksik konular işaretlenir ve bir sonraki hafta için yön verilir."
  },
  {
    q: "Bu yapı dershaneden bağımsız alınabilir mi?",
    a: "Evet. Deneme Kulübü paketleri tek başına alınabilir. Amaç, öğrencinin düzenli ölçülmesi ve deneme verisinin boşa gitmemesidir."
  },
  {
    q: "Paketler neye göre ayrılıyor?",
    a: "Sınav türüne ve ihtiyaca göre ayrılıyor. YKS, LGS ve belirli konu odaklı paketler farklı analiz ihtiyaçlarına göre kurgulanıyor."
  },
  {
    q: "Buradaki asıl fark nedir?",
    a: "Asıl fark, denemenin tek başına bırakılmaması. ODK denemeyi bir rapor ve yönlendirme sistemine dönüştürüyor."
  }
];

export function ExamClubPageContent() {
  return (
    <>
      <section className="relative overflow-hidden rounded-[24px] bg-[#0b1211] px-6 py-10 text-white sm:px-8 sm:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(60,179,113,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_30%)]" />
        <FadeIn>
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                <Sparkles className="h-3.5 w-3.5" />
                Deneme Kulübü
              </span>
              <Image
                src="/odklogo2.jpeg"
                alt="Online Deneme Kulübü"
                width={360}
                height={86}
                className="mt-6 h-10 w-auto object-contain"
              />
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-[3.7rem]">
                Sadece deneme değil, takip edilen analiz paketi.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                ODK, haftada 1 denemeyi bir ürün mantığıyla yönetir. Deneme yapılır, sonuç derinlemesine analiz edilir, eksik
                konular işaretlenir ve öğrenciye yeni hafta için net yön verilir.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <LeadFunnelTrigger
                  source="exam_club_hero_cta"
                  eventName="landing_cta_click"
                  className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b1211] transition hover:bg-white/92"
                  analyticsId="exam_club_hero_cta"
                >
                  Paketleri incele
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </LeadFunnelTrigger>
                <a
                  href="#paketler"
                  className="inline-flex items-center rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Paket yapısı
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-xs text-white/65">
                <span className="rounded-full border border-white/10 px-3 py-1.5">Haftada 1 deneme</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">Derin analiz</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">Eksik konu takibi</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">Bilgilendirme</span>
              </div>
            </div>

            <FadeIn delay={0.08}>
              <div className="grid gap-4">
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Paket sistemi</p>
                      <h2 className="mt-1 text-lg font-semibold text-white">Bu pakette ne oluyor?</h2>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                      Kayıt açık
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {[
                      "Haftada 1 düzenli deneme uygulanır",
                      "Sonuçlar yüzeysel değil, detaylı okunur",
                      "Eksik konu listesi çıkarılır",
                      "Öğrenciye yeni hafta için yön verilir"
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white/82">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[22px] border border-[#dfe7e4] bg-white p-5 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Örnek analiz ekranı</p>
                        <h3 className="mt-1 text-lg font-semibold text-ink">Bu hafta öne çıkan eksikler</h3>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Yeni odak
                      </span>
                    </div>

                    <div className="mt-5 space-y-4">
                      {[
                        { label: "Fonksiyonlar", pct: 72, tone: "bg-[#0f766e]" },
                        { label: "Paragraf hızı", pct: 38, tone: "bg-[#1f2937]" },
                        { label: "Problemler", pct: 54, tone: "bg-[#166534]" }
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-ink">{item.label}</span>
                            <span className="text-muted">%{item.pct}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-soft">
                            <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[#dfe7e4] bg-[#f3f7f5] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Deneme sonrası çıktı</p>
                    <ul className="mt-4 space-y-3">
                      {[
                        "Eksik konu listesi",
                        "Branş bazlı durum özeti",
                        "Bir sonraki hafta odakları",
                        "Gerekli bilgilendirme notu"
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-ink">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </FadeIn>
      </section>

      <section className="border-b border-line bg-white">
        <div className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="px-4 py-8 text-center sm:px-6 sm:py-10">
              <div className="text-2xl font-semibold tracking-[-0.03em] text-ink">{stat.value}</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f5f7f6] py-14 sm:py-18">
        <FadeIn>
          <div className="mb-8 max-w-3xl">
            <span className="pd-eyebrow">ODK Ne Yapar</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
              Denemeyi tek başına bırakmaz, anlamlı hale getirir.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
              Bu ekranın ana amacı yarış göstermek değil, denemenin öğrencinin haftalık gelişimine nasıl dönüştüğünü net anlatmaktır.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map((item, index) => {
            const Icon = item.icon;

            return (
              <FadeIn key={item.title} delay={index * 0.05}>
                <article className="flex h-full flex-col rounded-[20px] border border-line bg-white p-6 shadow-soft">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f3f7f5] text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-ink">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{item.body}</p>
                </article>
              </FadeIn>
            );
          })}
        </div>
      </section>

      <section id="sinav-akisi" className="bg-white py-14 sm:py-20">
        <FadeIn>
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <span className="pd-eyebrow justify-center">Haftalık Akış</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
              Her hafta aynı döngü, daha net kararlar.
            </h2>
          </div>
        </FadeIn>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <FadeIn key={step.no} delay={index * 0.04}>
              <article className="flex h-full flex-col rounded-[18px] border border-line bg-[#fbfcfb] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{step.no}</span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand shadow-soft">
                    {index === 0 ? (
                      <Clock3 className="h-4 w-4" />
                    ) : index === 1 ? (
                      <BarChart3 className="h-4 w-4" />
                    ) : index === 2 ? (
                      <Target className="h-4 w-4" />
                    ) : (
                      <BellRing className="h-4 w-4" />
                    )}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              </article>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="bg-[#f5f7f6] py-14 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <FadeIn>
            <div className="rounded-[20px] border border-line bg-white p-6 shadow-soft">
              <span className="pd-eyebrow">Fark</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">Klasik deneme mantığı değil.</h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                ODK, denemeyi tek seferlik ölçüm olmaktan çıkarıp haftalık takip mekanizmasına dönüştürür. Buradaki esas değer,
                sınavdan sonra başlayan analiz ve yönlendirme sürecidir.
              </p>

              <div className="mt-6 space-y-3">
                {comparisonRows.map((row) => (
                  <div key={row.point} className="grid grid-cols-[1.5fr_0.5fr_0.6fr] items-center gap-3 rounded-2xl bg-[#fbfcfb] px-4 py-3">
                    <div className="text-sm text-ink">{row.point}</div>
                    <div className="text-center text-xs font-semibold text-muted">{row.classic}</div>
                    <div className="text-center text-xs font-semibold text-emerald-700">{row.odk}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.06}>
            <div id="paketler" className="rounded-[20px] border border-line bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="pd-eyebrow">Paketler</span>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">ODK paket olarak satılır.</h2>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                  Haftalık yapı
                </span>
              </div>

              <div className="mt-6 grid gap-4">
                {packageCards.map((card) => (
                  <div key={card.key} className="rounded-[18px] border border-line bg-[#fbfcfb] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={`mt-2 h-3 w-3 rounded-full ${card.accent}`} />
                        <div>
                          <h3 className="text-xl font-semibold text-ink">{card.title}</h3>
                          <p className="mt-1 text-xs font-medium uppercase tracking-[0.1em] text-muted">{card.label}</p>
                          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{card.summary}</p>
                        </div>
                      </div>
                      <LeadFunnelTrigger
                        source={`exam_club_package_${card.key}`}
                        eventName="landing_cta_click"
                        className="inline-flex rounded-full border border-line-strong px-4 py-2 text-xs font-semibold text-ink transition hover:bg-ink hover:text-white"
                        analyticsId={`exam_club_package_${card.key}`}
                      >
                        Ön kayıt
                      </LeadFunnelTrigger>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      {card.details.map((detail) => (
                        <div key={detail} className="flex items-start gap-2 rounded-2xl bg-white px-3 py-3 text-sm text-muted">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <span className="pd-eyebrow justify-center">Sık Sorulanlar</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">Merak edilenler.</h2>
          </div>
        </FadeIn>

        <div className="mx-auto mt-10 max-w-4xl divide-y divide-line rounded-[20px] border border-line bg-[#fbfcfb]">
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

      <section className="overflow-hidden rounded-[24px] bg-[#0f172a] px-6 py-10 text-white sm:px-8 sm:py-12">
        <FadeIn>
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <Image src="/odklogo1.png" alt="odk." width={92} height={92} className="h-16 w-16 rounded-xl bg-white p-1.5 object-contain" />
              <h2 className="mt-6 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Denemeyi pakete çevir, süreci görünür kıl.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                Hedef sadece sınav çözmek değil; sınavdan sonra ne yapılacağını sisteme bağlamak. ODK paketleri tam bu boşluğu kapatır.
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Ön kayıtta ne kazanırsın</p>
              <ul className="mt-5 space-y-3">
                {[
                  "Paket açılışını herkesten önce öğrenirsin",
                  "Kontenjan oluştuğunda öncelikli sıraya girersin",
                  "Sana uygun paket yapısı netleşince bilgilendirilirsin",
                  "İlk haftaya hazırlıksız değil, planlı girersin"
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/82">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
