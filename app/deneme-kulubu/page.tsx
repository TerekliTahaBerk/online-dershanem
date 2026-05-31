import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  LineChart,
  ListChecks,
  PieChart,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Target,
  TimerReset,
  TrendingUp,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { FadeIn } from "@/components/ui/fade-in";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title:
    "Deneme Kulubu - TYT, AYT ve LGS icin dijital deneme ve kazanim analizi | odk.",
  description:
    "Dijital deneme deneyimi, kazanim bazli analiz ve veli takip sistemiyle TYT, AYT ve LGS icin kurulmus haftalik ritim. Tum ODK paketlerini tek sayfada karsilastir ve hemen basla.",
  alternates: { canonical: "/deneme-kulubu/" },
  openGraph: {
    title: "Deneme Kulubu | odk.",
    description:
      "Dijital deneme, kazanim analizi ve veli paneli. TYT, AYT ve LGS icin kurulmus haftalik ritim.",
    url: `${siteUrl}/deneme-kulubu/`,
  },
};

export const revalidate = 300;

const priceFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

function formatDuration(days: number | null): string {
  if (!days) return "Süresiz erişim";
  if (days % 30 === 0) return `${days / 30} ay erişim`;
  return `${days} gün erişim`;
}

const heroStats = [
  { value: "TYT · AYT · LGS", label: "kapsama" },
  { value: "Haftada 1", label: "deneme ritmi" },
  { value: "Kazanım", label: "bazlı analiz" },
  { value: "Veli", label: "takip paneli" },
];

const flow = [
  {
    title: "Denemeyi aç",
    body: "Aktif denemen panelde hazır bekler. Tek tıkla başlatırsın; süre, gerçek sınav koşulunda işler.",
  },
  {
    title: "PDF kitapçık üzerinden çöz",
    body: "Soruları okunaklı PDF kitapçıktan çözer, cevaplarını dijital optikten anında işaretlersin.",
  },
  {
    title: "Sonucu anında gör",
    body: "Süre dolar dolmaz net, doğru, yanlış ve boş dağılımın saniyeler içinde önüne düşer.",
  },
  {
    title: "Kazanım analizini incele",
    body: "Ders, konu ve kazanım bazlı eksiklerini detaylı raporda görür, dağınık çalışmayı bırakırsın.",
  },
  {
    title: "Bir sonraki haftaya plan kur",
    body: "Sistem zayıf alanlarına göre odak listesi çıkarır. Hangi konuya çalışacağın tartışma konusu olmaz.",
  },
];

const digitalExperience = [
  { icon: Smartphone, title: "Mobil, tablet, masaüstü", body: "Hangi cihazda çözersen çöz, optik form ve PDF kitapçık ekrana göre yeniden hizalanır." },
  { icon: TimerReset, title: "Gerçek sınav süresi", body: "Süre gerçek sınavla birebir aynı işler. Geri sayım, denemeye ciddi bir prova hissi katar." },
  { icon: ShieldCheck, title: "Sekme & çıkış takibi", body: "Sınav sırasında sayfa terki ve şüpheli aktivite kayıt altına alınır; sonuçlar daha güvenilir okunur." },
  { icon: FileText, title: "Otomatik kayıt", body: "Her işaretleme arka planda otomatik kaydedilir. Bağlantı kopsa bile çözümün korunur." },
];

const analyticsDimensions = [
  { icon: PieChart, title: "Ders bazlı dağılım", body: "Hangi dersten kaç net? Branş bazlı doğru-yanlış-boş dağılımını tek bakışta görürsün." },
  { icon: ListChecks, title: "Konu bazlı eksik haritası", body: "Her dersin altındaki konularda tekrarlayan boşluklar net listelenir; kör nokta kalmaz." },
  { icon: Target, title: "Kazanım bazlı detay", body: "Müfredattaki her kazanım için ayrı performans görünür. Asıl boşluklar burada ortaya çıkar." },
  { icon: LineChart, title: "Net gelişim grafiği", body: "Hafta hafta net değişimini, en güçlü ve en kırılgan branşını grafik üzerinden takip edersin." },
];

const studentBenefits = [
  { icon: TrendingUp, title: "Düzenli takip", body: "Her hafta aynı saatte deneme. Süreklilik dağınıklığın panzehri." },
  { icon: ShieldCheck, title: "Gerçek sınav deneyimi", body: "Süre, kitapçık ve optik form üçlüsü prova hissi verir." },
  { icon: BarChart3, title: "Detaylı analiz", body: "Sadece net değil; davranış, hız ve dikkat birlikte yorumlanır." },
  { icon: Smartphone, title: "Mobil erişim", body: "Telefonu olan her öğrenci sınava ve raporlara her yerden ulaşır." },
  { icon: TimerReset, title: "Hızlı sonuç", body: "Denemeyi bitirdiğin an raporun açılır. Beklemek yok." },
  { icon: ListChecks, title: "Eksik konu takibi", body: "Tekrarlayan eksikler zamanla saydam hâle gelir." },
  { icon: Target, title: "Gelişim odaklı yapı", body: "Amaç çok deneme çözmek değil; doğru yere zaman ayırmak." },
  { icon: Sparkles, title: "Sade panel deneyimi", body: "Karmaşık menü yok; öğrenci ne yapması gerektiğini anlayarak girer." },
];

