import Link from "next/link";
import { Check, Plus, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { getPackagePaymentLink, subjectPackageGroups } from "@/lib/content";

type ExamSalesLandingData = {
  // Yalnızca analitik/source etiketi için; ürün kataloğu tek matematik grubudur.
  examKey: string;
  heroBadge: string;
  heroTitle: string;
  heroText: string;
  highlights: string[];
  faq: Array<{ q: string; a: string }>;
  // Opsiyonel zenginleştirme blokları — verilmezse render edilmez.
  approach?: { heading: string; items: Array<{ title: string; body: string }> };
  plan?: {
    heading: string;
    note?: string;
    steps: Array<{ label: string; text: string }>;
  };
  sampleSummary?: {
    heading: string;
    rows: Array<{ label: string; value: string }>;
  };
  resources?: Array<{ label: string; href: string }>;
};

export function ExamSalesLanding({ data }: { data: ExamSalesLandingData }) {
  const packageGroup = subjectPackageGroups[0];
  const examCategory = data.examKey;
  const matchingPackages = packageGroup.packages.filter((pkg) => pkg.category === examCategory);
  const packages = matchingPackages.length ? matchingPackages : packageGroup.packages;
  const key = data.examKey.toLowerCase();

  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        {/* HERO */}
        <section className="border-b border-[var(--site-line)] bg-[var(--site-bg-warm)]">
          <div className="site-container grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="site-eyebrow">{data.heroBadge}</span>
              <h1 className="mt-4 font-display text-[clamp(2.3rem,5vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-[var(--site-ink)]">
                {data.heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-8 text-[var(--site-body)]">{data.heroText}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LeadFunnelTrigger
                  source={`${key}_landing_hero_primary`}
                  eventName="landing_cta_click"
                  className="site-btn site-btn-primary site-btn-lg"
                >
                  Ücretsiz ön görüşme
                </LeadFunnelTrigger>
                <a href="#paketler" className="site-btn site-btn-secondary site-btn-lg">
                  Fiyatı gör
                </a>
              </div>
            </div>

            <article className="rounded-[28px] border border-[var(--site-line)] bg-white p-7 shadow-[0_40px_80px_-50px_rgba(20,20,15,0.35)] sm:p-8">
              <h2 className="font-display text-[22px] leading-snug text-[var(--site-ink)]">
                Küçük grupta öğrenciye ne değişir?
              </h2>
              <ul className="mt-5 space-y-3.5">
                {data.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] leading-6 text-[var(--site-body)]">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                      <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {/* YAKLAŞIM */}
        {data.approach ? (
          <section className="site-container py-16 sm:py-20">
            <h2 className="max-w-3xl font-display text-[clamp(1.9rem,4vw,2.7rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">
              {data.approach.heading}
            </h2>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {data.approach.items.map((item) => (
                <div key={item.title} className="rounded-[22px] border border-[var(--site-line)] bg-white p-6">
                  <h3 className="font-display text-[19px] text-[var(--site-ink)]">{item.title}</h3>
                  <p className="mt-2.5 text-[14.5px] leading-6 text-[var(--site-body)]">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* PLAN */}
        {data.plan ? (
          <section className="border-y border-[var(--site-line)] bg-[var(--site-bg-warm)]">
            <div className="site-container py-16 sm:py-20">
              <h2 className="max-w-3xl font-display text-[clamp(1.9rem,4vw,2.7rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">
                {data.plan.heading}
              </h2>
              {data.plan.note ? (
                <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[var(--site-body)]">{data.plan.note}</p>
              ) : null}
              <ol className="mt-9 grid gap-4 sm:grid-cols-2">
                {data.plan.steps.map((step, i) => (
                  <li
                    key={step.label}
                    className="flex items-start gap-4 rounded-[20px] border border-[var(--site-line)] bg-white p-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] font-display text-[16px] text-[var(--brand-orange-ink)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block text-[15.5px] font-semibold text-[var(--site-ink)]">{step.label}</span>
                      <span className="mt-1 block text-[14px] leading-6 text-[var(--site-body)]">{step.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {/* VELİ ÖZETİ */}
        {data.sampleSummary ? (
          <section className="site-container py-16 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <h2 className="font-display text-[clamp(1.9rem,4vw,2.7rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">
                  Veliye giden kısa gelişim özeti.
                </h2>
                <p className="mt-4 max-w-md text-[16px] leading-7 text-[var(--site-body)]">
                  Veli, sadece sonuç sayısını değil; öğrencinin matematikte nerede zorlandığını anlatan kısa bir özet alır.
                  Aşağıdaki örnek temsilîdir.
                </p>
              </div>
              <figure className="rounded-[24px] border border-[var(--site-line)] bg-white p-7 shadow-[0_40px_80px_-50px_rgba(20,20,15,0.3)]">
                <figcaption className="flex items-center justify-between border-b border-[var(--site-line)] pb-4">
                  <span className="text-[15px] font-semibold text-[var(--site-ink)]">{data.sampleSummary.heading}</span>
                  <span className="rounded-full bg-[var(--brand-orange-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-orange-ink)]">
                    Örnek
                  </span>
                </figcaption>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  {data.sampleSummary.rows.map((row) => (
                    <div key={row.label} className="rounded-[16px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--site-muted)]">
                        {row.label}
                      </dt>
                      <dd className="mt-1 text-[13.5px] leading-6 text-[var(--site-ink)]">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </figure>
            </div>
          </section>
        ) : null}

        {data.resources?.length ? (
          <section className="border-y border-[var(--site-line)] bg-[var(--site-bg-warm)]">
            <div className="site-container py-14 sm:py-18">
              <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
                <div>
                  <p className="site-kicker">Matematik rehberleri</p>
                  <h2 className="mt-3 font-display text-[clamp(1.8rem,3.6vw,2.5rem)] leading-tight text-[var(--site-ink)]">
                    Çalışma planını doğru içerikle destekleyin.
                  </h2>
                  <p className="mt-4 text-[15px] leading-7 text-[var(--site-body)]">
                    Sınav hedefinize göre hazırlanmış program, soru çözümü ve deneme analizi rehberlerine geçin.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.resources.map((resource) => (
                    <Link
                      key={resource.href}
                      href={resource.href}
                      className="group flex min-h-16 items-center justify-between gap-4 rounded-[18px] border border-[var(--site-line)] bg-white p-4 text-[14.5px] font-semibold leading-6 text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)]"
                    >
                      {resource.label}
                      <ArrowUpRight size={16} className="shrink-0 text-[var(--brand-orange-ink)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* PAKETLER */}
        <section id="paketler" className="scroll-mt-24 border-t border-[var(--site-line)] bg-[var(--site-bg-warm)]">
          <div className="site-container py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="site-eyebrow">Paket fiyatı</span>
              <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,2.7rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">
                {packageGroup.title}
              </h2>
              <p className="mt-4 text-[16px] leading-7 text-[var(--site-body)]">{packageGroup.subtitle}</p>
            </div>

            <div className={`mt-10 grid gap-5 ${packages.length > 1 ? "sm:grid-cols-2" : "mx-auto max-w-md"}`}>
              {packages.map((pkg) => (
                <article
                  key={`${packageGroup.key}-${pkg.subject}`}
                  className="flex flex-col rounded-[24px] border border-[var(--site-line)] bg-white p-7 shadow-[0_1px_2px_rgba(20,20,15,0.03)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--site-muted)]">
                        {pkg.category}
                      </p>
                      <h3 className="mt-1 font-display text-[24px] text-[var(--site-ink)]">{pkg.name}</h3>
                    </div>
                    {pkg.badge ? (
                      <span className="shrink-0 rounded-full bg-[var(--brand-orange-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--brand-orange-ink)]">
                        {pkg.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[14.5px] leading-6 text-[var(--site-body)]">{pkg.tagline}</p>

                  <div className="mt-5 rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4">
                    <p className="inline-flex rounded-full border border-[var(--site-line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-orange-ink)]">
                      {pkg.quota}
                    </p>
                    {pkg.oldPrice ? (
                      <p className="mt-2 text-[14px] font-medium text-[var(--site-muted)] line-through">{pkg.oldPrice}</p>
                    ) : null}
                    <p className="mt-1 font-display text-[30px] leading-none text-[var(--site-ink)]">{pkg.discountedPrice}</p>
                    {pkg.perLessonPrice ? (
                      <p className="mt-2 text-[12px] font-semibold text-[var(--site-muted)]">{pkg.perLessonPrice}</p>
                    ) : null}
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {[...pkg.examFocus, ...pkg.features].map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[14.5px] leading-6 text-[var(--site-body)]">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-orange-ink)]" strokeWidth={2.4} aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <PurchaseFunnelTrigger
                    source={`${key}_${pkg.subject}_package_cta`}
                    packageName={pkg.name}
                    category={pkg.category}
                    subject={pkg.subject}
                    priceLabel={pkg.discountedPrice}
                    paymentLink={getPackagePaymentLink(pkg.category, pkg.subject) ?? ""}
                    className="site-btn site-btn-primary mt-7 w-full"
                    analyticsId={`${key}_${pkg.subject}_package_cta`}
                  >
                    {pkg.cta}
                  </PurchaseFunnelTrigger>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SSS */}
        <section className="site-container py-16 sm:py-20">
          <h2 className="font-display text-[clamp(1.9rem,4vw,2.7rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">
            Sık sorulan sorular
          </h2>
          <div className="mt-8 divide-y divide-[var(--site-line)] overflow-hidden rounded-[24px] border border-[var(--site-line)] bg-white">
            {data.faq.map((item) => (
              <details key={item.q} className="group px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-semibold text-[var(--site-ink)] [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="shrink-0 text-[var(--brand-orange-ink)] transition-transform duration-200 group-open:rotate-45">
                    <Plus size={20} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                </summary>
                <p className="pb-5 pr-8 text-[15px] leading-7 text-[var(--site-body)]">{item.a}</p>
              </details>
            ))}
          </div>
          <a
            href="/sss"
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--brand-orange-ink)] hover:underline"
          >
            Tüm soru ve cevaplar — Sıkça Sorulanlar
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </section>

        {/* SON CTA */}
        <section className="site-container pb-20">
          <div className="overflow-hidden rounded-[32px] bg-[var(--brand-orange)] px-8 py-14 text-center text-white sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.9rem,4vw,2.9rem)] leading-tight tracking-[-0.02em]">
              Doğru gruba birlikte karar verelim.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[16.5px] leading-7 text-white">
              Kısa bir ön görüşmeyle seviyeyi, hedefi ve ders temposunu konuşalım.
            </p>
            <div className="mt-8 flex justify-center">
              <LeadFunnelTrigger
                source={`${key}_landing_final_cta`}
                eventName="landing_cta_click"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[16px] font-bold text-[var(--brand-orange-ink)] transition-colors hover:bg-[var(--brand-orange-tint)]"
              >
                Ön görüşme talep et
                <ArrowUpRight size={18} aria-hidden="true" />
              </LeadFunnelTrigger>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
