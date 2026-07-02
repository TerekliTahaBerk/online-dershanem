import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import {
  breadcrumbJsonLd,
  courseJsonLd,
  productJsonLd,
} from "@/lib/seo/jsonld";
import { contact, siteUrl, subjectPackageGroups } from "@/lib/content";

const lessonPkg = subjectPackageGroups[0].packages.find(
  (p) => p.subject === "Ders Paketi",
)!;

const waHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;
const priceMain = lessonPkg.discountedPrice.replace("/ay", ""); // ₺3.000
const priceOld = (lessonPkg.oldPrice ?? "").replace("/ay", ""); // ₺5.000

export const metadata: Metadata = {
  title: "Matematik Ders Paketi — Butik Canlı Matematik Dersi",
  description:
    "En fazla 4 öğrencilik grupta canlı matematik dersi, derste soru-cevap, ders sonrası ödevlendirme ve veliye kısa gelişim notu. Aylık ₺3.000.",
  alternates: { canonical: "/matematik-ders-paketi/" },
  openGraph: {
    title: "Matematik Ders Paketi | Online Dershanem",
    description:
      "En fazla 4 öğrencilik grupta canlı matematik dersi, öğretmen notu ve ders sonrası çalışma yönü.",
    url: `${siteUrl}/matematik-ders-paketi/`,
  },
};

const pillars = [
  {
    title: "En fazla 4 kişilik grup",
    body: "Herkesin görünür olduğu, soru sorabildiği küçük canlı sınıf.",
  },
  {
    title: "Google Meet’te canlı",
    body: "Kurulum yok. Bağlantıya tıkla, derse katıl. Soru-cevap ve birlikte çözüm.",
  },
  {
    title: "Plan + ödev + not",
    body: "Her ders, öğrenci ne çalışacağını bilerek biter. Ödev sayılı ve takip edilebilir.",
  },
  {
    title: "Veliye haftalık not",
    body: "Bu hafta ne işlendi, nerede iyi, neye dikkat — kısa bir durum özeti.",
  },
];

const kapsar = [
  "Haftalık canlı grup dersleri",
  "Konu anlatımı + birlikte soru çözümü",
  "Ders sonu çalışma planı ve ödev",
  "Öğretmen notu ile geri bildirim",
  "Veliye haftalık durum notu",
];

const kapsamaz = [
  "Matematik dışı dersler",
  "Birebir özel ders garantisi",
  "Sınav başarısı taahhüdü / “garantili puan”",
  "Resmî karne / not belgesi",
  "7/24 birebir soru çözüm hattı",
];

const priceFeatures = [
  { strong: true, text: "Hesap açmanıza gerek yok" },
  { strong: false, text: "Ödeme sonrası hesabı biz oluştururuz" },
  { strong: false, text: "PayTR · 256-bit SSL güvenli ödeme" },
  { strong: false, text: "Aylık — uzun taahhüt yok" },
];

const flow = [
  { step: "1", title: "Ödeme", body: "PayTR üzerinden güvenle tamamlanır." },
  { step: "2", title: "Biz ararız", body: "Seviye ve hedefi konuşuruz." },
  { step: "3", title: "Hesabı açarız", body: "Giriş bilgilerini iletiriz." },
  { step: "4", title: "İlk ders", body: "Gruba katılır, başlarız." },
];

const faqs = [
  {
    q: "Aylık ücrete neler dahil?",
    a: "Haftalık canlı grup dersleri, her ders sonunda çalışma planı ve ödev, öğretmen notu ve veliye haftalık durum notu. Yukarıdaki “Kapsar” listesi tam içeriği gösterir.",
  },
  {
    q: "₺5.000 fiyatı ne, neden ₺3.000 ödüyorum?",
    a: "₺5.000, paketin referans aldığımız liste fiyatıdır. ₺3.000/ay ise şu anda geçerli olan güncel fiyattır.",
  },
  {
    q: "Satın alınca hemen hesap mı açmam gerekiyor?",
    a: "Hayır. Ödeme sırasında yalnızca ad-soyad ve iletişim bilgisi istenir. Öğrenci hesabını ödeme sonrası ekibimiz oluşturur ve giriş bilgilerini size iletir.",
  },
  {
    q: "Çocuğumun sınıfını / hedefini ne zaman soruyorsunuz?",
    a: "Ödeme sonrası sizi aradığımızda. Seviyeyi ve hedefi birlikte konuşup en uygun gruba yerleştiririz. Ödeme anında bu bilgileri girmenize gerek yok.",
  },
  {
    q: "İstediğim zaman bırakabilir miyim?",
    a: "Paket aylıktır ve uzun vadeli zorunlu taahhüt içermez. Ayrıntılar için bize her zaman ulaşabilirsiniz.",
  },
];

const SECTION_H2 =
  "font-display text-[clamp(26px,3.6vw,38px)] font-medium leading-[1.1] tracking-[-0.02em]";
