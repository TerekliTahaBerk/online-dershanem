import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Medal,
  Sparkles,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

const stats = [
  { value: "Haftalık", label: "sınav ritmi" },
  { value: "Canlı", label: "analiz oturumu" },
  { value: "12 kişi", label: "maksimum grup" },
  { value: "Kişisel", label: "hata haritası" }
];

const rankingRows = [
  { rank: 1, name: "Eylül K.", city: "İstanbul", score: 94.2, net: 102.5, change: "+8.3" },
  { rank: 2, name: "Yiğit A.", city: "Ankara", score: 92.6, net: 99.0, change: "+6.1" },
  { rank: 3, name: "Melis T.", city: "İzmir", score: 90.8, net: 96.4, change: "+5.4" },
  { rank: 14, name: "Sena B.", city: "Bursa", score: 82.7, net: 84.0, change: "+11.2" }
];

const upcomingExams = [
  { name: "TYT Genel Deneme #09", date: "26 Nisan", day: "Pazar", participants: "842 öğrenci" },
  { name: "AYT SAY Deneme #05", date: "29 Nisan", day: "Çarşamba", participants: "412 öğrenci" },
  { name: "LGS Genel Deneme #07", date: "3 Mayıs", day: "Pazar", participants: "308 öğrenci" }
];

const gains = [
  "Her sınavdan sonra ders bazlı analiz raporu",
  "Canlı oturumda soru soru hata çözümü",
  "Ulusal sıralama ve kendi ilerleme grafiğin",
  "Bir sonraki hafta için net odak planı"
];

const steps = [
  {
    no: "01",
    title: "Denemeyi gerçek ritimde çöz",
    body: "Haftalık sınav bağlantın açılır. Gerçek süre, gerçek baskı, gerçek performans."
  },
  {
    no: "02",
    title: "Canlı analiz oturumuna gir",
    body: "Öğretmenler yanlış soruları nedenleriyle açıklar. Sadece cevap değil, düşünce akışı ele alınır."
  },
  {
    no: "03",
    title: "Hata haritanı gör",
    body: "Kavram eksiği, dikkat kaybı ve zaman yönetimi ayrı ayrı etiketlenir."
  },
  {
    no: "04",
    title: "Yeni haftaya veriyle başla",
    body: "Bir sonraki çalışma haftası deneme sonuçlarına göre net bir plana dönüşür."
  }
];

const packageCards = [
  {
    title: "TYT Kulübü",
    label: "Tüm bölümler",
    accent: "bg-[#0f766e]",
    details: ["Haftalık genel deneme", "Türkçe + Matematik + Fen + Sosyal analiz", "Canlı ortak oturum", "Kişisel hata raporu"]
  },
  {
    title: "AYT Kulübü",
    label: "Sayısal / EA / Sözel",
    accent: "bg-[#111827]",
    details: ["Branşa uygun haftalık sınav", "Alan bazlı öğretmen analizi", "Net yükselten konu listesi", "Öncelikli erken kayıt avantajı"]
  },
  {
    title: "LGS Kulübü",
    label: "Yeni nesil odaklı",
    accent: "bg-[#166534]",
    details: ["Haftalık LGS denemesi", "Yeni nesil soru stratejisi", "Veliye uygun takip çıktıları", "Mini grup analiz düzeni"]
  }
];

const comparisonRows = [
  { point: "Sınavı çözüp puanı görmek", classic: true, odk: true },
  { point: "Yanlış soruları öğretmenle analiz etmek", classic: false, odk: true },
  { point: "Hata türünü isimlendirmek", classic: false, odk: true },
  { point: "Konu odağını bir sonraki haftaya taşımak", classic: false, odk: true },
  { point: "Ulusal ritimde sürekli kalmak", classic: false, odk: true }
];

const faq = [
  {
    q: "Dershaneye kayıtlı olmam gerekiyor mu?",
    a: "Hayır. Deneme Kulübü bağımsız bir program olarak çalışıyor. Sadece bu yapının parçası olarak da kayıt olabilirsin."
  },
  {
    q: "Canlı analizde birebir soru sorabiliyor muyum?",
    a: "Evet. Küçük grup düzeni sayesinde her oturumda soru sorabileceğin bir alan oluyor. Amaç kalabalıkta kaybolmamak."
  },
  {
    q: "Denemeleri ne kadar sıklıkla yapıyorsunuz?",
    a: "Ritim haftalık kuruldu. Kulübün ana gücü de burada: performansı tek seferlik değil, düzenli veriyle takip ediyoruz."
  },
  {
    q: "Hata haritası ne işe yarıyor?",
    a: "Aynı yanlışı tekrar etmemen için. Yanlışın konu eksiğinden mi, dikkatten mi yoksa zaman baskısından mı kaynaklandığını ayrıştırıyoruz."
  }
];

