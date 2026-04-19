import type { Metadata } from "next";
import Image from "next/image";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  LineChart,
  ClipboardList,
  Users,
  Sparkles,
  Flame,
  Calendar,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Deneme Kulübü — odk.",
  description:
    "TYT, AYT ve LGS öğrencileri için haftalık deneme, canlı analiz seansı, kişisel hata haritası ve net artış koçluğu. Sadece soru değil, çözüm.",
  alternates: {
    canonical: "/deneme-kulubu/",
  },
  openGraph: {
    title: "Online Deneme Kulübü | odk.",
    description:
      "Sadece deneme değil; analiz, strateji ve koçlukla net artışını garantile. TYT, AYT ve LGS için.",
    url: `${siteUrl}/deneme-kulubu/`,
  },
};

const packages = [
  {
    exam: "TYT",
    tag: "Tüm bölümler",
    badge: "bg-ink text-white",
    ring: "border-line",
    subjects: "Türkçe · Matematik · Fen · Sosyal",
    highlight: false,
    features: [
      "Haftalık TYT denemesi — gerçek sınav koşulları",
      "Canlı analiz seansı: yanlışını öğretmenle çöz",
      "Kişisel hata haritası + konu raporu",
      "Haftalık çalışma planı güncellemesi",
      "Grup: max 12 kişi",
    ],
  },
  {
    exam: "AYT",
    tag: "En çok tercih edilen",
    badge: "bg-pine text-white",
    ring: "border-brand/40 ring-1 ring-brand/20",
    subjects: "Sayısal · Eşit Ağırlık · Sözel",
    highlight: true,
    features: [
      "Haftalık AYT denemesi — branşına göre",
      "Canlı analiz seansı: yanlışını öğretmenle çöz",
      "Kişisel hata haritası + konu raporu",
      "Sayısal / EA / Sözel bazlı strateji seansı",
      "Grup: max 12 kişi",
    ],
  },
  {
    exam: "LGS",
    tag: "Yeni nesil odaklı",
    badge: "bg-brand text-white",
    ring: "border-line",
    subjects: "Matematik · Fen · Türkçe · Sosyal",
    highlight: false,
    features: [
      "Haftalık LGS denemesi",
      "Canlı analiz seansı: yanlışını öğretmenle çöz",
      "Yeni nesil soru stratejisi",
      "Kişisel hata haritası + konu raporu",
      "Grup: max 12 kişi",
    ],
  },
];

const comparison = [
  { point: "Deneme çöz", classic: true, odk: true },
  { point: "Puanı gör", classic: true, odk: true },
  { point: "Yanlış sorunu öğretmenle birebir çöz", classic: false, odk: true },
  { point: "Hata türü analizi (kavram / dikkat / zaman)", classic: false, odk: true },
  { point: "Kişisel zayıf konu haritası", classic: false, odk: true },
  { point: "Haftalık güncellenen çalışma planı", classic: false, odk: true },
  { point: "12 kişilik grupta soru sorma hakkı", classic: false, odk: true },
];

const weekdays = [
  { day: "Pzt", label: "Hazırlık", body: "Hafta planına göre konu çalışması." },
  { day: "Çrş", label: "Mini tekrar", body: "Geçen denemenin zayıf konu seti." },
  { day: "Cmt", label: "Deneme", body: "Gerçek koşullarda tam süreli deneme." },
  { day: "Paz", label: "Canlı analiz", body: "Öğretmenle seans + yeni plan." },
];

const faq = [
  {
    q: "Denemeyi ne zaman çözeceğim?",
    a: "Her hafta belirli bir günde, gerçek sınav saatinde online olarak başlıyoruz. Süreyi kendi başına tutarsın; bitince sistem otomatik kapanır.",
  },
  {
    q: "Canlı analiz seansında ne oluyor?",
    a: "Denemenin ardından öğretmenlerinle Zoom/Meet üzerinden buluşuyoruz. Yanlış yaptığın soruları tek tek geçiyoruz; sadece cevap değil, hangi düşünce adımında hata yaptığını konuşuyoruz.",
  },
  {
    q: "Hata haritası nedir?",
    a: "Her denemen sonrası konularına göre çıkardığımız görsel bir rapor. Kavram eksiği, dikkatsizlik ve zaman yönetimi ayrıştırılıyor. Böylece bir sonraki haftanın neye ayrılacağı netleşiyor.",
  },
  {
    q: "Dershaneye kayıtlı olmam gerekiyor mu?",
    a: "Hayır. Online Deneme Kulübü bağımsız bir programdır. Başka bir kurumdan devam eden öğrenciler de yalnızca kulübe katılabilir.",
  },
  {
    q: "Ön kaydın avantajı ne?",
    a: "Açılış fiyatına ek %20 erken kayıt indirimi, garantili kontenjan ve ilk analiz seansına ücretsiz katılım hakkı.",
  },
];

