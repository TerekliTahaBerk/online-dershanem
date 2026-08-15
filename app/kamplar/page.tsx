import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  Clock3,
  GraduationCap,
  LineChart,
  MessageSquare,
  Target,
  Users,
  Video,
} from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FooterCta } from "@/components/marketing/footer-cta";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { mathCamps, CAMP_MAX_STUDENTS } from "@/lib/content";
import { waHref } from "@/lib/site-content";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Matematik Kampları",
  description:
    "LGS ve YKS matematiğinde belirli bir hedefe odaklanan online kamplar için ön kayıt bilgisi. Tarih ve ücretler program netleştiğinde açıklanır.",
  canonical: "/kamplar",
});

const howItWorks = [
  { icon: Target, title: "Seviye analizi", body: "Kampın konusunda öğrencinin nerede olduğunu belirleriz." },
  { icon: ClipboardList, title: "Kişisel plan", body: "Kalan eksiklere göre kısa, hedefli bir çalışma planı çıkar." },
  { icon: Calendar, title: "Günlük takip", body: "Çalışma ritmi gün gün takip edilir ve düzeni korumaya yardımcı olunur." },
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
    a: "Kamplar konuya göre 1–3 hafta arasında sürer ve birkaç canlı dersten oluşur. Başlangıç tarihleri henüz açıklanmadı; program netleştiğinde ön kayıt talebi bırakanlarla paylaşılır.",
  },
  {
    q: "Kamplar şu anda satın alınabilir mi?",
    a: "Hayır. Kamplar şu anda ön kayıt ve bilgilendirme aşamasındadır. Tarih, ücret ve kesin program açıklanmadan ödeme alınmaz.",
  },
  {
    q: "Paketlerden farkı ne?",
    a: "Kamplar tek bir konuyu kısa sürede toparlamaya odaklanır ve en fazla 12 kişiliktir. Düzenli, uzun soluklu takip için LGS ve YKS Matematik Ders Paketleri en fazla 4 kişilik küçük gruplarla ilerler.",
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
      <main id="main-content" tabIndex={-1}>
        {/* Başlık */}
        <section className="bg-white pt-16 sm:pt-20">
          <div className="site-container text-center">
            <p className="site-eyebrow justify-center">Matematik Kampları</p>
            <h1 className="mx-auto mt-4 max-w-4xl font-display text-[clamp(2.4rem,6vw,4.8rem)] leading-[1.04] text-[var(--site-ink)]">
              Kısa sürede matematik düzeni kurmak isteyenler için kamplar.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-7 text-[var(--site-body)]">
              LGS ve YKS matematiğinde belirli hedefe odaklanan kısa süreli çalışma dönemleri.
            </p>
            <div className="mx-auto mt-6 flex max-w-xl items-start gap-3 rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-5 py-4 text-left">
              <Clock3
                size={18}
                className="mt-0.5 shrink-0 text-[var(--brand-orange-ink)]"
                aria-hidden="true"
              />
              <p className="text-[13.5px] leading-6 text-[var(--site-body)]">
                Kamplar şu anda ön kayıt aşamasında. Kesin başlangıç tarihi ve ücret bilgisi
                program netleştiğinde paylaşılacak; bu aşamada ödeme alınmıyor.
              </p>
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/iletisim" className="site-btn site-btn-primary site-btn-lg">
                Ön kayıt bilgisi al
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
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        camp.featured
                          ? "bg-[var(--brand-orange)] text-white"
                          : "border border-[var(--site-line)] bg-[var(--site-bg-warm)] text-[var(--site-muted)]"
                      }`}
                    >
                      {camp.featured ? "Ön kayıt" : "Yakında"}
                    </span>
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
                    <div className="flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-[var(--brand-orange)]" aria-hidden="true" />
                      <dt className="sr-only">Seviye</dt>
                      <dd>{camp.levelLabel}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-[var(--brand-orange)]" aria-hidden="true" />
                      <dt className="sr-only">Kontenjan</dt>
                      <dd>En fazla {CAMP_MAX_STUDENTS} kişi</dd>
                    </div>
                  </dl>

                  <dl className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--site-bg-warm)] p-3.5">
                    <div>
                      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--site-muted)]">
                        Başlangıç
                      </dt>
                      <dd className="mt-1 text-[12.5px] font-semibold text-[var(--site-ink)]">
                        Henüz açıklanmadı
                      </dd>
                    </div>
                    <div className="border-l border-[var(--site-line)] pl-3">
                      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--site-muted)]">
                        Ücret
                      </dt>
                      <dd className="mt-1 text-[12.5px] font-semibold text-[var(--site-ink)]">
                        Henüz açıklanmadı
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href="/iletisim"
                    className="mt-6 inline-flex items-center gap-2 text-[14.5px] font-semibold text-[var(--brand-orange-ink)] hover:underline"
                  >
                    {camp.featured ? "Ön kayıt bilgisi al" : "Duyurulunca haber ver"}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
            <p className="mt-8 text-center text-[13.5px] text-[var(--site-muted)]">
              Kamplar henüz satışta değildir. Tarih, ücret ve kesin program açıklandıktan sonra
              ön kayıt talebi bırakanlarla iletişime geçilir.
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
          title="Kamp duyurularını kaçırmayın."
          subtitle="Öğrencinin seviyesini ve ilgilendiğiniz kampı paylaşın; kesin program açıklandığında size bilgi verelim."
          ctaLabel="Ön kayıt bilgisi al"
          ctaHref="/iletisim"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