const LABEL_H2 = "text-[14px] font-semibold tracking-[0.02em]";

export default function MatematikDersPaketiPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const productLd = productJsonLd({
    name: lessonPkg.name,
    description:
      "En fazla 4 öğrencilik grupta canlı matematik dersi, derste soru-cevap, ders sonrası ödevlendirme ve veliye kısa gelişim notu.",
    url: "/matematik-ders-paketi/",
    priceCents: lessonPkg.priceCents,
    sku: lessonPkg.id,
  });

  const courseLd = courseJsonLd({
    name: lessonPkg.name,
    description:
      "LGS, TYT ve AYT hedeflerine göre, en fazla 4 öğrencilik küçük grupta canlı matematik dersi.",
    url: "/matematik-ders-paketi/",
  });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "Matematik Ders Paketi", url: "/matematik-ders-paketi/" },
  ]);

  return (
    <>
      <SchemaJsonLd schema={[faqJsonLd, productLd, courseLd, breadcrumbLd]} />
      <Navbar />
      <main className="od-public overflow-x-hidden bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* HERO + STICKY PRICE */}
        <section className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] py-[clamp(40px,6vw,72px)]">
          <div className="grid items-start gap-[clamp(32px,5vw,64px)] lg:grid-cols-2">
            {/* Sol: detay */}
            <div>
              <Link
                href="/"
                className="mb-6 inline-block text-[13px] text-[var(--od-ink-soft)]"
              >
                ← Ana sayfa
              </Link>
              <div>
                <span className="mb-5 inline-block rounded-full border border-[var(--od-line)] bg-[var(--od-cream-2)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--od-ink-soft)]">
                  Tek satış paketimiz
                </span>
              </div>
              <h1 className="mb-5 max-w-[15ch] font-display text-[clamp(34px,5.4vw,54px)] font-medium leading-[1.04] tracking-[-0.025em]">
                Matematik <em className="font-normal italic">Ders Paketi</em>
              </h1>
              <p className="mb-10 max-w-[52ch] text-[clamp(17px,2.2vw,19px)] leading-[1.6] text-[var(--od-ink-soft)]">
                En fazla 4 öğrencilik canlı grup dersi. Google Meet&apos;te birlikte
                çözüm, her ders sonunda çalışma planı ve veliye haftalık durum notu —
                aynı öğretmenle, düzenli aralıklarla.
              </p>

              {/* Pakette neler var */}
              <h2 className={`${LABEL_H2} mb-5`}>PAKETTE NELER VAR</h2>
              <div className="mb-14 grid gap-4 sm:grid-cols-2">
                {pillars.map((p) => (
                  <div
                    key={p.title}
                    className="rounded-[14px] border border-[var(--od-line)] bg-[var(--od-paper)] p-[22px]"
                  >
                    <div className="mb-1.5 text-[15px] font-semibold">{p.title}</div>
                    <p className="text-[14px] leading-[1.55] text-[var(--od-ink-soft)]">{p.body}</p>
                  </div>
                ))}
              </div>

              {/* Kapsar / kapsamaz */}
              <h2 className={`${LABEL_H2} mb-2`}>PAKETTE OLAN VE OLMAYAN</h2>
              <p className="mb-5 max-w-[48ch] text-[15px] text-[var(--od-ink-soft)]">
                Neyi verdiğimizi ve neyi vermediğimizi açıkça yazıyoruz. Sürpriz yok.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)] p-[26px]">
                  <h3 className="mb-[18px] flex items-center gap-2.5 text-[16px] font-semibold">
                    <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--od-mint)] text-[#2C3A24]">
                      <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                    </span>
                    Kapsar
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {kapsar.map((item) => (
                      <li
                        key={item}
                        className="relative pl-[18px] text-[14px] leading-[1.5] text-[#3A3A32]"
                      >
                        <span className="absolute left-0 text-[var(--od-olive-soft)]">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)] p-[26px]">
                  <h3 className="mb-[18px] flex items-center gap-2.5 text-[16px] font-semibold">
                    <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--od-blush)] text-[#6B3F2E]">
                      <Minus size={13} strokeWidth={2.4} aria-hidden="true" />
                    </span>
                    Kapsamaz
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {kapsamaz.map((item) => (
                      <li
                        key={item}
                        className="relative pl-[18px] text-[14px] leading-[1.5] text-[#3A3A32]"
                      >
                        <span className="absolute left-0 text-[#C0907E]">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Sağ: sticky fiyat kartı */}
            <div className="lg:sticky lg:top-[88px]">
              <div className="rounded-[20px] bg-[var(--od-olive)] p-[clamp(28px,4vw,36px)] text-[var(--od-cream)] shadow-[0_4px_24px_rgba(58,74,44,0.18)]">
                <div className="mb-3 text-[14px] text-[#A9BD93]">Matematik Ders Paketi</div>
                <div className="mb-1.5 flex items-end gap-3">
                  <span className="font-display text-[clamp(40px,6vw,52px)] font-medium leading-none">
                    {priceMain}
                  </span>
                  <span className="mb-2 text-[16px] text-[#C7CCBC]">/ ay</span>
                </div>
                <div className="mb-[26px] flex items-center gap-2.5">
                  {priceOld ? (
                    <span className="text-[16px] text-[#A9BD93] line-through">{priceOld}</span>
                  ) : null}
                  <span className="rounded-full bg-[var(--od-cream)]/[0.16] px-2.5 py-1 text-[13px] font-medium">
                    Aylık sabit fiyat
                  </span>
                </div>
                <PurchaseFunnelTrigger
                  source="ders_paketi_card"
                  packageName={lessonPkg.name}
                  category={lessonPkg.category}
                  subject={lessonPkg.subject}
                  priceLabel={lessonPkg.discountedPrice}
                  paymentLink=""
                  className="mb-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-[var(--od-cream)] px-6 py-4 text-[16px] font-medium text-[var(--od-olive)] transition-colors hover:bg-[var(--od-cream-2)]"
                >
                  Sepete Ekle
                </PurchaseFunnelTrigger>
                <a
                  href={waHref}
                  className="flex min-h-12 items-center justify-center gap-2.5 rounded-[11px] border border-[var(--od-cream)]/[0.24] bg-[var(--od-cream)]/10 px-5 py-3.5 text-[15px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[var(--od-cream)]/[0.18]"
                >
                  <span className="h-[7px] w-[7px] rounded-full bg-[#A9BD93]" aria-hidden="true" />
                  Önce WhatsApp&apos;tan sor
                </a>
                <div className="my-6 h-px bg-[var(--od-cream)]/[0.14]" />
                <ul className="flex flex-col gap-3">
                  {priceFeatures.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5 text-[14px] text-[#E6E9DE]">
                      <span className="text-[#A9BD93]">
                        <Check size={18} strokeWidth={2} aria-hidden="true" />
                      </span>
                      {f.strong ? (
                        <strong className="font-semibold">{f.text}</strong>
                      ) : (
                        f.text
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3.5 text-center text-[12px] text-[#8A8A7E]">
                Kart bilgileriniz bizimle paylaşılmaz.
              </p>
            </div>
          </div>
        </section>

        {/* ÖDEMEDEN DERSE */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] py-[clamp(48px,7vw,88px)]">
            <h2 className={`${SECTION_H2} mb-10 max-w-[20ch]`}>
              Ödemeden ilk derse.
            </h2>
            <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
              {flow.map((s) => (
                <div key={s.step}>
                  <div className="mb-2.5 font-display text-[26px] text-[var(--od-olive-soft)]">
                    {s.step}
                  </div>
                  <div className="mb-1 text-[15px] font-semibold">{s.title}</div>
                  <p className="text-[14px] leading-[1.5] text-[var(--od-ink-soft)]">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SSS */}
        <section className="border-t border-[var(--od-line)]">
          <div className="mx-auto max-w-[760px] px-[clamp(20px,4vw,40px)] py-[clamp(48px,7vw,88px)]">
            <h2 className={`${SECTION_H2} mb-9 text-center`}>Paket hakkında</h2>
            <div className="overflow-hidden rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)]">
              {faqs.map((item, i) => (
                <details
                  key={item.q}
                  className="group border-b border-[var(--od-line)] last:border-b-0"
                  open={i === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-[22px] [&::-webkit-details-marker]:hidden">
                    <span className="text-[16px] font-semibold">{item.q}</span>
                    <span className="shrink-0 text-[var(--od-olive-soft)] transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-open:rotate-45">
                      <Plus size={20} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="px-6 pb-[22px] text-[15px] leading-[1.6] text-[var(--od-ink-soft)]">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* KAPANIŞ CTA */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-olive)] text-[var(--od-cream)]">
          <div className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] py-[clamp(56px,8vw,104px)] text-center">
            <h2 className="mx-auto mb-5 max-w-[16ch] font-display text-[clamp(28px,4.6vw,46px)] font-medium leading-[1.08] tracking-[-0.025em]">
              Paket hazır; gerisini birlikte planlarız.
            </h2>
            <p className="mx-auto mb-8 max-w-[40ch] text-[17px] text-[#D8DCCF]">
              {priceMain}/ay · PayTR güvenli ödeme.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <PurchaseFunnelTrigger
                source="ders_paketi_final"
                packageName={lessonPkg.name}
                category={lessonPkg.category}
                subject={lessonPkg.subject}
                priceLabel={lessonPkg.discountedPrice}
                paymentLink=""
                className="inline-flex min-h-12 items-center gap-2 rounded-[11px] bg-[var(--od-cream)] px-6 py-3.5 text-[16px] font-medium text-[var(--od-olive)] transition-colors hover:bg-[var(--od-cream-2)]"
              >
                Sepete Ekle
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