export function ExamClubPageContent() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#0b1211] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(60,179,113,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_30%)]" />
        <div className="relative">
          <FadeIn>
            <div className="grid items-center gap-8 py-14 sm:py-18 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-24">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/78">
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
                  Sınavı çöz, hatanı gör, planını değiştir.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                  Deneme Kulübü sadece sınav yaptıran bir alan değil. Haftalık deneme, canlı analiz, ulusal sıralama ve kişisel
                  hata haritasını tek üründe topluyor.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <LeadFunnelTrigger
                    source="exam_club_hero_cta"
                    eventName="landing_cta_click"
                    className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b1211] transition hover:bg-white/92"
                    analyticsId="exam_club_hero_cta"
                  >
                    Ücretsiz ön kayıt
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </LeadFunnelTrigger>
                  <a
                    href="#sinav-akisi"
                    className="inline-flex items-center rounded-full border border-white/16 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/8"
                  >
                    Sistemi incele
                  </a>
                </div>

                <div className="mt-8 flex flex-wrap gap-3 text-xs text-white/65">
                  <span className="rounded-full border border-white/10 px-3 py-1.5">TYT</span>
                  <span className="rounded-full border border-white/10 px-3 py-1.5">AYT</span>
                  <span className="rounded-full border border-white/10 px-3 py-1.5">LGS</span>
                  <span className="rounded-full border border-white/10 px-3 py-1.5">Canlı analiz</span>
                </div>
              </div>

              <FadeIn delay={0.08}>
                <div className="grid gap-4">
                  <div className="rounded-[22px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Canlı sıra tablosu</p>
                        <h2 className="mt-1 text-lg font-semibold text-white">TYT Genel Deneme #09</h2>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                        Kayıt açık
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {rankingRows.map((row) => (
                        <div
                          key={`${row.rank}-${row.name}`}
                          className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-2xl border border-white/8 bg-black/10 px-3 py-3"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                            #{row.rank}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{row.name}</div>
                            <div className="text-xs text-white/55">{row.city}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-white">{row.net} net</div>
                            <div className="text-xs text-emerald-300">{row.change}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-[22px] border border-[#dfe7e4] bg-white p-5 text-ink shadow-soft">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Hata haritası</p>
                          <h3 className="mt-1 text-lg font-semibold">Son deneme özeti</h3>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                          <TrendingUp className="h-3.5 w-3.5" />
                          +9.4 net
                        </span>
                      </div>
                      <div className="mt-5 space-y-4">
                        {[
                          { label: "Fonksiyonlar", pct: 72, tone: "bg-[#0f766e]" },
                          { label: "Paragraf hızı", pct: 38, tone: "bg-[#1f2937]" },
                          { label: "Yeni nesil problem", pct: 54, tone: "bg-[#166534]" }
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

                    <div className="rounded-[22px] border border-[#dfe7e4] bg-[#f3f7f5] p-5 text-ink">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Bu hafta odak</p>
                      <ul className="mt-4 space-y-3">
                        {[
                          "Fonksiyon tekrar seti",
                          "Paragraf süre kontrolü",
                          "Hafta sonu genel deneme",
                          "Pazar analiz oturumu"
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
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="grid grid-cols-2 gap-x-0 divide-x divide-line sm:grid-cols-4">
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
            <span className="pd-eyebrow">Kulup Merkezi</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
              Haftalık ritim, görülebilir ilerleme, eksik kalmayan analiz.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
              Örnek tasarımdaki topluluk hissini koruduk; ürünün gerçek gücü olan canlı analiz ve hata raporlamasını da merkeze
              aldık.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <FadeIn delay={0.04}>
            <div className="overflow-hidden rounded-[20px] border border-line bg-white shadow-soft">
              <div className="flex items-center justify-between gap-4 border-b border-line bg-soft px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Haftalık sıralama</p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">TYT Genel Deneme #09</h3>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                  <Medal className="h-3.5 w-3.5" />
                  Canlı
                </span>
              </div>

              <div className="grid grid-cols-[56px_1.3fr_1fr_0.9fr] border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                <div>#</div>
                <div>Öğrenci</div>
                <div>Şehir</div>
                <div className="text-right">Net</div>
              </div>

              {rankingRows.map((row, index) => (
                <div
                  key={`${row.rank}-${row.name}-table`}
                  className={`grid grid-cols-[56px_1.3fr_1fr_0.9fr] items-center px-5 py-4 text-sm ${
                    index % 2 === 1 ? "bg-[#fbfcfb]" : "bg-white"
                  }`}
                >
                  <div>
                    <span className="inline-flex min-w-[36px] items-center justify-center rounded-full bg-soft px-2 py-1 text-xs font-semibold text-ink">
                      {row.rank}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-ink">{row.name}</div>
                    <div className="text-xs text-muted">Puan {row.score}</div>
                  </div>
                  <div className="text-muted">{row.city}</div>
                  <div className="text-right font-semibold text-ink">{row.net}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          <div className="grid gap-5">
            <FadeIn delay={0.08}>
              <div className="rounded-[20px] border border-line bg-white p-5 shadow-soft">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  <CalendarDays className="h-4 w-4 text-brand" />
                  Gelecek sınavlar
                </div>
                <div className="mt-5 space-y-4">
                  {upcomingExams.map((exam) => (
                    <div key={exam.name} className="flex items-center gap-4 rounded-2xl border border-line bg-[#fbfcfb] px-4 py-4">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-ink text-white">
                        <span className="text-xs font-semibold">{exam.date.split(" ")[0]}</span>
                        <span className="text-[10px] uppercase tracking-[0.08em] text-white/70">{exam.day.slice(0, 3)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{exam.name}</div>
                        <div className="mt-1 text-xs text-muted">{exam.participants}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.12}>
              <div className="rounded-[20px] border border-line bg-[#0f172a] p-5 text-white shadow-soft">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                  <BarChart3 className="h-4 w-4 text-emerald-300" />
                  Neler kazandırıyor
                </div>
                <ul className="mt-5 space-y-3">
                  {gains.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-white/82">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section id="sinav-akisi" className="bg-white py-14 sm:py-20">
        <FadeIn>
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <span className="pd-eyebrow justify-center">Sınav Akışı</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
              Düzensiz çalışma yerine ritmi belli bir sistem.
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
                      <Users className="h-4 w-4" />
                    ) : index === 2 ? (
                      <Target className="h-4 w-4" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
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
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">Klasik deneme değil.</h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                Soruyu çözüp nete bakmak tek başına bir gelişim sistemi kurmaz. Burada esas ürün, deneme sonrasında kurulan analiz
                düzeni.
              </p>

              <div className="mt-6 space-y-3">
                {comparisonRows.map((row) => (
                  <div key={row.point} className="grid grid-cols-[1.4fr_0.6fr_0.6fr] items-center gap-3 rounded-2xl bg-[#fbfcfb] px-4 py-3">
                    <div className="text-sm text-ink">{row.point}</div>
                    <div className="text-center text-xs font-semibold text-muted">{row.classic ? "Var" : "-"}</div>
                    <div className="text-center text-xs font-semibold text-emerald-700">{row.odk ? "odk." : "-"}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.06}>
            <div className="rounded-[20px] border border-line bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="pd-eyebrow">Paketler</span>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">TYT, AYT ve LGS için ayrı kurgular.</h2>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                  Erken kayıt
                </span>
              </div>

              <div className="mt-6 grid gap-4">
                {packageCards.map((card, index) => (
                  <div key={card.title} className="rounded-[18px] border border-line bg-[#fbfcfb] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${card.accent}`} />
                        <div>
                          <h3 className="text-lg font-semibold text-ink">{card.title}</h3>
                          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">{card.label}</p>
                        </div>
                      </div>
                      <LeadFunnelTrigger
                        source={`exam_club_package_${index + 1}`}
                        eventName="landing_cta_click"
                        className="inline-flex rounded-full border border-line-strong px-4 py-2 text-xs font-semibold text-ink transition hover:bg-ink hover:text-white"
                        analyticsId={`exam_club_package_${index + 1}`}
                      >
                        Ön kayıt
                      </LeadFunnelTrigger>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
                İlk denemeden önce ritme gir.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/72 sm:text-base">
                Listeye şimdiden girenler açılış duyurusunu önce alır, kontenjan ve erken kayıt avantajını kaçırmaz.
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
                <span className="inline-flex items-center rounded-full border border-white/12 px-4 py-3 text-xs font-medium text-white/60">
                  1 dakikadan kısa
                </span>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-white/6 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Ön kayıtta ne kazanırsın</p>
              <ul className="mt-5 space-y-3">
                {[
                  "Açılış tarihini herkesten önce öğrenirsin",
                  "Kulüp kontenjanında öncelik kazanırsın",
                  "Paket yapıları netleşince doğrudan bilgilendirilirsin",
                  "İlk hafta planlamasına hızlı giriş yaparsın"
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
