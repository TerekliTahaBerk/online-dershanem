import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  FileText,
  MessageSquare,
  Video,
  Lock,
  Users,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { contact, siteUrl, subjectPackageGroups } from "@/lib/content";

const lessonPkg = subjectPackageGroups[0].packages.find(
  (p) => p.subject === "Ders Paketi",
)!;

const waHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;
const telHref = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;
const priceMain = lessonPkg.discountedPrice.replace("/ay", ""); // ₺3.000
const priceOld = (lessonPkg.oldPrice ?? "").replace("/ay", ""); // ₺5.000

export const metadata: Metadata = {
  title: "Online Matematik Dersi | Online Dershanem",
  description:
    "En fazla 4 öğrencilik canlı matematik dersleriyle öğrenciniz derste görünür olur, soru sorar ve ders sonrası ne çalışacağını bilir.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Online Matematik Dersi | Online Dershanem",
    description:
      "En fazla 4 öğrencilik canlı matematik dersi, ders içi soru-cevap ve veliye anlaşılır haftalık not.",
    url: `${siteUrl}/`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Matematik Dersi | Online Dershanem",
    description:
      "En fazla 4 öğrencilik canlı matematik dersiyle öğrenciniz derste görünür olur.",
  },
};

/* ---------- İçerik verisi ---------- */

const problems = [
  {
    n: "01",
    title: "Kalabalık sınıfta kaybolmak",
    body: "30 kişilik dershane sınıfında soru sormaya çekinen çocuk, anlamadığı yerde takılıp kalıyor.",
  },
  {
    n: "02",
    title: "Birebir dersin maliyeti",
    body: "Özel ders işe yarıyor ama saatlik ücretler çoğu aile için sürdürülebilir değil.",
  },
  {
    n: "03",
    title: "“Bugün ne yaptınız?” belirsizliği",
    body: "Veli olarak çocuğun gerçekten ilerleyip ilerlemediğini göremiyor, sürece dair elinizde somut bir şey olmuyor.",
  },
];

const lessonSteps = [
  {
    step: "ADIM 01",
    title: "Konu anlatımı",
    body: "Öğretmen konuyu birlikte, tahta üzerinde işler. En fazla 4 kişi olduğu için herkes görünür.",
  },
  {
    step: "ADIM 02",
    title: "Birlikte çözüm",
    body: "Soruları beraber çözeriz. Takıldığı yeri anında sorar; ders donuk bir sunum değil.",
  },
  {
    step: "ADIM 03",
    title: "Soru-cevap",
    body: "Anlamadığı her noktayı durup sorabileceği, gerçekten konuştuğu bir ortam.",
  },
  {
    step: "ADIM 04",
    title: "Plan & ödev",
    body: "Ders, öğrenci ne çalışacağını bilmeden bitmez. Çalışma planı ve ödevle kapanır.",
  },
];

const teachers = [
  { name: "Öğretmen adı", tag: "AYT · İleri matematik" },
  { name: "Öğretmen adı", tag: "TYT · Temel matematik" },
  { name: "Öğretmen adı", tag: "LGS · 8. sınıf" },
];

const afterLesson = [
  {
    icon: FileText,
    title: "Çalışma planı",
    body: "Bu hafta hangi konu, hangi soru tipi.",
  },
  {
    icon: Check,
    title: "Belirli ödev",
    body: "“Bol bol çalış” değil; sayılı, takip edilebilir.",
  },
  {
    icon: MessageSquare,
    title: "Öğretmen notu",
    body: "Nerede iyi, nerede dikkat — birkaç cümle.",
  },
];

const trustStrip = [
  { icon: Video, title: "Google Meet", sub: "Tanıdık, kurulum yok" },
  { icon: Lock, title: "PayTR · 256-bit SSL", sub: "Ödeme PayTR üzerinden işlenir" },
  { icon: Users, title: "En fazla 4 öğrenci", sub: "Sabit küçük grup" },
  { icon: RefreshCw, title: "Ödeme sonrası kurulum", sub: "Hesabı biz oluştururuz" },
];

const suitable = [
  "Düzenli, takipli ilerlemek isteyen öğrenciler",
  "Kalabalıkta çekinen, küçük grupta açılan çocuklar",
  "Süreci görmek isteyen veliler",
  "LGS, TYT veya AYT’ye hazırlananlar",
];