const parentFeatures = [
  { icon: Eye, title: "Çocuğunun denemelerini izle", body: "Hangi denemeye girdi, ne kadar süre ayırdı, hangi raporlar oluştu — tek panelde net biçimde görürsün." },
  { icon: BarChart3, title: "Başarı analizini birlikte oku", body: "Veli paneli yalnız puan göstermez; güçlü, zayıf ve gelişen alanları sade dille anlatır." },
  { icon: ListChecks, title: "Eksik kazanım listesi", body: "Çocuğunun hangi konuya neden takıldığını gerçek veriyle görürsün; tahmin yürütmek bitiyor." },
  { icon: Bell, title: "Düzenli raporlama", body: "Yeni deneme, yeni rapor ve önemli gelişmeler için anlamlı bildirimler alırsın — gürültü değil." },
];

const comparisonRows = [
  { point: "Dijital deneme deneyimi", regular: "Sınırlı", odk: "Tam" },
  { point: "Anlık değerlendirme", regular: "—", odk: "Var" },
  { point: "Kazanım bazlı analiz", regular: "—", odk: "Var" },
  { point: "Net gelişim grafiği", regular: "—", odk: "Var" },
  { point: "Veli takip paneli", regular: "—", odk: "Var" },
  { point: "Mobil & tablet uyum", regular: "Kısmi", odk: "Tam" },
];

const faq = [
  { q: "Denemeler nasıl çözülüyor?", a: "Sorular okunaklı PDF kitapçık üzerinden çözülür; cevaplar dijital optik form üzerinden anında işaretlenir. Süre, gerçek sınavla aynı şekilde işler." },
  { q: "Mobilden de çözebilir miyim?", a: "Evet. PDF kitapçık ve optik form mobil ve tablet ekranına göre yeniden dizilir. Telefondan rahatça hem soruyu okuyup hem optiği işaretleyebilirsin." },
  { q: "Sonuçlar ne zaman açıklanıyor?", a: "Süre bitip denemeyi teslim ettiğin an net, doğru-yanlış-boş dağılımı ve ilk rapor anında ekrana düşer. Kazanım analizini de aynı oturumda görürsün." },
  { q: "Kazanım analizi tam olarak ne anlatıyor?", a: "Müfredattaki her kazanım için ayrı performans çıkarılır. ‘Matematik zayıf’ değil; ‘Fonksiyonlarda dönüşüm kazanımı eksik’ düzeyinde net bilgi alırsın." },
  { q: "Veli sistemi var mı?", a: "Var. Veli paneli, çocuğunun deneme aktivitesini, gelişim grafiğini ve eksik kazanım listesini sade bir dille sunar; öğrencinin günlük çalışmasına karışmadan takip etmeyi mümkün kılar." },
  { q: "PDF üzerinden çözmek dijital deneme deneyimini bozar mı?", a: "Tersi. Soru okuma alışkanlığı gerçek sınavla aynı kalır; optik form ise dijitalde kaldığı için anlık değerlendirme, kazanım analizi ve gelişim takibi mümkün olur." },
  { q: "Hangi sınav türlerini destekliyor?", a: "Şu an TYT, AYT ve LGS için aktif paketler bulunuyor. Sınava göre içerik, süre ve analiz yapısı sınavın gerçek formatına uygun şekilde kurulu." },
  { q: "İade politikası var mı?", a: "Henüz hiç deneme başlatmadıysan, satın alma tarihinden itibaren 14 gün içinde tam iade hakkın bulunur. Detaylar /iade sayfasında." },
];