export default function DenemeKulubuPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-line bg-white">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_-5%_0%,_#d4ede3,_transparent_60%),radial-gradient(ellipse_55%_45%_at_105%_10%,_#e3f2ec,_transparent_55%)]" />
          <Container>
            <div className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-24">
              <FadeIn>
                <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-mint/30 px-3.5 py-1.5 text-xs font-semibold text-pine">
                  <Sparkles className="h-3.5 w-3.5" />
                  TYT · AYT · LGS — Haftalık Deneme + Canlı Analiz
                </div>
                <Image
                  src="/odklogo2.jpeg"
                  alt="Online Deneme Kulübü"
                  width={320}
                  height={76}
                  className="mt-6 h-9 w-auto object-contain"
                />
                <h1 className="mt-6 text-4xl font-bold leading-[1.12] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
                  Denemeyi çözdükten sonra
                  <br className="hidden sm:block" />{" "}
                  <span className="text-brand">ne yapıyorsun?</span>
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                  Çoğu öğrenci denemeyi çözer, puanına bakar, devam eder. Hata nerede, neden tekrar ediyor — cevabı yoktur. odk. tam olarak bu boşluğu kapatıyor: deneme, canlı analiz, hata haritası, yeni plan.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <LeadFunnelTrigger
                    source="odk_hero_cta"
                    eventName="landing_cta_click"
                    className="inline-flex items-center gap-2 rounded-full bg-anchor px-7 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(9,20,19,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-pine"
                    analyticsId="odk_hero_cta"
                  >
                    Ön Kayıt Yap — Ücretsiz
                    <ArrowRight className="h-4 w-4" />
                  </LeadFunnelTrigger>
                  <a
                    href="#nasil-calisir"
                    className="inline-flex items-center justify-center rounded-full border border-line-strong bg-white px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-soft"
                  >
                    Nasıl çalışır?
                  </a>
                </div>
                <p className="mt-3 text-xs text-muted/80">
                  Yakında açılıyor · Ön kayıt bırakanlar için %20 erken kayıt indirimi
                </p>
              </FadeIn>

              {/* Visual — hata haritası önizleme */}
              <FadeIn delay={0.15}>
                <div className="relative mx-auto w-full max-w-md lg:ml-auto">
                  <div className="absolute -left-3 -top-3 h-24 w-24 rounded-full bg-mint/40 blur-2xl" />
                  <div className="absolute -bottom-4 -right-4 h-28 w-28 rounded-full bg-brand/20 blur-2xl" />
                  <div className="relative rounded-3xl border border-line bg-white p-6 shadow-soft">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/70">
                          Hafta 4 · Hata haritası
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink">Ayşe · TYT</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-mint/50 px-2.5 py-1 text-[11px] font-bold text-pine">
                        <TrendingUp className="h-3 w-3" /> +14 net
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        { topic: "Paragraf — anlam", type: "Dikkat", pct: 22, color: "bg-amber-400" },
                        { topic: "Fonksiyonlar", type: "Kavram", pct: 58, color: "bg-brand" },
                        { topic: "Basınç", type: "Kavram", pct: 40, color: "bg-brand" },
                        { topic: "Deneme-paragraf", type: "Zaman", pct: 18, color: "bg-violet-400" },
                      ].map((row) => (
                        <div key={row.topic}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-ink">{row.topic}</span>
                            <span className="text-muted/70">{row.type}</span>
                          </div>
                          <div className="mt-1.5 h-2 rounded-full bg-soft">
                            <div
                              className={`h-full rounded-full ${row.color}`}
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-2xl border border-line-soft bg-paper p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                        Önümüzdeki hafta odak
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink">
                        Fonksiyonlar (kavram) · Paragraf stratejisi (zaman yönetimi)
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </Container>
        </section>

        {/* ── Stat strip ───────────────────────────────────────────────── */}
        <section className="border-b border-line bg-paper">
          <Container>
            <div className="grid grid-cols-2 gap-0 divide-x divide-line py-8 sm:grid-cols-4 sm:py-10">
              {[
                { v: "Haftalık", l: "deneme + analiz" },
                { v: "Max 12", l: "kişilik grup" },
                { v: "1:1", l: "hata haritası" },
                { v: "4 adım", l: "sabit döngü" },
              ].map((s) => (
                <div key={s.l} className="px-4 text-center sm:px-6">
                  <p className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{s.v}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted/70 sm:text-xs">
                    {s.l}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ── Manifesto ────────────────────────────────────────────────── */}
        <section className="border-b border-line bg-white">
          <Container>
            <div className="py-14 sm:py-20">
              <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
                <FadeIn>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
                    Neden var olduk
                  </p>
                </FadeIn>
                <FadeIn delay={0.05}>
                  <div className="space-y-5 text-base leading-relaxed text-muted sm:text-lg">
                    <p>
                      Türkiye&apos;de deneme pazarı büyük. Herkes sana soru veriyor. Kitap, pdf, platform — binlerce soru, hiç analiz yok. Denemeyi bitiriyorsun, puana bakıyorsun, hayatına devam ediyorsun. Bir sonraki denemede aynı hataları yapıyorsun.
                    </p>
                    <p>
                      Sorun soru sayısı değil. Sorun, o yanlışın{" "}
                      <strong className="text-ink">neden yanlış</strong> olduğunu bilmemek. Kavram mı eksik, dikkatsizlik mi, zaman mı bitti? Bu soruyu cevaplamadan soru çözmek sadece hataları pekiştirir.
                    </p>
                    <p className="font-medium text-ink">
                      odk. bunu değiştiriyor. Deneme araç. Asıl iş analiz.
                    </p>
                  </div>
                </FadeIn>
              </div>
            </div>
          </Container>
        </section>

        {/* ── Comparison ───────────────────────────────────────────────── */}
        <section className="border-b border-line bg-paper">
          <Container>
            <div className="py-14 sm:py-20">
              <FadeIn>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
                  Fark nerede?
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  Klasik deneme vs. odk.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                  Aynı denemeyi çözebilirsin. Ama sonrasında olan şey, net artışını belirler.
                </p>
              </FadeIn>

              <FadeIn delay={0.08}>
                <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
                  <div className="grid grid-cols-[1.6fr_1fr_1fr] border-b border-line bg-soft text-xs font-semibold uppercase tracking-[0.12em] text-muted/80">
                    <div className="px-5 py-3.5 sm:px-6">Ne yapılıyor?</div>
                    <div className="px-3 py-3.5 text-center sm:px-5">Klasik deneme</div>
                    <div className="px-3 py-3.5 text-center text-pine sm:px-5">odk.</div>
                  </div>
                  {comparison.map((row, i) => (
                    <div
                      key={row.point}
                      className={`grid grid-cols-[1.6fr_1fr_1fr] items-center ${
                        i % 2 === 1 ? "bg-paper/60" : ""
                      }`}
                    >
                      <div className="px-5 py-3.5 text-sm text-ink sm:px-6">{row.point}</div>
                      <div className="flex justify-center px-3 py-3.5 sm:px-5">
                        {row.classic ? (
                          <CheckCircle2 className="h-5 w-5 text-muted/50" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted/30" />
                        )}
                      </div>
                      <div className="flex justify-center px-3 py-3.5 sm:px-5">
                        <CheckCircle2 className="h-5 w-5 text-brand" />
                      </div>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </Container>
        </section>

        {/* ── Nasıl çalışır ────────────────────────────────────────────── */}
        <section id="nasil-calisir" className="border-b border-line bg-white">
          <Container>
            <div className="py-14 sm:py-20">
              <FadeIn>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
                  Her hafta aynı döngü
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  Dört adım. Her tur biraz daha az hata.
                </h2>
              </FadeIn>

              <div className="mt-10 grid gap-4 md:grid-cols-2">
                {[
                  {
                    n: "01",
                    icon: Clock,
                    title: "Denemeyi bağımsız çöz",
                    body: "Belirli günde, gerçek sınav koşullarında. Telefon yok, yardım yok. Süreyi kendin yönetirsin.",
                  },
                  {
                    n: "02",
                    icon: Users,
                    title: "Canlı analiz seansına katıl",
                    body: "Denemenin hemen ardından öğretmenlerimizle buluşursun. Hangi soruyu neden yanlış yaptığını tek tek geçeriz. Max 12 kişilik grupta — kaybolmazsın.",
                  },
                  {
                    n: "03",
                    icon: ClipboardList,
                    title: "Hata haritanı al",
                    body: "Kavram hatası mı, dikkatsizlik mi, zaman yönetimi mi? Hatanın türü belirlenmeden tedavi olmaz. Her denemeden sonra kişisel haritanı çıkarırız.",
                  },
                  {
                    n: "04",
                    icon: Target,
                    title: "Planın güncellenir",
                    body: "Biriken veriye göre önümüzdeki haftanın odak noktaları netleşir. Sezgiyle değil, sayıyla.",
                  },
                ].map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <FadeIn key={step.n} delay={i * 0.06}>
                      <article className="flex h-full gap-5 rounded-3xl border border-line bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(9,20,19,0.14)]">
                        <div className="flex flex-col items-start gap-3">
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/20 bg-mint/30 text-brand">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-2xl font-black text-line sm:text-3xl">{step.n}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-ink sm:text-lg">
                            {step.title}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                        </div>
                      </article>
                    </FadeIn>
                  );
                })}
              </div>
            </div>
          </Container>
        </section>

        {/* ── Haftalık akış ────────────────────────────────────────────── */}
        <section className="border-b border-line bg-paper">
          <Container>
            <div className="py-14 sm:py-20">
              <FadeIn>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
                      Haftalık akış
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                      Pazartesiden Pazara, sabit ritim.
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-white px-3.5 py-1.5 text-xs font-medium text-muted">
                    <Calendar className="h-3.5 w-3.5 text-brand" />
                    Sabit program, kaybolan hafta yok
                  </span>
                </div>
              </FadeIn>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {weekdays.map((d, i) => (
                  <FadeIn key={d.day} delay={i * 0.06}>
                    <article className="relative flex h-full flex-col rounded-3xl border border-line bg-white p-5 shadow-soft">
                      <span className="inline-flex w-fit rounded-full bg-anchor px-2.5 py-1 text-[11px] font-bold tracking-wider text-mint">
                        {d.day}
                      </span>
                      <h3 className="mt-3 text-base font-semibold text-ink">{d.label}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{d.body}</p>
                    </article>
                  </FadeIn>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* ── Koç sözü ─────────────────────────────────────────────────── */}
        <section className="border-b border-line bg-white">
          <Container>
            <FadeIn>
              <div className="grid gap-8 py-14 sm:py-20 lg:grid-cols-[1fr_1.6fr] lg:items-center">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 -z-10 rounded-3xl bg-mint/30 blur-2xl" />
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border border-brand/20 bg-paper sm:h-40 sm:w-40">
                    <LineChart className="h-14 w-14 text-brand sm:h-16 sm:w-16" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
                    Koç yaklaşımımız
                  </p>
                  <blockquote className="mt-3 text-xl font-medium leading-snug text-ink sm:text-2xl">
                    &ldquo;Öğrencinin yanlışını silmek değil, o yanlışın kaynağını bulmak işimiz. Net artışı — puan gözlemekle değil, hata desenini kırmakla gelir.&rdquo;
                  </blockquote>
                  <p className="mt-4 text-sm text-muted">
                    odk. koçluk ekibi · TYT / AYT / LGS
                  </p>
                </div>
              </div>
            </FadeIn>
          </Container>
        </section>

        {/* ── Paketler ─────────────────────────────────────────────────── */}
        <section className="border-b border-line bg-paper">
          <Container>
            <div className="py-14 sm:py-20">
              <FadeIn>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
                      Paketler
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                      TYT · AYT · LGS
                    </h2>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
                      Paketler hazırlanıyor. Ön kayıt bırakırsan açılışta önce sen haberdar olursun — ve erken kayıt fiyatından yararlanırsın.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                    Yakında açılıyor
                  </span>
                </div>
              </FadeIn>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {packages.map((pkg, i) => (
                  <FadeIn key={pkg.exam} delay={i * 0.07}>
                    <article
                      className={`relative flex h-full flex-col rounded-3xl border bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(9,20,19,0.16)] ${pkg.ring}`}
                    >
                      {pkg.highlight && (
                        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-pine px-3 py-1 text-[11px] font-bold text-white shadow-soft">
                          <Flame className="h-3 w-3" /> En çok tercih edilen
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${pkg.badge}`}>
                          {pkg.exam}
                        </span>
                        <span className="text-[11px] font-medium text-muted/70">{pkg.tag}</span>
                      </div>
                      <p className="mt-3 text-xs font-medium text-muted/70">{pkg.subjects}</p>

                      <div className="mt-4 rounded-2xl border border-line-soft bg-paper px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
                          Ön kayıt avantajı
                        </p>
                        <p className="mt-1 text-sm font-medium text-ink">
                          %20 erken kayıt indirimi + kontenjan garantisi
                        </p>
                      </div>

                      <ul className="mt-5 flex-1 space-y-2.5">
                        {pkg.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <LeadFunnelTrigger
                        source={`odk_package_${pkg.exam.toLowerCase()}_notify`}
                        eventName="landing_cta_click"
                        className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-xs font-semibold transition ${
                          pkg.highlight
                            ? "bg-anchor text-white hover:bg-pine"
                            : "border border-line-strong text-ink hover:border-anchor hover:bg-anchor hover:text-white"
                        }`}
                        analyticsId={`odk_package_${pkg.exam.toLowerCase()}_notify`}
                      >
                        Açılınca haber ver
                      </LeadFunnelTrigger>
                    </article>
                  </FadeIn>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="border-b border-line bg-white">
          <Container>
            <div className="py-14 sm:py-20">
              <FadeIn>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
                  Sık sorulanlar
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  Merak ettiğin her şey.
                </h2>
              </FadeIn>

              <div className="mt-8 divide-y divide-line rounded-3xl border border-line bg-paper/40">
                {faq.map((item, i) => (
                  <FadeIn key={item.q} delay={i * 0.04}>
                    <details className="group px-5 py-5 sm:px-6">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-ink">
                        {item.q}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-brand transition group-open:rotate-45">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </span>
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
                    </details>
                  </FadeIn>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-anchor">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_20%,_rgba(176,228,204,0.15),_transparent_60%),radial-gradient(ellipse_40%_40%_at_10%_100%,_rgba(64,138,113,0.25),_transparent_60%)]" />
          <Container>
            <FadeIn delay={0.05}>
              <div className="relative py-16 sm:py-24">
                <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
                  <div>
                    <Image
                      src="/odklogo1.png"
                      alt="odk."
                      width={80}
                      height={80}
                      className="h-14 w-14 rounded-xl bg-white object-contain p-1.5"
                    />
                    <h2 className="mt-6 max-w-xl text-3xl font-bold leading-tight text-white sm:text-4xl">
                      İlk denemenden önce başla.
                    </h2>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-mint/80 sm:text-base">
                      Paketler henüz açılmadı ama liste dolmaya başladı. Ön kayıt bırakırsan fiyat avantajı, kontenjan garantisi ve öncelikli bildirim senindir.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <LeadFunnelTrigger
                        source="odk_final_cta"
                        eventName="landing_cta_click"
                        className="inline-flex items-center gap-2 rounded-full bg-mint px-8 py-3.5 text-sm font-semibold text-pine transition hover:bg-white hover:text-anchor"
                        analyticsId="odk_final_cta"
                      >
                        Ön Kayıt Yap — Ücretsiz
                        <ArrowRight className="h-4 w-4" />
                      </LeadFunnelTrigger>
                      <span className="text-xs text-mint/70">1 dakikadan kısa · Ücretsiz</span>
                    </div>
                  </div>

                  <ul className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    {[
                      "%20 erken kayıt indirimi",
                      "Kontenjan garantisi",
                      "İlk analiz seansı ücretsiz",
                      "Açılış tarihi belli olunca önce sen haberdar ol",
                    ].map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-mint/90">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </FadeIn>
          </Container>
        </section>
      </main>
      <MultiStepLeadForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
