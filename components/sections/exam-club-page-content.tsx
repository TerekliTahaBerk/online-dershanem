import Image from "next/image";
import { ArrowRight, CheckCircle2, Clock3, FileText, Sparkles } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

const stats = [
  { value: "Haftada 1", label: "deneme" },
  { value: "Detaylı", label: "sonuç analizi" },
  { value: "Eksik", label: "konu takibi" },
  { value: "Paket", label: "odaklı yapı" },
];

const weeklyFlow = [
  {
    title: "Denemeyi çöz",
    body: "Her pakette haftada 1 deneme uygulanır. Amaç çok sınav değil; düzenli ölçüm ve takip.",
  },
  {
    title: "Raporunu gör",
    body: "Doğru-yanlış sayısının ötesine geçilir; branş, süre ve soru davranışı birlikte yorumlanır.",
  },
  {
    title: "Eksikleri ayıkla",
    body: "Tekrarlayan konu boşlukları, dikkat hataları ve hız problemleri görünür hâle getirilir.",
  },
  {
    title: "Yeni haftaya yön ver",
    body: "Bir sonraki hafta hangi konuya ağırlık verileceği netleştirilir ve öğrenci buna göre ilerler.",
  },
];

const benefits = [
  "Haftalık tek denemeyle sürdürülebilir ritim",
  "Derinlemesine sonuç okuması",
  "Eksik konu listesi ve zayıf alan takibi",
  "Öğrenciye düzenli yönlendirme ve bilgilendirme",
];

type Pkg = {
  key: string;
  title: string;
  label: string;
  summary: string;
  price: number;
  features: string[];
  highlight?: boolean;
};

const packageCards: Pkg[] = [
  {
    key: "lgs",
    title: "LGS Deneme Paketi",
    label: "8. Sınıf · LGS",
    summary:
      "LGS öğrencisinin deneme sonrası dağılmadan ilerleyebilmesi için kurulmuş takipli analiz yapısı.",
    price: 500,
    features: [
      "Haftada 1 LGS denemesi",
      "Yeni nesil soru davranışı analizi",
      "Konu eksiği ve dikkat takibi",
      "Veliyi besleyen özet bilgilendirme",
    ],
  },
  {
    key: "tyt",
    title: "TYT Deneme Paketi",
    label: "YKS · TYT",
    summary:
      "TYT bölümüne odaklanan öğrenci için haftalık temel branş analizi ve net artışı planı.",
    price: 500,
    features: [
      "Haftada 1 TYT denemesi",
      "Branş bazlı net & süre analizi",
      "Eksik konu listesi",
      "Bir sonraki hafta için odak listesi",
    ],
  },
  {
    key: "ayt",
    title: "AYT Deneme Paketi",
    label: "YKS · AYT",
    summary:
      "Alan derslerinde derinleşmek isteyen öğrenci için branş bazlı AYT denemesi ve analiz takibi.",
    price: 500,
    features: [
      "Haftada 1 AYT denemesi",
      "Alan dersi bazlı analiz raporu",
      "Soru davranışı ve hız takibi",
      "Konu eksiği bazlı yönlendirme",
    ],
  },
  {
    key: "tyt-ayt",
    title: "TYT & AYT Paketi",
    label: "YKS · TYT + AYT",
    summary:
      "TYT ve AYT denemelerini birlikte takip eden, en kapsamlı YKS deneme & analiz paketi.",
    price: 750,
    highlight: true,
    features: [
      "Haftada 1 TYT veya AYT denemesi",
      "TYT + AYT birleşik gelişim raporu",
      "Eksik konu ve süre problemi takibi",
      "Haftalık net odak planı",
    ],
  },
];

const comparisonRows = [
  { point: "Deneme uygulaması", regular: "Var", odk: "Var" },
  { point: "Derin sonuç analizi", regular: "—", odk: "Var" },
  { point: "Eksik konu takibi", regular: "—", odk: "Var" },
  { point: "Haftalık yönlendirme", regular: "—", odk: "Var" },
];

const faq = [
  {
    q: "Deneme Kulübü tam olarak ne satıyor?",
    a: "Sadece sınav erişimi değil; haftada 1 deneme, detaylı sonuç analizi, eksik konu takibi ve düzenli yönlendirme içeren paketler sunuyoruz.",
  },
  {
    q: "Bu paketler dershaneden bağımsız alınabilir mi?",
    a: "Evet. Deneme Kulübü paketleri tek başına alınabilir. Öğrencinin deneme verisini görünür ve anlamlı hâle getirmek amaçlanır.",
  },
  {
    q: "Paketler neye göre ayrılıyor?",
    a: "Sınav türüne göre ayrılıyor: LGS, TYT, AYT ve TYT & AYT birlikte takip etmek isteyenler için kapsamlı paket.",
  },
  {
    q: "Buradaki asıl fark ne?",
    a: "Asıl fark, denemenin yalnız bırakılmaması. ODK denemeyi sonuç raporu ve takip mekanizmasına dönüştürüyor.",
  },
];

const priceFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

export function ExamClubPageContent() {
  return (
    <>
      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <FadeIn key={stat.label} delay={index * 0.03}>
            <div className="rounded-[20px] border border-[var(--od-line)] bg-white px-5 py-6 text-center">
              <div className="font-display text-[28px] leading-none text-[var(--od-ink)]">
                {stat.value}
              </div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8B8B7E]">
                {stat.label}
              </div>
            </div>
          </FadeIn>
        ))}
      </section>

      {/* Flow + Benefits */}
      <section className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <FadeIn>
          <div className="rounded-[22px] border border-[var(--od-line)] bg-white">
            <div className="border-b border-[var(--od-line)] px-6 py-5">
              <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
                Akış
              </span>
              <h2 className="mt-2 font-display text-[28px] leading-tight tracking-tight text-[var(--od-ink)]">
                ODK nasıl çalışır?
              </h2>
              <p className="mt-3 max-w-2xl text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
                Her hafta aynı akış işler. Öğrenci denemeyi çözer, sonuç görünür hâle gelir,
                eksikler ayrıştırılır ve yeni haftaya net planla geçilir.
              </p>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              {weeklyFlow.map((item, index) => (
                <div
                  key={item.title}
                  className={`px-6 py-6 ${index % 2 === 0 ? "md:border-r" : ""} ${
                    index < 2 ? "border-b" : ""
                  } border-[var(--od-line)]`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--od-olive)]">
                    Adım {index + 1}
                  </div>
                  <h3 className="mt-3 font-display text-[20px] leading-tight tracking-tight text-[var(--od-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-7 text-[var(--od-ink-soft)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        <div className="grid gap-5">
          <FadeIn delay={0.05}>
            <div className="rounded-[22px] border border-[var(--od-line)] bg-[var(--od-cream-2)] p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--od-olive)]">
                <Sparkles className="h-4 w-4" />
                Neler kazanıyorsun
              </div>
              <div className="mt-5 space-y-3">
                {benefits.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 text-[14px] leading-6 text-[var(--od-ink-soft)]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--od-olive)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="rounded-[22px] border border-[#2e2d2a] bg-[#1c1b18] p-6 text-white">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                <FileText className="h-4 w-4 text-[#cfcbb8]" />
                Deneme sonrası çıktı
              </div>
              <div className="mt-5 space-y-3">
                {[
                  "Detaylı sonuç raporu",
                  "Eksik konu listesi",
                  "Bir sonraki hafta odakları",
                  "Gerekli öğrenci/veli bilgilendirmesi",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 text-[14px] leading-6 text-white/80"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#cfcbb8]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Comparison */}
      <section className="mt-12 rounded-[22px] border border-[var(--od-line)] bg-white p-6 sm:p-8">
        <FadeIn>
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
                Fark
              </span>
              <h2 className="mt-3 font-display text-[30px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[34px]">
                Klasik deneme mantığı{" "}
                <em className="italic text-[var(--od-olive)]">değil</em>.
              </h2>
              <p className="mt-4 text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
                ODK’nın değeri sınavı açıp kapatmakta değil; o sınavı öğrencinin haftalık
                gelişim kararına dönüştürmesinde.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-[1.5fr_0.55fr_0.55fr] items-center gap-3 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8B8B7E]">
                <span />
                <span className="text-center">Klasik</span>
                <span className="text-center text-[var(--od-olive)]">ODK</span>
              </div>
              {comparisonRows.map((row) => (
                <div
                  key={row.point}
                  className="grid grid-cols-[1.5fr_0.55fr_0.55fr] items-center gap-3 rounded-[18px] border border-[var(--od-line)] bg-[var(--od-cream)] px-4 py-3"
                >
                  <div className="text-[14px] text-[var(--od-ink)]">{row.point}</div>
                  <div className="text-center text-[12.5px] font-semibold text-[#8B8B7E]">
                    {row.regular}
                  </div>
                  <div className="text-center text-[12.5px] font-semibold text-[var(--od-olive)]">
                    {row.odk}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Packages */}
      <section id="paketler" className="mt-14 scroll-mt-24">
        <FadeIn>
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
              Paketler
            </span>
            <h2 className="mt-3 font-display text-[34px] font-normal leading-[1.08] tracking-tight text-[var(--od-ink)] sm:text-[44px]">
              Sınavına göre seç,{" "}
              <em className="italic text-[var(--od-olive)]">haftalık ritmi</em> kur.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
              LGS, TYT, AYT veya TYT & AYT — aynı mantık: haftada 1 deneme, detaylı analiz,
              eksik konu takibi ve düzenli bilgilendirme.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {packageCards.map((card, index) => {
            const isHighlight = card.highlight;
            return (
              <FadeIn key={card.key} delay={index * 0.05}>
                <article
                  className={`relative flex h-full flex-col rounded-[22px] border ${
                    isHighlight
                      ? "border-[var(--od-ink)] bg-[var(--od-yellow-soft)]"
                      : "border-[var(--od-line)] bg-white"
                  }`}
                >
                  {isHighlight ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--od-ink)] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white">
                      En kapsamlı
                    </span>
                  ) : null}

                  <div
                    className={`border-b px-6 py-6 ${
                      isHighlight ? "border-[var(--od-ink)]/15" : "border-[var(--od-line)]"
                    }`}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--od-olive)]">
                      {card.label}
                    </div>
                    <h3 className="mt-3 font-display text-[24px] leading-tight tracking-tight text-[var(--od-ink)]">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-[13.5px] leading-6 text-[var(--od-ink-soft)]">
                      {card.summary}
                    </p>

                    <div className="mt-5 flex items-baseline gap-1.5">
                      <span className="font-display text-[32px] leading-none tracking-tight text-[var(--od-ink)]">
                        {priceFormatter.format(card.price)}
                      </span>
                      <span className="text-[12px] text-[var(--od-ink-soft)]">/ ay</span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-6 py-6">
                    <div className="space-y-3">
                      {card.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-2.5 text-[13.5px] leading-6 text-[var(--od-ink-soft)]"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--od-olive)]" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    <LeadFunnelTrigger
                      source={`exam_club_package_${card.key}`}
                      eventName="landing_cta_click"
                      analyticsId={`exam_club_package_${card.key}`}
                      className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-[13.5px] font-medium transition ${
                        isHighlight
                          ? "bg-[var(--od-ink)] text-white hover:bg-black"
                          : "border border-[var(--od-ink)]/15 bg-white text-[var(--od-ink)] hover:border-[var(--od-ink)]/40"
                      }`}
                    >
                      Ön kayıt oluştur
                      <ArrowRight size={14} strokeWidth={1.8} />
                    </LeadFunnelTrigger>
                  </div>
                </article>
              </FadeIn>
            );
          })}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-[12.5px] leading-6 text-[var(--od-ink-soft)]">
          Fiyatlar aylık ve KDV dahildir. Paket içerikleri dönemsel olarak güncellenebilir.
        </p>
      </section>

      {/* FAQ */}
      <section className="mt-14 rounded-[22px] border border-[var(--od-line)] bg-white p-6 sm:p-8">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
              Sık Sorulanlar
            </span>
            <h2 className="mt-3 font-display text-[30px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[36px]">
              Merak edilenler.
            </h2>
          </div>
        </FadeIn>

        <div className="mx-auto mt-8 max-w-4xl divide-y divide-[var(--od-line)] rounded-[20px] border border-[var(--od-line)] bg-[var(--od-cream)]">
          {faq.map((item, index) => (
            <FadeIn key={item.q} delay={index * 0.03}>
              <details className="group px-5 py-5 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[15px] font-medium text-[var(--od-ink)]">
                  {item.q}
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--od-line)] bg-white text-[var(--od-olive)] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[var(--od-ink-soft)]">
                  {item.a}
                </p>
              </details>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mt-14 overflow-hidden rounded-[24px] border border-[#2e2d2a] bg-[#1c1b18] px-6 py-10 text-white sm:px-8 sm:py-12">
        <FadeIn>
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <Image
                src="/odklogo1.png"
                alt="odk."
                width={92}
                height={92}
                className="h-16 w-16 rounded-xl bg-white p-1.5 object-contain"
              />
              <h2 className="mt-6 max-w-xl font-display text-[30px] leading-tight tracking-tight sm:text-[40px]">
                Deneme düzenini sistemli hâle getir.
              </h2>
              <p className="mt-4 max-w-xl text-[14.5px] leading-7 text-white/70 sm:text-[15.5px]">
                Paket açıldığında erkenden haberdar olmak ve sana uygun yapıyı ilk sırada
                görmek için ön kayıt bırak.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <LeadFunnelTrigger
                  source="exam_club_final_cta"
                  eventName="landing_cta_click"
                  analyticsId="exam_club_final_cta"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-[14px] font-medium text-[#1c1b18] transition hover:bg-white/90"
                >
                  Ön kayıt bırak
                  <ArrowRight className="h-4 w-4" />
                </LeadFunnelTrigger>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                <Clock3 className="h-4 w-4 text-[#cfcbb8]" />
                Ön kayıtta ne kazanırsın
              </div>
              <div className="mt-5 space-y-3">
                {[
                  "Paket açılışını ilk öğrenenler arasında olursun",
                  "Kontenjan oluştuğunda öncelikli sıraya girersin",
                  "Sana uygun paket yapısı netleştiğinde doğrudan haber alırsın",
                  "Süreci plansız değil, hazırlıklı başlatırsın",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 text-[14px] leading-6 text-white/80"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#cfcbb8]" />
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