function AnalyticsMock() {
  const weeks = [78, 84, 91, 88, 96, 102, 108, 115];
  const max = Math.max(...weeks);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[20px] border border-[var(--od-line)] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--od-olive)]">Net gelişim</div>
            <div className="mt-2 font-display text-[24px] leading-tight tracking-tight text-[var(--od-ink)]">Son 8 hafta TYT neti</div>
          </div>
          <div className="rounded-full bg-[var(--od-yellow-soft)] px-3 py-1 text-[11.5px] font-semibold text-[#6B5310]">+37 net</div>
        </div>
        <div className="mt-6 grid h-44 grid-cols-8 items-end gap-2">
          {weeks.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className={`w-full rounded-t-md ${i === weeks.length - 1 ? "bg-[var(--od-olive)]" : "bg-[var(--od-olive)]/25"}`}
                style={{ height: `${(v / max) * 100}%` }}
                aria-hidden
              />
              <span className="text-[10.5px] text-[#8B8B7E]">H{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--od-line)] pt-5 text-[12px]">
          <div>
            <div className="text-[#8B8B7E]">Ortalama</div>
            <div className="mt-1 font-display text-[18px] text-[var(--od-ink)]">95.2</div>
          </div>
          <div>
            <div className="text-[#8B8B7E]">En yüksek</div>
            <div className="mt-1 font-display text-[18px] text-[var(--od-ink)]">115</div>
          </div>
          <div>
            <div className="text-[#8B8B7E]">Trend</div>
            <div className="mt-1 inline-flex items-center gap-1 font-display text-[18px] text-[var(--od-olive)]">
              <TrendingUp className="h-4 w-4" /> Yükseliş
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-[var(--od-line)] bg-[var(--od-cream-2)] p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--od-olive)]">Kazanım bazlı</div>
        <div className="mt-2 font-display text-[22px] leading-tight tracking-tight text-[var(--od-ink)]">Bu haftaki zayıf alanlar</div>
        <ul className="mt-5 space-y-3">
          {[
            { name: "Türev — zincir kuralı", pct: 32, color: "#C45C3F" },
            { name: "Paragrafta anlam akışı", pct: 48, color: "#B9803A" },
            { name: "Periyodik sistem", pct: 55, color: "#94843F" },
            { name: "Hareket — bağıl hareket", pct: 64, color: "#6F8458" },
          ].map((row) => (
            <li key={row.name} className="rounded-xl border border-[var(--od-line)] bg-white px-4 py-3">
              <div className="flex items-center justify-between text-[13px] text-[var(--od-ink)]">
                <span className="font-medium">{row.name}</span>
                <span className="text-[12px] text-[var(--od-ink-soft)]">%{row.pct}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--od-cream-2)]">
                <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default async function DenemeKulubuPage() {
  // Phase 2 / Session 19 — defensive fallback for static prerender.
  // If the build environment can't reach the DB (e.g. CI without secrets),
  // render with an empty package list rather than crashing the build.
  // ISR (`revalidate = 300`) re-fetches once production is live.
  let packages: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    priceCents: number;
    originalPriceCents: number | null;
    durationDays: number | null;
    _count: { packageExams: number };
  }> = [];
  try {
    packages = await prisma.odkPackage.findMany({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        priceCents: true,
        originalPriceCents: true,
        durationDays: true,
        _count: { select: { packageExams: true } },
      },
    });
  } catch (err) {
    console.warn("[deneme-kulubu] package list query failed", err);
    packages = [];
  }

  const highlightId =
    packages.length > 0
      ? packages.reduce((a, b) => (a.priceCents >= b.priceCents ? a : b)).id
      : null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "ODK Deneme Kulübü",
    description:
      "TYT, AYT ve LGS için dijital deneme deneyimi, kazanım bazlı analiz, gelişim grafiği ve veli takip paneli.",
    brand: { "@type": "Brand", name: "odk." },
    offers:
      packages.length > 0
        ? packages.map((p) => ({
            "@type": "Offer",
            name: p.title,
            price: (p.priceCents / 100).toFixed(2),
            priceCurrency: "TRY",
            url: `${siteUrl}/odk-paketleri/${p.slug}/satin-al`,
            availability: "https://schema.org/InStock",
          }))
        : undefined,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* 1. HERO */}
        <section className="relative overflow-hidden border-b border-[var(--od-line)]">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <Image
              src="/v991-nt-35.jpg"
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover opacity-[0.14] mix-blend-multiply"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,253,245,0.55) 0%, rgba(255,253,245,0.92) 70%, var(--od-cream) 100%)",
              }}
            />
          </div>

          <div className="mx-auto grid max-w-6xl gap-12 px-5 pt-28 pb-16 sm:pt-36 sm:pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--od-line)] bg-white/70 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[var(--od-olive)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--od-olive)]" />
                Deneme Kulübü
              </span>
              <h1 className="mt-5 font-display text-[40px] font-normal leading-[1.04] tracking-tight text-[var(--od-ink)] sm:text-[64px]">
                Deneme bittiğinde{" "}
                <em className="italic text-[var(--od-olive)]">çalışma başlasın</em>.
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-7 text-[var(--od-ink-soft)]">
                ODK Deneme Kulübü; TYT, AYT ve LGS için dijital deneme deneyimini, kazanım bazlı analizi ve veli takip panelini tek bir sistemde birleştirir. Amaç çok deneme çözmek değil; doğru yere zaman ayırmak.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="#paketler"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--od-ink)] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-black"
                >
                  Paketleri incele
                  <ArrowRight size={15} strokeWidth={1.8} />
                </Link>
                <LeadFunnelTrigger
                  source="exam_club_hero_secondary"
                  eventName="landing_cta_click"
                  analyticsId="exam_club_hero_secondary"
                  className="inline-flex items-center rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-[14px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
                >
                  Ön kayıt bırak
                </LeadFunnelTrigger>
              </div>

              <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {heroStats.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-[var(--od-line)] bg-white/80 px-4 py-3">
                    <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#8B8B7E]">{s.label}</dt>
                    <dd className="mt-1 font-display text-[16px] leading-tight text-[var(--od-ink)]">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <FadeIn delay={0.05}>
              <div className="relative">
                <div aria-hidden className="absolute -inset-6 -z-10 rounded-[32px] bg-[var(--od-yellow-soft)] opacity-50 blur-2xl" />
                <div className="rounded-[24px] border border-[var(--od-line)] bg-white p-5 shadow-[0_36px_80px_-40px_rgba(20,20,15,0.35)]">
                  <div className="flex items-center justify-between border-b border-[var(--od-line)] pb-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--od-ink)] text-white">
                        <BarChart3 className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-[12.5px] font-semibold text-[var(--od-ink)]">TYT Denemesi · Hafta 14</div>
                        <div className="text-[11px] text-[#8B8B7E]">Sonuç raporu</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-[var(--od-yellow-soft)] px-2.5 py-1 text-[10.5px] font-semibold text-[#6B5310]">Yayında</span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      { l: "Net", v: "108.5", t: "+7.5" },
                      { l: "Doğru", v: "118", t: "+8" },
                      { l: "Süre", v: "132'", t: "−3'" },
                    ].map((s) => (
                      <div key={s.l} className="rounded-xl border border-[var(--od-line)] bg-[var(--od-cream)] px-3 py-3">
                        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#8B8B7E]">{s.l}</div>
                        <div className="mt-1 font-display text-[20px] leading-none text-[var(--od-ink)]">{s.v}</div>
                        <div className="mt-1 text-[10.5px] text-[var(--od-olive)]">{s.t}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl border border-[var(--od-line)] bg-[var(--od-cream-2)] p-4">
                    <div className="flex items-center justify-between text-[11.5px] text-[#8B8B7E]">
                      <span>Branş dağılımı</span>
                      <span>4 ders</span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-[10.5px] text-[var(--od-ink)]">
                      {[
                        { n: "Türkçe", p: 86 },
                        { n: "Mat", p: 72 },
                        { n: "Fen", p: 64 },
                        { n: "Sos", p: 79 },
                      ].map((b) => (
                        <div key={b.n}>
                          <div className="flex items-end justify-between">
                            <span>{b.n}</span>
                            <span className="text-[#8B8B7E]">%{b.p}</span>
                          </div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white">
                            <div className="h-full rounded-full bg-[var(--od-olive)]" style={{ width: `${b.p}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-[var(--od-line)] bg-white px-4 py-3 text-[12px]">
                    <span className="flex items-center gap-2 text-[var(--od-ink-soft)]">
                      <ListChecks className="h-4 w-4 text-[var(--od-olive)]" />
                      6 kazanımda eksik tespit edildi
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--od-ink)]">
                      Detay <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* 2. NEDIR */}
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <FadeIn>
                <div>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">Deneme Kulübü nedir?</span>
                  <h2 className="mt-3 font-display text-[34px] leading-[1.08] tracking-tight text-[var(--od-ink)] sm:text-[44px]">
                    Sadece sınav değil;{" "}
                    <em className="italic text-[var(--od-olive)]">veriyle çalışan</em> bir sistem.
                  </h2>
                  <p className="mt-5 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
                    ODK; öğrencinin denemeyi yalnız bırakmadığı, her sonucu kazanım düzeyinde okuduğu ve haftaya somut bir planla geçtiği bir dijital deneme sistemidir. TYT, AYT ve LGS için sınav formatına birebir uygun çalışır.
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={0.05}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { t: "Dijital deneme çözümü", d: "PDF kitapçık + dijital optik form." },
                    { t: "Anlık değerlendirme", d: "Net, doğru-yanlış ve dağılım anında." },
                    { t: "Kazanım bazlı analiz", d: "Müfredat kazanımı düzeyinde detay." },
                    { t: "Gelişim grafiği", d: "Hafta hafta net değişim takibi." },
                    { t: "Eksik konu haritası", d: "Tekrarlayan kör noktalar görünür olur." },
                    { t: "Veli takip paneli", d: "Sade dilde gerçek gelişim raporu." },
                  ].map((b) => (
                    <div key={b.t} className="rounded-2xl border border-[var(--od-line)] bg-white p-5">
                      <CheckCircle2 className="h-4 w-4 text-[var(--od-olive)]" />
                      <div className="mt-3 font-display text-[17px] leading-tight text-[var(--od-ink)]">{b.t}</div>
                      <p className="mt-2 text-[13.5px] leading-6 text-[var(--od-ink-soft)]">{b.d}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* 3. NASIL CALISIR */}
        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">Sistem akışı</span>
                <h2 className="mt-3 font-display text-[34px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[44px]">Bir hafta nasıl işler?</h2>
                <p className="mt-4 text-[15px] leading-7 text-[var(--od-ink-soft)]">
                  Beş adımlık, basit ama tutarlı bir döngü. Her hafta aynı ritim; öğrencinin tek odaklanması gereken çözmek ve eksiğine geri dönmek.
                </p>
              </div>
            </FadeIn>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {flow.map((step, i) => (
                <FadeIn key={step.title} delay={i * 0.04}>
                  <div className="flex h-full flex-col rounded-[20px] border border-[var(--od-line)] bg-[var(--od-cream)] p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[28px] leading-none text-[var(--od-olive)]">0{i + 1}</span>
                      <span className="h-1 w-8 rounded-full bg-[var(--od-line)]" />
                    </div>
                    <h3 className="mt-5 font-display text-[18px] leading-tight text-[var(--od-ink)]">{step.title}</h3>
                    <p className="mt-2 text-[13.5px] leading-6 text-[var(--od-ink-soft)]">{step.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* 4. DIJITAL DENEME */}
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
              <FadeIn>
                <div>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">Dijital deneme deneyimi</span>
                  <h2 className="mt-3 font-display text-[34px] leading-[1.08] tracking-tight text-[var(--od-ink)] sm:text-[44px]">
                    Gerçek sınav hissi,{" "}
                    <em className="italic text-[var(--od-olive)]">dijitalin hızıyla</em>.
                  </h2>
                  <p className="mt-5 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
                    PDF kitapçık üzerinden çözüp dijital optikten işaretlersin. Süre gerçek sınavla aynı. Her işaretleme otomatik kaydedilir, çıkış ve sekme aktivitesi kayda alınır; sonuçlar bu yüzden gerçek kalır.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {digitalExperience.map(({ icon: Icon, title, body }) => (
                      <div key={title} className="rounded-2xl border border-[var(--od-line)] bg-white p-5">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="mt-4 font-display text-[16.5px] leading-tight text-[var(--od-ink)]">{title}</div>
                        <p className="mt-2 text-[13px] leading-6 text-[var(--od-ink-soft)]">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={0.05}>
                <div className="rounded-[24px] border border-[var(--od-line)] bg-white p-5 shadow-[0_24px_60px_-30px_rgba(20,20,15,0.28)]">
                  <div className="flex items-center justify-between border-b border-[var(--od-line)] pb-3">
                    <div className="text-[12.5px] font-semibold text-[var(--od-ink)]">Dijital optik form · TYT</div>
                    <div className="inline-flex items-center gap-1 text-[11.5px] text-[var(--od-olive)]">
                      <Clock3 className="h-3.5 w-3.5" /> 02:14:08
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-1.5 text-[10.5px] text-[var(--od-ink)]">
                    {Array.from({ length: 40 }).map((_, i) => {
                      const filled = i % 3 === 0;
                      const marked = i % 5 === 0;
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between rounded-md border px-2 py-1.5 ${marked ? "border-[var(--od-olive)] bg-[var(--od-cream-2)]" : "border-[var(--od-line)] bg-white"}`}
                        >
                          <span className="text-[#8B8B7E]">{i + 1}</span>
                          <div className="flex gap-0.5">
                            {["A", "B", "C", "D", "E"].map((c, ci) => (
                              <span
                                key={c}
                                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[8px] ${filled && ci === i % 5 ? "border-[var(--od-olive)] bg-[var(--od-olive)] text-white" : "border-[var(--od-line)] text-[#8B8B7E]"}`}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--od-cream)] px-4 py-3 text-[11.5px]">
                    <span className="text-[#8B8B7E]">Otomatik kayıt: aktif</span>
                    <span className="inline-flex items-center gap-1 text-[var(--od-olive)]">
                      <ShieldCheck className="h-3.5 w-3.5" /> Güvenli oturum
                    </span>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* 5. KAZANIM ANALIZI */}
        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">Kazanım bazlı analiz</span>
                <h2 className="mt-3 font-display text-[34px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[44px]">Bu sadece bir deneme sistemi değil.</h2>
                <p className="mt-4 text-[15px] leading-7 text-[var(--od-ink-soft)]">
                  Net sayısı bir başlangıç. ODK; ders, konu ve kazanım düzeyinde analiz çıkarır, net gelişim grafiğiyle birleştirir; öğrencinin nereye çalışacağını tahminden çıkarır.
                </p>
              </div>
            </FadeIn>

            <div className="mt-12">
              <FadeIn delay={0.05}>
                <AnalyticsMock />
              </FadeIn>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {analyticsDimensions.map(({ icon: Icon, title, body }, i) => (
                <FadeIn key={title} delay={i * 0.04}>
                  <div className="h-full rounded-2xl border border-[var(--od-line)] bg-[var(--od-cream)] p-5">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--od-olive)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="mt-4 font-display text-[16.5px] leading-tight text-[var(--od-ink)]">{title}</div>
                    <p className="mt-2 text-[13px] leading-6 text-[var(--od-ink-soft)]">{body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <div className="mt-14 rounded-[22px] border border-[var(--od-line)] bg-[var(--od-cream)] p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                <div>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">Fark</span>
                  <h3 className="mt-3 font-display text-[26px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[32px]">
                    Klasik deneme mantığı{" "}
                    <em className="italic text-[var(--od-olive)]">değil</em>.
                  </h3>
                  <p className="mt-3 text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
                    ODK&apos;nın değeri sınavı açıp kapatmakta değil; o sınavı öğrencinin haftalık gelişim kararına dönüştürmesinde.
                  </p>
                </div>

                <div className="grid gap-2">
                  <div className="grid grid-cols-[1.6fr_0.55fr_0.55fr] items-center gap-3 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8B8B7E]">
                    <span />
                    <span className="text-center">Klasik</span>
                    <span className="text-center text-[var(--od-olive)]">ODK</span>
                  </div>
                  {comparisonRows.map((row) => (
                    <div key={row.point} className="grid grid-cols-[1.6fr_0.55fr_0.55fr] items-center gap-3 rounded-[16px] border border-[var(--od-line)] bg-white px-4 py-3">
                      <div className="text-[13.5px] text-[var(--od-ink)]">{row.point}</div>
                      <div className="text-center text-[12.5px] font-semibold text-[#8B8B7E]">{row.regular}</div>
                      <div className="text-center text-[12.5px] font-semibold text-[var(--od-olive)]">{row.odk}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. OGRENCI AVANTAJLARI */}
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">Öğrenciye faydası</span>
                <h2 className="mt-3 font-display text-[34px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[44px]">Öğrencinin işini kolaylaştıran sekiz şey.</h2>
              </div>
            </FadeIn>

            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {studentBenefits.map(({ icon: Icon, title, body }, i) => (
                <FadeIn key={title} delay={i * 0.03}>
                  <div className="h-full rounded-2xl border border-[var(--od-line)] bg-white p-5 transition hover:border-[var(--od-ink)]/25 hover:shadow-[0_18px_40px_-24px_rgba(20,20,15,0.18)]">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="mt-4 font-display text-[16.5px] leading-tight text-[var(--od-ink)]">{title}</div>
                    <p className="mt-2 text-[13px] leading-6 text-[var(--od-ink-soft)]">{body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* 7. VELI TAKIP */}
        <section className="border-b border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <FadeIn>
                <div>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">Veli takip sistemi</span>
                  <h2 className="mt-3 font-display text-[34px] leading-[1.08] tracking-tight text-[var(--od-ink)] sm:text-[44px]">
                    Çocuğunun gelişimini{" "}
                    <em className="italic text-[var(--od-olive)]">veriden</em> takip et.
                  </h2>
                  <p className="mt-5 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
                    Veli paneli karmaşık tablolarla değil, sade dille çalışır. Hangi denemeye girdiği, hangi konuda ilerlediği ve nerede sıkıştığı — hepsi tek bir akışta. Çocuğunun günlük çalışmasına karışmadan, takip edebileceğin bir alan.
                  </p>
                </div>
              </FadeIn>

              <div className="grid gap-3 sm:grid-cols-2">
                {parentFeatures.map(({ icon: Icon, title, body }, i) => (
                  <FadeIn key={title} delay={i * 0.04}>
                    <div className="h-full rounded-2xl border border-[var(--od-line)] bg-white p-5">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="mt-4 font-display text-[16.5px] leading-tight text-[var(--od-ink)]">{title}</div>
                      <p className="mt-2 text-[13px] leading-6 text-[var(--od-ink-soft)]">{body}</p>
                    </div>
                  </FadeIn>
                ))}

                <div className="rounded-2xl border border-[#2e2d2a] bg-[#1c1b18] p-5 text-white sm:col-span-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    <Users className="h-4 w-4 text-[#cfcbb8]" />
                    Velinin gördüğü
                  </div>
                  <div className="mt-4 grid gap-2 text-[13px] text-white/80 sm:grid-cols-2">
                    {[
                      "Haftalık deneme aktivitesi",
                      "Net gelişim trendi",
                      "Eksik kazanım listesi",
                      "Önemli rapor bildirimleri",
                    ].map((t) => (
                      <div key={t} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#cfcbb8]" />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. PRICING */}
        <section id="paketler" className="scroll-mt-24 border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">ODK Paketleri</span>
                <h2 className="mt-3 font-display text-[36px] font-normal leading-[1.06] tracking-tight text-[var(--od-ink)] sm:text-[48px]">
                  Sınavına göre seç,{" "}
                  <em className="italic text-[var(--od-olive)]">haftalık ritmi</em> kur.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[var(--od-ink-soft)]">
                  Tüm paketler aynı sistemle çalışır: dijital deneme, kazanım analizi, gelişim grafiği ve veli paneli — paket içeriği yalnızca odak ve kapsam bakımından değişir.
                </p>
              </div>
            </FadeIn>

            {packages.length === 0 ? (
              <FadeIn delay={0.05}>
                <div className="mx-auto mt-12 max-w-2xl rounded-[24px] border border-dashed border-[var(--od-line)] bg-white p-10 text-center">
                  <h3 className="font-display text-[24px] leading-tight text-[var(--od-ink)]">Paket katalogu hazırlanıyor</h3>
                  <p className="mt-3 text-[14px] leading-7 text-[var(--od-ink-soft)]">
                    Yeni dönem paketleri çok yakında açılıyor. Kontenjan oluştuğunda önceliği ön kayıt bırakanlara veriyoruz.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <LeadFunnelTrigger
                      source="exam_club_pricing_empty"
                      eventName="landing_cta_click"
                      analyticsId="exam_club_pricing_empty"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--od-ink)] px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-black"
                    >
                      Ön kayıt bırak
                      <ArrowRight className="h-3.5 w-3.5" />
                    </LeadFunnelTrigger>
                    <Link
                      href="/iletisim"
                      className="inline-flex items-center rounded-full border border-[var(--od-ink)]/15 bg-white px-5 py-2.5 text-[13.5px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
                    >
                      İletişime geç
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ) : (
              <>
                <div
                  className={`mt-14 grid gap-5 ${
                    packages.length >= 4
                      ? "sm:grid-cols-2 lg:grid-cols-4"
                      : packages.length === 3
                        ? "sm:grid-cols-2 lg:grid-cols-3"
                        : packages.length === 2
                          ? "sm:grid-cols-2"
                          : "mx-auto max-w-md"
                  }`}
                >
                  {packages.map((p, i) => {
                    const highlight = p.id === highlightId && packages.length > 1;
                    return (
                      <FadeIn key={p.id} delay={i * 0.05}>
                        <article
                          className={`relative flex h-full flex-col rounded-[22px] border transition ${
                            highlight
                              ? "border-[var(--od-ink)] bg-[var(--od-yellow-soft)] shadow-[0_36px_80px_-36px_rgba(20,20,15,0.32)]"
                              : "border-[var(--od-line)] bg-white hover:border-[var(--od-ink)]/25 hover:shadow-[0_18px_40px_-24px_rgba(20,20,15,0.18)]"
                          }`}
                        >
                          {highlight ? (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--od-ink)] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white">
                              En kapsamlı
                            </span>
                          ) : null}

                          <div className={`border-b px-6 py-6 ${highlight ? "border-[var(--od-ink)]/15" : "border-[var(--od-line)]"}`}>
                            <h3 className="font-display text-[22px] leading-tight tracking-tight text-[var(--od-ink)]">{p.title}</h3>
                            {p.description ? (
                              <p className="mt-3 line-clamp-3 text-[13px] leading-6 text-[var(--od-ink-soft)]">{p.description}</p>
                            ) : (
                              <p className="mt-3 text-[13px] leading-6 text-[var(--od-ink-soft)]">Dijital deneme + kazanım analizi + gelişim grafiği.</p>
                            )}

                            <div className="mt-5 flex items-baseline gap-2">
                              <span className="font-display text-[32px] leading-none tracking-tight text-[var(--od-ink)]">{priceFormatter.format(p.priceCents / 100)}</span>
                              <span className="text-[12px] text-[var(--od-ink-soft)]">/ paket</span>
                            </div>
                            {p.originalPriceCents && p.originalPriceCents > p.priceCents ? (
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-[13px] text-[var(--od-ink-soft)] line-through decoration-[var(--od-ink-soft)]/60">
                                  {priceFormatter.format(p.originalPriceCents / 100)}
                                </span>
                                <span className="rounded-full bg-[var(--od-olive)]/12 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--od-olive)]">
                                  %{Math.round((1 - p.priceCents / p.originalPriceCents) * 100)} indirim
                                </span>
                              </div>
                            ) : null}
                            <div className="mt-1.5 text-[11.5px] text-[var(--od-ink-soft)]">{formatDuration(p.durationDays)}</div>
                          </div>

                          <div className="flex flex-1 flex-col px-6 py-6">
                            <ul className="space-y-3">
                              {[
                                `${p._count.packageExams} deneme erişimi`,
                                "Dijital optik form & PDF kitapçık",
                                "Kazanım bazlı analiz raporu",
                                "Net gelişim grafiği",
                                "Veli takip paneli",
                              ].map((feature) => (
                                <li key={feature} className="flex items-start gap-2.5 text-[13.5px] leading-6 text-[var(--od-ink-soft)]">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--od-olive)]" />
                                  {feature}
                                </li>
                              ))}
                            </ul>

                            <Link
                              href={`/odk-paketleri/${p.slug}/satin-al`}
                              className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-[13.5px] font-medium transition ${
                                highlight
                                  ? "bg-[var(--od-ink)] text-white hover:bg-black"
                                  : "border border-[var(--od-ink)]/15 bg-white text-[var(--od-ink)] hover:border-[var(--od-ink)]/40"
                              }`}
                            >
                              Pakete başla
                              <ArrowRight size={14} strokeWidth={1.8} />
                            </Link>
                          </div>
                        </article>
                      </FadeIn>
                    );
                  })}
                </div>

                <p className="mx-auto mt-8 max-w-2xl text-center text-[12.5px] leading-6 text-[var(--od-ink-soft)]">
                  Tüm fiyatlar KDV dahildir. Paket içerikleri dönemsel olarak güncellenebilir. Ödeme onayından sonra erişim hesabına anında tanımlanır.
                </p>
              </>
            )}
          </div>
        </section>

        {/* 9. FAQ */}
        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto max-w-4xl px-5 py-20 sm:py-24">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--od-olive)]">Sık sorulanlar</span>
                <h2 className="mt-3 font-display text-[34px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[42px]">Merak edilenler.</h2>
              </div>
            </FadeIn>

            <div className="mt-10 divide-y divide-[var(--od-line)] overflow-hidden rounded-[20px] border border-[var(--od-line)] bg-[var(--od-cream)]">
              {faq.map((item, i) => (
                <FadeIn key={item.q} delay={i * 0.02}>
                  <details className="group px-5 py-5 sm:px-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[15px] font-medium text-[var(--od-ink)]">
                      {item.q}
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--od-line)] bg-white text-[var(--od-olive)] transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[var(--od-ink-soft)]">{item.a}</p>
                  </details>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* 10. FINAL CTA */}
        <section className="bg-[var(--od-cream)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
            <div className="overflow-hidden rounded-[28px] border border-[#2e2d2a] bg-[#1c1b18] px-6 py-12 text-white sm:px-12 sm:py-16">
              <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                <div>
                  <Image
                    src="/odklogo1.png"
                    alt="odk."
                    width={92}
                    height={92}
                    className="h-14 w-14 rounded-xl bg-white object-contain p-1.5"
                  />
                  <h2 className="mt-6 max-w-xl font-display text-[32px] leading-tight tracking-tight sm:text-[44px]">
                    Bu hafta başla, sonucu pazar günü oku.
                  </h2>
                  <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/70">
                    Pakete başla, ilk denemeyi çöz. Sistem, raporu sana, gelişim grafiğini veline, eksik kazanımları da bir sonraki haftaya net biçimde bırakır.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href="#paketler"
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-[14px] font-medium text-[#1c1b18] transition hover:bg-white/90"
                    >
                      Paketleri gör
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <LeadFunnelTrigger
                      source="exam_club_final_cta"
                      eventName="landing_cta_click"
                      analyticsId="exam_club_final_cta"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-[14px] font-medium text-white transition hover:bg-white/10"
                    >
                      Ön kayıt bırak
                    </LeadFunnelTrigger>
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    <Sparkles className="h-4 w-4 text-[#cfcbb8]" />
                    Bugün başladığında
                  </div>
                  <div className="mt-5 space-y-3 text-[14px] text-white/80">
                    {[
                      "Aktif deneme listen panelde hazır",
                      "Çözer çözmez kazanım analizin hazır",
                      "Veli panelin paralel açılır",
                      "Bir sonraki hafta için odak listen oluşur",
                    ].map((t) => (
                      <div key={t} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#cfcbb8]" />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