const notSuitable = [
  "“Bir gecede sınavı kurtaralım” arayanlar",
  "Tek seferlik soru çözüm hizmeti isteyenler",
  "Sadece matematik dışı dersler arayanlar",
  "Hiç ödev/çalışma yapmak istemeyenler",
];

const levels = [
  {
    tag: "LGS",
    badge: "bg-[var(--od-mint)] text-[#2C3A24]",
    title: "8. sınıf",
    body: "Yeni nesil sorulara hazırlık, temel kavramların sağlamlaştırılması ve sınav matematiği.",
  },
  {
    tag: "TYT",
    badge: "bg-[var(--od-blush)] text-[#6B3F2E]",
    title: "Temel matematik",
    body: "Konu eksiklerini kapatma, hız ve doğruluk dengesi, deneme analizleriyle ilerleme.",
  },
  {
    tag: "AYT",
    badge: "bg-[var(--od-sky)] text-[#2E4A63]",
    title: "İleri matematik",
    body: "Türev, integral, limit gibi konularda derinlik; zorlu soru tiplerinde ustalaşma.",
  },
];

const comparison = {
  columns: ["Birebir özel ders", "Klasik dershane", "Online Dershanem"],
  rows: [
    { label: "Grup büyüklüğü", values: ["1 kişi", "20–30 kişi", "En fazla 4 kişi"] },
    { label: "Aylık maliyet", values: ["Çok yüksek", "Orta–yüksek", "₺3.000/ay"] },
    { label: "Bireysel ilgi", values: ["Yüksek", "Düşük", "Yüksek"] },
    { label: "Veliye düzenli not", values: ["Değişken", "Genelde yok", "Her hafta"] },
  ],
};

const priceFeatures = [
  "En fazla 4 öğrencilik canlı grup dersi",
  "Google Meet üzerinden, soru-cevaplı",
  "Her ders sonunda plan + ödev + not",
  "Veliye haftalık durum notu",
];

const paymentSteps = [
  { step: "ADIM 1", title: "Ödeme", body: "Ödemeyi PayTR üzerinden güvenle tamamlarsınız." },
  { step: "ADIM 2", title: "Biz ararız", body: "Çocuğun seviyesini ve hedefini konuşuruz." },
  { step: "ADIM 3", title: "Hesabı oluştururuz", body: "Giriş bilgilerini size iletiriz." },
  { step: "ADIM 4", title: "Gruba yerleştiririz", body: "Seviyeye uygun, en fazla 4 kişilik gruba." },
  { step: "ADIM 5", title: "İlk ders", body: "Google Meet’te ilk canlı ders başlar." },
  { step: "ADIM 6", title: "Haftalık takip", body: "Plan, ödev ve veliye durum notu." },
];

const faqs = [
  {
    q: "Satın almak için hesap açmam gerekiyor mu?",
    a: "Hayır. Ödemeyi yaptıktan sonra öğrenci hesabını ekibimiz oluşturur ve giriş bilgilerini size iletir. Sizin tek yapmanız gereken ödemeyi tamamlamak.",
  },
  {
    q: "Grupta gerçekten en fazla 4 kişi mi oluyor?",
    a: "Evet. Her grup en fazla 4 öğrencidir; bu bizim temel sözümüz. Küçük grup, herkesin görünür olmasını ve soru sorabilmesini sağlar.",
  },
  {
    q: "Dersler nerede ve nasıl yapılıyor?",
    a: "Tüm dersler Google Meet üzerinden canlı yapılır. Ayrı bir uygulama indirmenize gerek yok; bağlantıyı paylaşırız, tıklayıp katılırsınız.",
  },
  {
    q: "Ödeme güvenli mi?",
    a: "Ödemeler PayTR altyapısı ve 256-bit SSL ile alınır. Kart bilgileriniz bizimle paylaşılmaz; doğrudan güvenli ödeme sağlayıcısında işlenir.",
  },
  {
    q: "Veli olarak süreci nasıl takip ederim?",
    a: "Her hafta size işlenen konuyu, çocuğunuzun zorlandığı noktayı ve dikkat edilmesi gerekeni birkaç cümleyle yazarız. Resmî bir karne değil, sürecin kısa özeti.",
  },
  {
    q: "İstediğim zaman bırakabilir miyim?",
    a: "Paket aylıktır. Uzun vadeli zorunlu taahhüt yoktur; devam edip etmemeye her ay siz karar verirsiniz. Detaylar için bize ulaşabilirsiniz.",
  },
];

