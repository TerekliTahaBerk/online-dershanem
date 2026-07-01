import { Check, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
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
};

export function ExamSalesLanding({ data }: { data: ExamSalesLandingData }) {
  // Tek matematik paket grubu — tüm sınav landing'leri aynı kataloğu gösterir.
  const packageGroup = subjectPackageGroups[0];

  return (
    <>
      <Navbar />
      <main className="od-public bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="border-b border-[var(--od-line)] bg-[var(--od-sky-soft)]/65 pb-12 pt-14 sm:pt-20">
          <Container>
            <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
              <div>
                <p className="inline-flex rounded-full border border-[var(--od-line)] bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[var(--od-olive)]">
                  {data.heroBadge}
                </p>
                <h1 className="mt-4 text-4xl font-bold tracking-normal text-[var(--od-ink)] sm:text-5xl">{data.heroTitle}</h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--od-ink-soft)]">{data.heroText}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <LeadFunnelTrigger
                    source={`${data.examKey.toLowerCase()}_landing_hero_primary`}
                    eventName="landing_cta_click"
                    className="inline-flex rounded-full bg-[var(--od-olive)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2E3B24]"
                  >
                    Ders Paketini İncele
                  </LeadFunnelTrigger>
                  <a
                    href="#paketler"
                    className="inline-flex rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-sm font-semibold text-[var(--od-ink)]"
                  >
                    Fiyatı Gör
                  </a>
                </div>
              </div>

              <article className="rounded-[24px] border border-[var(--od-line)] bg-white/90 p-6 shadow-[0_22px_54px_-42px_rgba(20,20,15,0.24)]">
                <h2 className="text-lg font-semibold text-[var(--od-ink)]">Bu model öğrenciyi nasıl görünür kılar?</h2>
                <ul className="mt-4 space-y-3 text-sm text-[var(--od-ink-soft)]">
                  {data.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--od-olive)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </Container>
        </section>

        {data.approach ? (
          <section className="border-b border-[var(--od-line)] py-12 sm:py-14">
            <Container>
              <h2 className="max-w-3xl text-3xl font-bold tracking-normal text-[var(--od-ink)] sm:text-4xl">
                {data.approach.heading}
              </h2>
              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {data.approach.items.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[20px] border border-[var(--od-line)] bg-white p-6"
                  >
                    <h3 className="text-base font-bold text-[var(--od-ink)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--od-ink-soft)]">{item.body}</p>
                  </div>
                ))}
              </div>
            </Container>
          </section>
        ) : null}

        {data.plan ? (
          <section className="border-b border-[var(--od-line)] bg-[var(--od-cream)] py-12 sm:py-14">
            <Container>
              <h2 className="max-w-3xl text-3xl font-bold tracking-normal text-[var(--od-ink)] sm:text-4xl">
                {data.plan.heading}
              </h2>
              {data.plan.note ? (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--od-ink-soft)]">
                  {data.plan.note}
                </p>
              ) : null}
              <ol className="mt-7 grid gap-3 sm:grid-cols-2">
                {data.plan.steps.map((step, i) => (
                  <li
                    key={step.label}
                    className="grid grid-cols-[40px_1fr] items-start gap-2 rounded-[18px] border border-[var(--od-line)] bg-white p-4"
                  >
                    <span className="text-lg font-black text-[var(--od-olive)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-[var(--od-ink)]">{step.label}</span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-[var(--od-ink-soft)]">
                        {step.text}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Container>
          </section>
        ) : null}

        {data.sampleSummary ? (
          <section className="border-b border-[var(--od-line)] py-12 sm:py-14">
            <Container>
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <h2 className="text-3xl font-bold tracking-normal text-[var(--od-ink)] sm:text-4xl">
                    Veliye giden sade gelişim özeti.
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--od-ink-soft)]">
                    Veli, çıplak net yerine çocuğunun matematikte nerede olduğunu
                    anlatan kısa bir özet alır. Aşağıdaki örnek temsilîdir.
                  </p>
                </div>
                <figure className="rounded-[22px] border border-[var(--od-line)] bg-white p-6 shadow-[0_22px_54px_-42px_rgba(20,20,15,0.24)]">
                  <figcaption className="flex items-center justify-between border-b border-[var(--od-line)] pb-3">
                    <span className="text-sm font-extrabold text-[var(--od-ink)]">
                      {data.sampleSummary.heading}
                    </span>
                    <span className="rounded-full bg-[var(--od-olive)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--od-olive)]">
                      Örnek
                    </span>
                  </figcaption>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {data.sampleSummary.rows.map((row) => (
                      <div key={row.label} className="rounded-[14px] border border-[var(--od-line)] bg-[var(--od-cream)] p-3.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8B8B7E]">
                          {row.label}
                        </dt>
                        <dd className="mt-1 text-[13px] leading-6 text-[var(--od-ink)]">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </figure>
              </div>
            </Container>
          </section>
        ) : null}

        <section id="paketler" className="scroll-mt-24 py-12 sm:py-14">
          <Container>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--od-olive)]">Paket Fiyatı</p>
              <h2 className="mt-3 text-3xl font-bold tracking-normal text-[var(--od-ink)] sm:text-4xl">{packageGroup.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--od-ink-soft)]">{packageGroup.subtitle}</p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {packageGroup.packages.map((pkg) => (
                <article key={`${packageGroup.key}-${pkg.subject}`} className="rounded-[24px] border border-[var(--od-line)] bg-white p-6 shadow-[0_18px_44px_-36px_rgba(20,20,15,0.14)]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--od-ink-soft)]">{pkg.category}</p>
                      <h3 className="mt-1 text-2xl font-bold text-[var(--od-ink)]">{pkg.name}</h3>
                    </div>
                    {pkg.badge ? (
                      <span className="inline-flex rounded-full bg-[var(--od-mint)] px-3 py-1 text-[11px] font-semibold text-[var(--od-olive)]">{pkg.badge}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--od-ink-soft)]">{pkg.tagline}</p>

                  <div className="mt-4 rounded-2xl border border-[var(--od-line)] bg-[var(--od-blush)]/45 p-4">
                    <p className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--od-olive)]">
                      {pkg.quota}
                    </p>
                    {pkg.oldPrice ? (
                      <p className="mt-1 text-sm font-medium text-[var(--od-ink-soft)] line-through">{pkg.oldPrice}</p>
                    ) : null}
                    <p className="mt-1 text-2xl font-bold text-[var(--od-ink)]">{pkg.discountedPrice}</p>
                    {pkg.perLessonPrice ? (
                      <p className="mt-1 text-xs font-semibold text-[var(--od-ink-soft)]">{pkg.perLessonPrice}</p>
                    ) : null}
                  </div>

                  <ul className="mt-5 space-y-2 text-sm text-[var(--od-ink-soft)]">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-[var(--od-olive)]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <PurchaseFunnelTrigger
                    source={`${data.examKey.toLowerCase()}_${pkg.subject}_package_cta`}
                    packageName={pkg.name}
                    category={pkg.category}
                    subject={pkg.subject}
                    priceLabel={pkg.discountedPrice}
                    paymentLink={getPackagePaymentLink(pkg.category, pkg.subject) ?? ""}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--od-olive)] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2E3B24]"
                    analyticsId={`${data.examKey.toLowerCase()}_${pkg.subject}_package_cta`}
                  >
                    {pkg.cta}
                  </PurchaseFunnelTrigger>
                </article>
              ))}
            </div>
          </Container>
        </section>

        <section className="py-12 sm:py-14">
          <Container>
            <h2 className="text-3xl font-bold tracking-normal text-[var(--od-ink)] sm:text-4xl">Sık Sorulan Sorular</h2>
            <div className="mt-5 space-y-3">
              {data.faq.map((item) => (
                <details key={item.q} className="rounded-2xl border border-[var(--od-line)] bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--od-ink)]">{item.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--od-ink-soft)]">{item.a}</p>
                </details>
              ))}
            </div>
            <a
              href="/sss/"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--od-olive)] underline-offset-2 hover:underline"
            >
              Tüm soru ve cevaplar — Sıkça Sorulanlar
            </a>
          </Container>
        </section>

        <section className="pb-20 pt-8">
          <Container>
            <div className="rounded-[24px] border border-[var(--od-line)] bg-[var(--od-yellow-soft)]/70 p-7 sm:p-10">
              <h2 className="text-3xl font-bold tracking-normal text-[var(--od-ink)] sm:text-4xl">Doğru gruba birlikte karar verelim</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--od-ink-soft)]">
                Kısa bir ön görüşmeyle seviyeyi, hedefi ve ders temposunu konuşalım.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LeadFunnelTrigger
                  source={`${data.examKey.toLowerCase()}_landing_final_cta`}
                  eventName="landing_cta_click"
                  className="inline-flex rounded-full bg-[var(--od-olive)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2E3B24]"
                >
                  Ön Görüşme Talep Et
                </LeadFunnelTrigger>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
