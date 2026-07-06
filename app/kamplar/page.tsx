import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, ClipboardList, LineChart, MessageSquare, Target, Video } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FooterCta } from "@/components/marketing/footer-cta";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { mathCamps, CAMP_MAX_STUDENTS, siteUrl } from "@/lib/content";
import { waHref } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Kamplar",
  description:
    "Belirli bir matematik konusuna odaklanan, öğretmen destekli ve sıkı takip edilen online kamplar. Kısa sürede düzen kurmak isteyenler için.",
  alternates: { canonical: "/kamplar" },
  openGraph: {
    title: "Kamplar | Online Dershanem",
    description:
      "Belirli hedefe odaklanan, öğretmen destekli ve sıkı takip edilen online matematik kampları.",
    url: `${siteUrl}/kamplar`,
  },
};

const howItWorks = [
  { icon: Target, title: "Seviye analizi", body: "Kampın konusunda öğrencinin nerede olduğunu belirleriz." },
  { icon: ClipboardList, title: "Kişisel plan", body: "Kalan eksiklere göre kısa, hedefli bir çalışma planı çıkar." },
  { icon: Calendar, title: "Günlük takip", body: "Çalışma ritmi gün gün takip edilir, dağılma engellenir." },
  { icon: MessageSquare, title: "Öğretmen görüşmesi", body: "Canlı derslerde soru-cevap ve birlikte çözüm." },
  { icon: LineChart, title: "Raporlama", body: "Kamp sonunda ne toparlandığı özetlenir." },
];

const campFaqs = [
  {
    q: "Kamp kimler için uygun?",
    a: "Tek bir matematik konusunda takılıp kalmış ve o konuyu kısa sürede toparlamak isteyen öğrenciler için uygundur. Sınav öncesi belirli bir başlığı yoğunlaştırmak isteyenler de tercih eder.",
  },
  {
    q: "Ne kadar sürer?",
    a: "Kamplar konuya göre 1–3 hafta arasında sürer ve birkaç canlı dersten oluşur. Güncel tarih ve program bilgisini görüşmede paylaşırız.",
  },
  {
    q: "Paketlerden farkı ne?",
    a: "Kamplar tek bir konuyu kısa sürede kapatmaya odaklanır ve en fazla 12 kişiliktir. Düzenli, uzun soluklu takip için ana ürünümüz en fazla 4 kişilik Matematik Ders Paketi'dir.",
  },
  {
    q: "Online mı ilerler?",
    a: `Evet. Tüm kamplar Google Meet üzerinden canlı, en fazla ${CAMP_MAX_STUDENTS} kişilik grupta yapılır. Ayrı bir uygulama indirmenize gerek yoktur.`,
  },
];

export default function CampsPage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "Kamplar", url: "/kamplar/" },
        ])}
      />
      <SiteHeader />
      <main>
        {/* Başlık */}
        <section className="bg-white pt-16 sm:pt-20">
          <div className="site-container text-center">
            <p className="site-eyebrow justify-center">Matematik Kampları</p>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-[clamp(2.4rem,6vw,4rem)] leading-[1.04] tracking-[-0.03em] text-[var(--site-ink)]">
              Kısa sürede <span className="site-hl">düzen kurmak</span> isteyenler için kamplar.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-7 text-[var(--site-body)]">
              Belirli bir konuya odaklanan, öğretmen destekli ve sıkı takip edilen çalışma dönemleri.
              En fazla {CAMP_MAX_STUDENTS} kişilik online gruplar.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/iletisim/" className="site-btn site-btn-primary site-btn-lg">
                Ücretsiz görüşme
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="site-btn site-btn-secondary site-btn-lg">
                WhatsApp&apos;tan sor
              </a>
            </div>
          </div>
        </section>

        {/* Kamp kartları */}
        <section className="bg-white">
          <div className="site-container py-16 sm:py-20">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mathCamps.map((camp) => (
                <article
                  key={camp.id}
                  className="flex flex-col rounded-[24px] border border-[var(--site-line)] bg-white p-7 shadow-[0_1px_2px_rgba(20,20,15,0.03)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[var(--brand-orange-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--brand-orange-ink)]">
                      {camp.levelTag}
                    </span>
                    {camp.featured ? (
                      <span className="text-[12px] font-semibold text-[var(--site-muted)]">Öne çıkan</span>
                    ) : null}
                  </div>
                  <h2 className="mt-4 font-display text-[22px] leading-[1.15] tracking-[-0.01em] text-[var(--site-ink)]">
                    {camp.name}
                  </h2>
                  <p className="mt-3 flex-1 text-[14.5px] leading-6 text-[var(--site-body)]">{camp.goal}</p>
                  <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--site-line)] pt-4 text-[13px] text-[var(--site-body)]">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-[var(--brand-orange)]" aria-hidden="true" />
                      <dt className="sr-only">Süre</dt>
                      <dd>{camp.durationLabel}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Video size={14} className="text-[var(--brand-orange)]" aria-hidden="true" />
                      <dt className="sr-only">Ders</dt>
                      <dd>{camp.lessonsLabel}</dd>
                    </div>
                  </dl>
                  <Link
                    href="/iletisim/"
                    className="mt-6 inline-flex items-center gap-2 text-[14.5px] font-semibold text-[var(--brand-orange-ink)] hover:underline"
                  >
                    Detaylı bilgi al
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
            <p className="mt-8 text-center text-[13.5px] text-[var(--site-muted)]">
              Kamp tarih ve ücret bilgisi konuya göre değişir; ücretsiz görüşmede güncel programı paylaşırız.
            </p>
          </div>
        </section>

        {/* Nasıl işler */}
        <section className="bg-[var(--site-bg-warm)]">
          <div className="site-container py-20 sm:py-24">
            <h2 className="text-center font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.1] tracking-[-0.02em] text-[var(--site-ink)]">
              Kamp nasıl işler?
            </h2>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {howItWorks.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="rounded-[22px] border border-[var(--site-line)] bg-white p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-[15.5px] font-bold text-[var(--site-ink)]">{s.title}</h3>
                    <p className="mt-2 text-[13.5px] leading-6 text-[var(--site-body)]">{s.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <FaqAccordion title="Kamplar hakkında" items={campFaqs} tone="plain" />
        <FooterCta
          title="Hangi kamp sana uygun, birlikte bakalım."
          subtitle="Öğrencinin eksik olduğu konuyu söyle; doğru kampı ve programı beraber belirleyelim."
          ctaLabel="Ücretsiz görüşme"
          ctaHref="/iletisim/"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