const kampTags = [
  "Problemler",
  "Fonksiyonlar",
  "Türev",
  "İntegral",
  "Yeni Nesil",
  "Temel Toparlama",
];

/* ---------- Ortak sınıflar ---------- */

const SECTION = "mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] py-[clamp(56px,8vw,104px)]";
const EYEBROW = "text-[14px] font-medium tracking-[0.04em] text-[var(--od-olive-soft)]";
const H2 =
  "font-display text-[clamp(28px,4vw,42px)] font-medium leading-[1.1] tracking-[-0.02em]";

export default function HomePage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Online Dershanem",
    description:
      "En fazla 4 öğrencilik canlı matematik dersleriyle öğrencinin derste görünür olduğu online matematik dershanesi.",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: contact.phone,
      contactType: "customer support",
      areaServed: "TR",
    },
  };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: lessonPkg.name,
    description:
      "En fazla 4 öğrencilik canlı matematik dersi, ders içi soru-cevap, ders sonrası ödevlendirme ve veliye anlaşılır haftalık not.",
    brand: { "@type": "Brand", name: "Online Dershanem" },
    offers: {
      "@type": "Offer",
      price: (lessonPkg.priceCents / 100).toFixed(2),
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/`,
    },
  };

  return (
    <>
      <SchemaJsonLd schema={[faqJsonLd, orgJsonLd, productJsonLd]} />
      <Navbar />
      <main className="od-public overflow-x-hidden bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* 1 · HERO */}
        <section className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] pb-[clamp(40px,6vw,72px)] pt-[clamp(48px,8vw,96px)]">
          <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-[var(--od-line)] bg-[var(--od-cream-2)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--od-ink-soft)]">
            <span className="h-[7px] w-[7px] rounded-full bg-[var(--od-olive)]" aria-hidden="true" />
            LGS · TYT · AYT matematik
          </div>
          <h1 className="max-w-[17ch] font-display text-[clamp(38px,6.4vw,68px)] font-medium leading-[1.04] tracking-[-0.025em]">
            En fazla <em className="font-normal italic">4 kişilik</em> canlı matematik dersi.
          </h1>
          <p className="mt-6 max-w-[54ch] text-[clamp(17px,2.2vw,20px)] leading-[1.55] text-[var(--od-ink-soft)]">
            Çocuğunuz kalabalıkta kaybolmaz, birebir kadar da pahalı değil. Google
            Meet&apos;te canlı çözüm, her ders sonunda o hafta ne çalışılacağı belli
            olur ve size haftalık kısa bir durum notu gider.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <PurchaseFunnelTrigger
              source="home_hero_primary"
              packageName={lessonPkg.name}
              category={lessonPkg.category}
              subject={lessonPkg.subject}
              priceLabel={lessonPkg.discountedPrice}
              paymentLink=""
              className="inline-flex min-h-12 items-center gap-2.5 rounded-[11px] bg-[var(--od-olive)] px-6 py-3.5 text-[16px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[#2C3A21]"
            >
              Sepete Ekle — {priceMain}
              <span className="font-normal opacity-70">/ay</span>
            </PurchaseFunnelTrigger>
            <Link
              href="/iletisim/"
              className="inline-flex min-h-12 items-center gap-2.5 rounded-[11px] border border-[var(--od-ink)] bg-[var(--od-cream)] px-6 py-3.5 text-[16px] font-medium text-[var(--od-ink)] transition-colors hover:bg-[var(--od-cream-2)]"
            >
              Önce ön görüşme
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[14px] text-[var(--od-ink-soft)]">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--od-mint)] text-[#2C3A24]">
                <Check size={11} strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span>
                <strong className="font-semibold text-[var(--od-ink)]">Öğrenci hesabını ödeme sonrasında biz hazırlarız</strong> — önceden kayıt gerekmez
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--od-mint)] text-[#2C3A24]">
                <Check size={11} strokeWidth={2.4} aria-hidden="true" />
              </span>
              PayTR ile 256-bit SSL ödeme
            </span>
          </div>
        </section>

        {/* 2 · PROBLEM */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className={SECTION}>
            <p className={`${EYEBROW} mb-4`}>TANIDIK GELİYOR MU?</p>
            <h2 className={`${H2} mb-12 max-w-[20ch]`}>
              Matematik, çoğu evde sessiz bir gerginlik kaynağı.
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {problems.map((p) => (
                <div
                  key={p.n}
                  className="rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)] p-7"
                >
                  <div className="mb-3.5 font-display text-[32px] text-[var(--od-olive-soft)]">
                    {p.n}
                  </div>
                  <h3 className="mb-2 text-[18px] font-semibold">{p.title}</h3>
                  <p className="text-[15px] leading-[1.6] text-[var(--od-ink-soft)]">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3 · BİR DERS NASIL İŞLER */}
        <section className="border-t border-[var(--od-line)]">
          <div className={SECTION}>
            <p className={`${EYEBROW} mb-4`}>BİR DERS NASIL İŞLER</p>
            <h2 className={`${H2} mb-12 max-w-[22ch]`}>
              Dört kişilik küçük bir masa, <em className="font-normal italic">belli</em> bir akış.
            </h2>
            <div className="grid gap-px overflow-hidden rounded-[18px] border border-[var(--od-line)] bg-[var(--od-line)] sm:grid-cols-2 lg:grid-cols-4">
              {lessonSteps.map((s) => (
                <div key={s.step} className="bg-[var(--od-cream)] p-7">
                  <div className="mb-6 text-[13px] font-semibold text-[var(--od-olive-soft)]">
                    {s.step}
                  </div>
                  <h3 className="mb-2 text-[17px] font-semibold">{s.title}</h3>
                  <p className="text-[14px] leading-[1.6] text-[var(--od-ink-soft)]">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Editoryal mola · pull-quote */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className="mx-auto max-w-[900px] px-[clamp(20px,4vw,40px)] py-[clamp(52px,7vw,96px)] text-center">
            <p className="font-display text-[clamp(24px,3.8vw,38px)] font-normal italic leading-[1.28] tracking-[-0.01em]">
              Kalabalık değil, birebir de değil — <span className="not-italic text-[var(--od-olive)]">arada</span>, çocuğunuzun görünür olduğu bir yer.
            </p>
          </div>
        </section>

        {/* 4 · ÖĞRETMENLER */}
        <section className="border-t border-[var(--od-line)]">
          <div className={SECTION}>
            <p className={`${EYEBROW} mb-4`}>EKİP</p>
            <h2 className={`${H2} mb-3.5 max-w-[18ch]`}>Dersi verenler.</h2>
            <p className="mb-11 max-w-[48ch] text-[17px] leading-[1.6] text-[var(--od-ink-soft)]">
              Alanında deneyimli, sınav sistemini ve öğrenciyle birebir iletişimi bilen
              matematik öğretmenleri.
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {teachers.map((t, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[var(--od-line)] bg-[var(--od-cream)] p-6"
                >
                  <div
                    className="mb-[18px] flex aspect-[4/3] w-full items-end rounded-xl p-3"
                    style={{
                      background:
                        "repeating-linear-gradient(135deg,#F4F2EB,#F4F2EB 8px,#EFEDE4 8px,#EFEDE4 16px)",
                    }}
                  >
                    <span className="text-[11px] text-[#8A8A7E]">öğretmen portresi</span>
                  </div>
                  <h3 className="mb-0.5 text-[16px] font-semibold">{t.name}</h3>
                  <p className="text-[14px] text-[var(--od-ink-soft)]">{t.tag}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[13px] italic text-[#8A8A7E]">
              Öğretmen isimleri, portreleri ve uzmanlık alanları sizden gelen bilgiyle
              doldurulacak.
            </p>
          </div>
        </section>

        {/* 5 · ELİ BOŞ KALKMAZ */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-olive)] text-[var(--od-cream)]">
          <div className="mx-auto grid max-w-[1120px] items-center gap-[clamp(40px,6vw,80px)] px-[clamp(20px,4vw,40px)] py-[clamp(56px,8vw,104px)] lg:grid-cols-2">
            <div>
              <p className="mb-4 text-[14px] font-medium tracking-[0.04em] text-[#A9BD93]">
                DERS SONRASI
              </p>
              <h2 className="mb-5 font-display text-[clamp(28px,4vw,44px)] font-medium leading-[1.08] tracking-[-0.02em]">
                Çocuğunuz dersten <em className="font-normal italic">eli boş</em> kalkmaz.
              </h2>
              <p className="max-w-[46ch] text-[17px] leading-[1.6] text-[#D8DCCF]">
                Her dersin sonunda elinde ne çalışacağını bilen, ödevi belli, öğretmeninin
                notunu almış bir öğrenci olur.
              </p>
            </div>
            <div className="flex flex-col gap-3.5">
              {afterLesson.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="flex items-start gap-4 rounded-[14px] border border-[var(--od-cream)]/15 bg-[var(--od-cream)]/[0.07] px-5 py-5"
                  >
                    <span className="mt-0.5 shrink-0 text-[#A9BD93]">
                      <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <div>
                      <div className="mb-0.5 text-[16px] font-semibold">{f.title}</div>
                      <div className="text-[14px] leading-[1.5] text-[#C7CCBC]">{f.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6 · VELİ PANELİ ÖRNEK */}
        <section className="border-t border-[var(--od-line)]">
          <div className={SECTION}>
            <div className="grid items-center gap-[clamp(32px,5vw,64px)] lg:grid-cols-2">
              <div>
                <p className={`${EYEBROW} mb-4`}>VELİYE HAFTALIK NOT</p>
                <h2 className={`${H2} mb-5 max-w-[18ch]`}>
                  Sürece dair elinizde somut bir şey olur.
                </h2>
                <p className="mb-4 max-w-[46ch] text-[17px] leading-[1.6] text-[var(--od-ink-soft)]">
                  Her hafta size kısa bir durum notu gönderiririz: bu hafta ne işlendi,
                  çocuğunuz nerede iyi gidiyor, neye dikkat etmeli. Karne değil — birlikte
                  yürüdüğümüz yolun özeti.
                </p>
                <p className="text-[13px] italic text-[#8A8A7E]">
                  Yandaki kart temsilîdir; gerçek veriden oluşturulmamıştır.
                </p>
              </div>
              <div className="rounded-[18px] border border-[var(--od-line)] bg-[var(--od-paper)] p-[26px] shadow-[0_2px_12px_rgba(20,20,15,0.05)]">
                <div className="mb-[18px] flex items-center justify-between border-b border-[var(--od-line)] pb-[18px]">
                  <div>
                    <div className="text-[15px] font-semibold">Haftalık Durum Notu</div>
                    <div className="text-[13px] text-[var(--od-ink-soft)]">3–9 Mart · 8. sınıf</div>
                  </div>
                  <span className="rounded-full bg-[var(--od-mint)] px-2.5 py-1 text-[12px] font-medium text-[#2C3A24]">
                    Örnek
                  </span>
                </div>
                <div className="flex flex-col gap-3.5">
                  <div>
                    <div className="mb-1.5 text-[12px] text-[var(--od-ink-soft)]">Bu hafta işlenen</div>
                    <div className="text-[15px] font-medium">Çarpanlara ayırma · Özdeşlikler</div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[12px] text-[var(--od-ink-soft)]">Devam &amp; katılım</div>
                    <div className="flex gap-1.5" aria-hidden="true">
                      <span className="h-2 w-[26px] rounded bg-[var(--od-olive)]" />
                      <span className="h-2 w-[26px] rounded bg-[var(--od-olive)]" />
                      <span className="h-2 w-[26px] rounded bg-[var(--od-line)]" />
                      <span className="h-2 w-[26px] rounded bg-[var(--od-olive)]" />
                    </div>
                  </div>
                  <div className="rounded-xl bg-[var(--od-cream-2)] p-4">
                    <div className="mb-1.5 text-[12px] text-[var(--od-ink-soft)]">Öğretmen notu</div>
                    <div className="text-[14px] leading-[1.55]">
                      “Özdeşliklerde belirgin ilerleme var. Bu hafta işlem hızında biraz daha
                      pratik iyi olur — ödev buna göre.”
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7 · GÜVEN ŞERİDİ */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] py-[clamp(44px,6vw,72px)]">
            <div className="grid overflow-hidden rounded-[18px] border border-[var(--od-line)] bg-[var(--od-paper)] sm:grid-cols-2 lg:grid-cols-4">
              {trustStrip.map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.title}
                    className="flex items-center gap-4 border-b border-[var(--od-line)] px-7 py-[26px] last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-l lg:first:border-l-0"
                  >
                    <span className="shrink-0 text-[var(--od-olive)]">
                      <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold">{t.title}</div>
                      <div className="text-[13px] text-[var(--od-ink-soft)]">{t.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 8 · KİMLER İÇİN */}
        <section className="border-t border-[var(--od-line)]">
          <div className={SECTION}>
            <p className={`${EYEBROW} mb-4`}>KİMLER İÇİN UYGUN</p>
            <h2 className={`${H2} mb-12 max-w-[20ch]`}>Herkese uygun değiliz, bu da iyi.</h2>
            <div className="grid gap-[clamp(32px,5vw,72px)] sm:grid-cols-2">
              <div>
                <h3 className="mb-[22px] flex items-center gap-2.5 border-b border-[var(--od-line)] pb-4 text-[16px] font-semibold text-[#2C3A24]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--od-mint)]">
                    <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  Uygun
                </h3>
                <ul className="flex flex-col gap-4">
                  {suitable.map((item) => (
                    <li
                      key={item}
                      className="relative pl-4 text-[15px] leading-[1.5] text-[#3A3A32]"
                    >
                      <span className="absolute left-0 text-[var(--od-olive-soft)]">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-[22px] flex items-center gap-2.5 border-b border-[var(--od-line)] pb-4 text-[16px] font-semibold text-[#6B3F2E]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--od-blush)]">
                    <Minus size={13} strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  Uygun değil
                </h3>
                <ul className="flex flex-col gap-4">
                  {notSuitable.map((item) => (
                    <li
                      key={item}
                      className="relative pl-4 text-[15px] leading-[1.5] text-[#3A3A32]"
                    >
                      <span className="absolute left-0 text-[#C0907E]">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 9 · LGS / TYT / AYT */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className={SECTION}>
            <h2 className={`${H2} mb-3.5`}>Her seviyeye göre.</h2>
            <p className="mb-11 max-w-[48ch] text-[17px] leading-[1.6] text-[var(--od-ink-soft)]">
              Aynı düzen, sınava göre uyarlanmış içerik. Hangi seviyede olduğunuzu söyleyin,
              gerisini birlikte planlayalım.
            </p>
            <div className="grid overflow-hidden rounded-[18px] border border-[var(--od-line)] bg-[var(--od-paper)] sm:grid-cols-2 lg:grid-cols-3">
              {levels.map((lvl) => (
                <div
                  key={lvl.tag}
                  className="border-b border-[var(--od-line)] p-8 last:border-b-0 sm:[&:nth-last-child(-n+1)]:border-b-0 lg:border-b-0"
                >
                  <span
                    className={`mb-5 inline-block rounded-full px-3 py-1 text-[12px] font-semibold ${lvl.badge}`}
                  >
                    {lvl.tag}
                  </span>
                  <h3 className="mb-2 font-display text-[22px] font-medium">{lvl.title}</h3>
                  <p className="text-[15px] leading-[1.6] text-[var(--od-ink-soft)]">{lvl.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10 · KARŞILAŞTIRMA TABLOSU */}
        <section className="border-t border-[var(--od-line)]">
          <div className={SECTION}>
            <h2 className={`${H2} mb-11 max-w-[16ch]`}>
              Ortada, <em className="font-normal italic">bilinçli</em> bir yerde.
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse overflow-hidden rounded-[18px] border border-[var(--od-line)] bg-[var(--od-paper)] text-left">
                <caption className="sr-only">
                  Birebir özel ders, klasik dershane ve Online Dershanem karşılaştırması
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b border-[var(--od-line)] px-6 py-5" />
                    {comparison.columns.map((col, i) => {
                      const isUs = i === comparison.columns.length - 1;
                      return (
                        <th
                          key={col}
                          scope="col"
                          className={`border-b border-l border-[var(--od-line)] px-4 py-5 text-center text-[14px] font-semibold ${
                            isUs
                              ? "bg-[var(--od-olive)] text-[var(--od-cream)]"
                              : "text-[var(--od-ink-soft)]"
                          }`}
                        >
                          {col}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row, ri) => {
                    const last = ri === comparison.rows.length - 1;
                    return (
                      <tr key={row.label}>
                        <th
                          scope="row"
                          className={`px-6 py-[18px] text-[15px] font-medium ${
                            last ? "" : "border-b border-[var(--od-line)]"
                          }`}
                        >
                          {row.label}
                        </th>
                        {row.values.map((val, i) => {
                          const isUs = i === row.values.length - 1;
                          return (
                            <td
                              key={comparison.columns[i]}
                              className={`border-l border-[var(--od-line)] px-4 py-[18px] text-center text-[14px] ${
                                last ? "" : "border-b"
                              } ${
                                isUs
                                  ? "bg-[#F7F8F3] font-semibold text-[var(--od-olive)]"
                                  : "text-[var(--od-ink-soft)]"
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 11 · FİYAT / PAKET */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className={SECTION}>
            <div className="grid items-center gap-[clamp(32px,5vw,56px)] lg:grid-cols-2">
              <div>
                <p className={`${EYEBROW} mb-4`}>TEK PAKET, SABİT FİYAT</p>
                <h2 className="mb-5 max-w-[14ch] font-display text-[clamp(28px,4vw,44px)] font-medium leading-[1.08] tracking-[-0.02em]">
                  Matematik Ders Paketi.
                </h2>
                <p className="mb-6 max-w-[44ch] text-[17px] leading-[1.6] text-[var(--od-ink-soft)]">
                  Karmaşık paket seçenekleri yok. Tek bir teklif var — aylık, istediğiniz
                  zaman bırakabilirsiniz.
                </p>
                <Link
                  href="/matematik-ders-paketi/"
                  className="inline-flex items-center gap-2 border-b border-[var(--od-olive-soft)] pb-0.5 text-[15px] font-medium text-[var(--od-olive)]"
                >
                  Paketin tüm detayını gör
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <div className="rounded-[20px] bg-[var(--od-olive)] p-[clamp(28px,4vw,40px)] text-[var(--od-cream)] shadow-[0_4px_24px_rgba(58,74,44,0.18)]">
                <div className="mb-1.5 flex items-end gap-3">
                  <span className="font-display text-[clamp(40px,6vw,52px)] font-medium leading-none">
                    {priceMain}
                  </span>
                  <span className="mb-2 text-[16px] text-[#C7CCBC]">/ ay</span>
                </div>
                <div className="mb-7 flex items-center gap-2.5">
                  {priceOld ? (
                    <span className="text-[16px] text-[#A9BD93] line-through">{priceOld}</span>
                  ) : null}
                  <span className="rounded-full bg-[var(--od-cream)]/[0.16] px-2.5 py-1 text-[13px] font-medium">
                    Aylık sabit fiyat
                  </span>
                </div>
                <ul className="mb-7 flex flex-col gap-3">
                  {priceFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[15px] text-[#E6E9DE]">
                      <span className="mt-0.5 text-[#A9BD93]">
                        <Check size={18} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <PurchaseFunnelTrigger
                  source="home_price_primary"
                  packageName={lessonPkg.name}
                  category={lessonPkg.category}
                  subject={lessonPkg.subject}
                  priceLabel={lessonPkg.discountedPrice}
                  paymentLink=""
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-[var(--od-cream)] px-6 py-3.5 text-[16px] font-medium text-[var(--od-olive)] transition-colors hover:bg-[var(--od-cream-2)]"
                >
                  Sepete Ekle
                </PurchaseFunnelTrigger>
                <p className="mt-3.5 text-center text-[13px] text-[#A9BD93]">
                  Hesap açmanıza gerek yok · PayTR güvenli ödeme
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 12 · ÖDEMEDEN DERSE */}
        <section className="border-t border-[var(--od-line)]">
          <div className={SECTION}>
            <p className={`${EYEBROW} mb-4`}>ÖDEMEDEN İLK DERSE</p>
            <h2 className={`${H2} mb-12 max-w-[18ch]`}>Ödemeden derse, altı adım.</h2>
            <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {paymentSteps.map((s, i) => (
                <div key={s.step}>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--od-olive)]" />
                    {i !== paymentSteps.length - 1 ? (
                      <span className="h-px flex-1 bg-[var(--od-line)]" />
                    ) : null}
                  </div>
                  <div className="mb-1.5 text-[12px] font-semibold tracking-[0.04em] text-[var(--od-olive-soft)]">
                    {s.step}
                  </div>
                  <div className="mb-1.5 text-[16px] font-semibold">{s.title}</div>
                  <p className="text-[14px] leading-[1.55] text-[var(--od-ink-soft)]">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 13 · SSS */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className="mx-auto max-w-[760px] px-[clamp(20px,4vw,40px)] py-[clamp(56px,8vw,104px)]">
            <h2 className={`${H2} mb-10 text-center`}>Sık sorulanlar</h2>
            <div className="overflow-hidden rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)]">
              {faqs.map((item, i) => (
                <details
                  key={item.q}
                  className="group border-b border-[var(--od-line)] last:border-b-0"
                  open={i === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-[22px] [&::-webkit-details-marker]:hidden">
                    <span className="text-[16px] font-semibold">{item.q}</span>
                    <span className="shrink-0 text-[var(--od-olive-soft)] transition-transform duration-200 group-open:rotate-45">
                      <Plus size={20} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="px-6 pb-[22px] text-[15px] leading-[1.6] text-[var(--od-ink-soft)]">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
            <p className="mt-7 text-center text-[15px] text-[var(--od-ink-soft)]">
              Başka sorunuz mu var?{" "}
              <a
                href={waHref}
                className="border-b border-[var(--od-olive-soft)] font-medium text-[var(--od-olive)]"
              >
                WhatsApp&apos;tan yazın
              </a>{" "}
              veya{" "}
              <a
                href={telHref}
                className="border-b border-[var(--od-olive-soft)] font-medium text-[var(--od-olive)]"
              >
                arayın
              </a>
              .
            </p>
          </div>
        </section>

        {/* 14 · KAMPLAR TEASER */}
        <section className="border-t border-[var(--od-line)]">
          <div className={SECTION}>
            <div className="grid items-center gap-[clamp(28px,4vw,48px)] rounded-[20px] border border-[var(--od-line)] bg-[var(--od-paper)] p-[clamp(28px,4vw,48px)] lg:grid-cols-2">
              <div>
                <span className="mb-[18px] inline-block rounded-full bg-[var(--od-lavender)] px-3 py-1 text-[12px] font-semibold text-[#473A63]">
                  Yeni · Matematik Kampları
                </span>
                <h2 className="mb-3.5 max-w-[20ch] font-display text-[clamp(24px,3.4vw,34px)] font-medium leading-[1.12] tracking-[-0.02em]">
                  Tek bir konuyu kısa sürede toparlamak için.
                </h2>
                <p className="max-w-[48ch] text-[16px] leading-[1.6] text-[var(--od-ink-soft)]">
                  Problemler, Fonksiyonlar, Türev gibi konuları 1–3 haftada toparlayan, en
                  fazla 12 kişilik online kamplar. Düzenli takip için ana ürünümüz hâlâ{" "}
                  <strong className="font-semibold text-[var(--od-ink)]">Matematik Ders Paketi</strong>.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2.5">
                  {kampTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-[10px] bg-[var(--od-cream-2)] px-3.5 py-2 text-[14px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href="/kamplar/"
                  className="mt-1.5 inline-flex items-center gap-2 self-start border-b border-[var(--od-olive-soft)] pb-0.5 text-[15px] font-medium text-[var(--od-olive)]"
                >
                  Kampları incele &amp; ön kayıt
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 15 · KAPANIŞ CTA */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-olive)] text-[var(--od-cream)]">
          <div className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] py-[clamp(64px,9vw,120px)] text-center">
            <h2 className="mx-auto mb-5 max-w-[18ch] font-display text-[clamp(30px,5vw,52px)] font-medium leading-[1.06] tracking-[-0.025em]">
              Küçük grupta, <em className="font-normal italic">düzenli</em> bir matematik dersi.
            </h2>
            <p className="mx-auto mb-9 max-w-[42ch] text-[18px] leading-[1.55] text-[#D8DCCF]">
              Kayıt olduktan sonra ekibimiz sizinle iletişime geçer, süreci birlikte başlatırız.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <PurchaseFunnelTrigger
                source="home_final_primary"
                packageName={lessonPkg.name}
                category={lessonPkg.category}
                subject={lessonPkg.subject}
                priceLabel={lessonPkg.discountedPrice}
                paymentLink=""
                className="inline-flex min-h-12 items-center gap-2 rounded-[11px] bg-[var(--od-cream)] px-6 py-3.5 text-[16px] font-medium text-[var(--od-olive)] transition-colors hover:bg-[var(--od-cream-2)]"
              >
                Sepete Ekle — {priceMain}/ay
              </PurchaseFunnelTrigger>
              <a
                href={waHref}
                className="inline-flex min-h-12 items-center gap-2 rounded-[11px] border border-[var(--od-cream)]/[0.28] bg-[var(--od-cream)]/10 px-6 py-3.5 text-[16px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[var(--od-cream)]/[0.18]"
              >
                WhatsApp&apos;tan sor
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
