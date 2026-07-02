import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";
import { mathCamps, CAMP_MAX_STUDENTS, siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Matematik Kampları",
  description:
    "Maksimum 12 kişilik online matematik konu kamplarıyla öğrencinizin problem, fonksiyon, türev, integral ve temel matematik eksiklerini kısa sürede toparlamasına destek olun.",
  alternates: { canonical: "/kamplar" },
  openGraph: {
    title: "Online Matematik Kampları | Online Dershanem",
    description:
      "Belirli bir matematik konusunda eksiği olan öğrenciler için maksimum 12 kişilik online, konu odaklı canlı kamplar.",
    url: `${siteUrl}/kamplar`,
    images: [{ url: `${siteUrl}/opengraph-image`, width: 1200, height: 630, alt: "Online Matematik Kampları" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Matematik Kampları | Online Dershanem",
    description:
      "Maksimum 12 kişilik online matematik konu kamplarıyla takılınan konuyu kısa sürede toparlayın.",
    images: [`${siteUrl}/opengraph-image`],
  },
};

/** levelTag → ikincil ton rozeti (tasarım sistemi renkleri) */
function badgeClass(levelTag: string): string {
  if (/LGS/.test(levelTag)) return "bg-[var(--od-mint)] text-[#2C3A24]";
  if (/TYT/.test(levelTag)) return "bg-[var(--od-blush)] text-[#6B3F2E]";
  if (/AYT/.test(levelTag)) return "bg-[var(--od-sky)] text-[#2E4A63]";
  return "bg-[var(--od-lavender)] text-[#473A63]";
}

const suitableFor = [
  "Tek bir konuda takılıp kalmış, o konuyu hızlıca kapatmak isteyenler",
  "Sınav öncesi belirli bir başlığı yoğunlaştırmak isteyenler",
  "Ana pakete ek olarak bir konuda derinleşmek isteyen öğrenciler",
  "Kısa, hedefli bir program arayanlar",
];

const processSteps = [
  {
    n: "1",
    title: "Ön kayıt",
    body: "İlgilendiğiniz kampı seçer, iletişim bilginizi bırakırsınız.",
  },
  {
    n: "2",
    title: "Bilgi & tarih",
    body: "Kamp tarihi, kontenjan ve ücret bilgisini iletiriz.",
  },
  {
    n: "3",
    title: "Katılım",
    body: `Google Meet'te canlı, en fazla ${CAMP_MAX_STUDENTS} kişilik grupta.`,
  },
];

const campFaq = [
  {
    q: "Kamp ücreti ne kadar?",
    a: "Kamp ücretleri konuya ve süreye göre değişir. Ön kayıt bıraktığınızda güncel tarih ve ücret bilgisini size iletiriz.",
  },
  {
    q: "Kamp, Ders Paketi'nin yerine geçer mi?",
    a: "Hayır. Kamplar tek bir konuyu kısa sürede toparlamak içindir. Düzenli, uzun soluklu takip için ana ürünümüz Matematik Ders Paketi'dir.",
  },
  {
    q: "Kamplarda kaç kişi oluyor?",
    a: `Kamplar en fazla ${CAMP_MAX_STUDENTS} kişiliktir. Ders Paketi'ndeki 4 kişilik gruptan daha kalabalık ama yine de takip edilebilir bir düzendir.`,
  },
  {
    q: "Ön kayıt beni bir şeye bağlar mı?",
    a: "Hayır. Ön kayıt yalnızca sizi bilgilendirmemiz içindir; herhangi bir ödeme veya taahhüt içermez.",
  },
];

const SECTION_H2 =
  "font-display text-[clamp(24px,3.4vw,34px)] font-medium leading-[1.12] tracking-[-0.02em]";

const highlightedCampIds = new Set(["turev", "yeni-nesil"]);

export default function CampsPage() {
  const highlightedCamps = mathCamps.filter((camp) => highlightedCampIds.has(camp.id));
  const otherCamps = mathCamps.filter((camp) => !highlightedCampIds.has(camp.id));
  const courseSchemas = mathCamps.map((camp) =>
    courseJsonLd({
      name: `${camp.name} — Online Matematik Kampı`,
      description: `${camp.goal} ${camp.durationLabel}, ${camp.lessonsLabel}, en fazla ${CAMP_MAX_STUDENTS} öğrencilik online canlı grup.`,
      url: `${siteUrl}/kamplar`,
    }),
  );

  return (
    <>
      <SchemaJsonLd
        schema={[
          breadcrumbJsonLd([
            { name: "Ana Sayfa", url: "/" },
            { name: "Matematik Kampları", url: "/kamplar/" },
          ]),
          ...courseSchemas,
        ]}
      />
      <Navbar />
      <main className="od-public overflow-x-hidden bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* HERO */}
        <section className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] pb-[clamp(32px,5vw,56px)] pt-[clamp(44px,7vw,84px)]">
          <span className="mb-[22px] inline-block rounded-full bg-[var(--od-lavender)] px-3.5 py-1.5 text-[13px] font-semibold text-[#473A63]">
            Matematik Kampları · ön kayıt
          </span>
          <h1 className="mb-5 max-w-[16ch] font-display text-[clamp(34px,5.6vw,58px)] font-medium leading-[1.03] tracking-[-0.025em]">
            Tek bir konuyu, <em className="font-normal italic">kısa sürede</em> toparlayın.
          </h1>
          <p className="mb-5 max-w-[54ch] text-[clamp(17px,2.2vw,20px)] leading-[1.6] text-[var(--od-ink-soft)]">
            Belirli bir konuyu 1–3 hafta içinde yoğunlaştırılmış biçimde çalışan, en fazla{" "}
            {CAMP_MAX_STUDENTS} kişilik online kamplar. Fiyat için ön kayıt bırakın, sizi
            bilgilendirelim.
          </p>
          <div className="inline-flex max-w-[60ch] items-center gap-2.5 rounded-xl border border-[var(--od-line)] bg-[var(--od-cream-2)] px-4 py-3 text-[14px] text-[var(--od-ink-soft)]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--od-olive-soft)]" aria-hidden="true" />
            <span>
              Düzenli takip için ana ürünümüz hâlâ{" "}
              <Link
                href="/matematik-ders-paketi/"
                className="border-b border-[#C9C3B4] font-semibold text-[var(--od-ink)]"
              >
                Matematik Ders Paketi
              </Link>
              . Kamplar onu tamamlar, yerini almaz.
            </span>
          </div>
        </section>

        {/* KAMP KARTLARI */}
        <section className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] pb-[clamp(48px,7vw,88px)]">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.04em] text-[var(--od-olive-soft)]">
              En çok tercih edilen
            </h2>
            <span className="text-[13px] text-[var(--od-ink-soft)]">
              Tümü Google Meet · maks. {CAMP_MAX_STUDENTS} kişi
            </span>
          </div>

          <div className="mb-10 grid gap-5 lg:grid-cols-2">
            {highlightedCamps.map((camp, index) => (
              <div
                key={camp.id}
                className="flex flex-col rounded-[20px] border border-[var(--od-line)] bg-[var(--od-paper)] p-[clamp(28px,3.5vw,36px)] shadow-[0_1px_2px_rgba(20,20,15,0.04)]"
              >
                <div className="mb-[18px] flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-[11px] py-[5px] text-[12px] font-semibold ${badgeClass(camp.levelTag)}`}
                  >
                    {camp.levelTag}
                  </span>
                  <span className="inline-flex items-center gap-[7px] text-right text-[12px] font-semibold text-[var(--od-olive-soft)]">
                    <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--od-olive-soft)]" />
                    {index === 0 ? "En çok talep edilen" : "Geniş kitle"}
                  </span>
                </div>
                <h3 className="mb-3 font-display text-[clamp(26px,3vw,32px)] font-medium tracking-[-0.015em]">
                  {camp.name.replace(/ Kampı$/, "")}
                </h3>
                <p className="mb-[22px] max-w-[42ch] text-[15px] leading-[1.6] text-[var(--od-ink-soft)]">
                  {camp.goal}
                </p>
                <div className="mb-6 flex flex-wrap gap-2">
                  {[camp.durationLabel, camp.levelLabel, `Maks. ${CAMP_MAX_STUDENTS} kişi`].map((label) => (
                    <span
                      key={label}
                      className="rounded-lg bg-[var(--od-cream-2)] px-3 py-[7px] text-[13px] text-[#3A3A32]"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <Link
                  href="/iletisim/"
                  className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-[11px] bg-[var(--od-olive)] px-5 py-3.5 text-[15px] font-medium text-[var(--od-cream)] transition-colors duration-150 hover:bg-[#2C3A21]"
                >
                  Ön kayıt bırak
                  <ArrowRight size={15} strokeWidth={1.7} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>

          <h2 className="mb-4 text-[14px] font-semibold uppercase tracking-[0.04em] text-[var(--od-olive-soft)]">
            Diğer kamplar
          </h2>
          <div className="overflow-hidden rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)]">
            {otherCamps.map((camp) => (
              <Link
                key={camp.id}
                href="/iletisim/"
                className="group flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--od-line)] px-5 py-5 transition-colors duration-150 last:border-b-0 hover:bg-[var(--od-cream)] sm:flex-nowrap sm:px-6"
              >
                <span
                  className={`w-[74px] shrink-0 rounded-full py-[5px] text-center text-[11px] font-semibold ${badgeClass(camp.levelTag)}`}
                >
                  {camp.levelTag === "Temel" ? "Tüm sev." : camp.levelTag}
                </span>
                <span className="min-w-0 basis-[calc(100%-90px)] sm:flex-1 sm:basis-auto">
                  <span className="block font-display text-[19px] font-medium tracking-[-0.01em]">
                    {camp.name.replace(/ Kampı$/, "")}
                  </span>
                  <span className="mt-0.5 block text-[14px] leading-[1.5] text-[var(--od-ink-soft)]">
                    {camp.goal}
                  </span>
                </span>
                <span className="ml-[90px] shrink-0 whitespace-nowrap text-[13px] text-[var(--od-ink-soft)] sm:ml-0">
                  {camp.durationLabel}
                </span>
                <ArrowRight
                  size={16}
                  strokeWidth={1.7}
                  className="ml-auto shrink-0 text-[var(--od-olive)]"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* KİMLER İÇİN + SÜREÇ */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className="mx-auto grid max-w-[1120px] gap-[clamp(32px,5vw,56px)] px-[clamp(20px,4vw,40px)] py-[clamp(48px,7vw,88px)] lg:grid-cols-2">
            <div>
              <h2 className={`${SECTION_H2} mb-5`}>Bu kamplar kimler için?</h2>
              <ul className="flex flex-col gap-3.5">
                {suitableFor.map((item) => (
                  <li
                    key={item}
                    className="relative pl-5 text-[15px] leading-[1.5] text-[#3A3A32]"
                  >
                    <span className="absolute left-0 text-[var(--od-olive-soft)]">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className={`${SECTION_H2} mb-5`}>Kamp nasıl işler?</h2>
              <div className="flex flex-col gap-3.5">
                {processSteps.map((s) => (
                  <div key={s.n} className="flex items-start gap-3.5">
                    <span className="shrink-0 font-display text-[18px] text-[var(--od-olive-soft)]">
                      {s.n}
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold">{s.title}</div>
                      <div className="text-[14px] leading-[1.5] text-[var(--od-ink-soft)]">{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* KAMP SSS */}
        <section className="border-t border-[var(--od-line)]">
          <div className="mx-auto max-w-[760px] px-[clamp(20px,4vw,40px)] py-[clamp(48px,7vw,88px)]">
            <h2 className={`${SECTION_H2} mb-8 text-center`}>Kamplar hakkında</h2>
            <div className="overflow-hidden rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)]">
              {campFaq.map((item, i) => (
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
            <div className="mt-8 text-center">
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center gap-2 rounded-[11px] bg-[var(--od-olive)] px-6 py-3.5 text-[16px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[#2C3A21]"
              >
                Kamp için ön kayıt
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
