import { Check, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";
import { PurchaseIntentForm } from "@/components/sections/purchase-intent-form";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { getPackagePaymentLink, subjectPackageGroups } from "@/lib/content";

type PackageGroupKey = "TYT-AYT" | "LGS";

type ExamSalesLandingData = {
  examKey: PackageGroupKey;
  heroBadge: string;
  heroTitle: string;
  heroText: string;
  highlights: string[];
  faq: Array<{ q: string; a: string }>;
};

export function ExamSalesLanding({ data }: { data: ExamSalesLandingData }) {
  const packageGroup = subjectPackageGroups.find((group) => group.key === data.examKey);

  if (!packageGroup) return null;

  return (
    <>
      <Navbar />
      <main>
        <section className="pb-12 pt-14 sm:pt-20">
          <Container>
            <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
              <div>
                <p className="inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold tracking-[0.12em] text-brand">
                  {data.heroBadge}
                </p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">{data.heroTitle}</h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{data.heroText}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <LeadFunnelTrigger
                    source={`${data.examKey.toLowerCase()}_landing_hero_primary`}
                    eventName="landing_cta_click"
                    className="inline-flex rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white"
                  >
                    Ücretsiz Denemeyi Başlat
                  </LeadFunnelTrigger>
                  <a
                    href="#paketler"
                    className="inline-flex rounded-full border border-line-strong bg-white px-6 py-3 text-sm font-semibold text-ink"
                  >
                    Paket Fiyatlarını Gör
                  </a>
                </div>
              </div>

              <article className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-ink">Bu model neden daha verimli?</h2>
                <ul className="mt-4 space-y-3 text-sm text-muted">
                  {data.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </Container>
        </section>

        <section id="paketler" className="scroll-mt-24 py-12 sm:py-14">
          <Container>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Paket Fiyatları</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{packageGroup.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{packageGroup.subtitle}</p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {packageGroup.packages.map((pkg) => (
                <article key={`${packageGroup.key}-${pkg.subject}`} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted/80">{pkg.category}</p>
                      <h3 className="mt-1 text-2xl font-bold text-ink">{pkg.subject}</h3>
                    </div>
                    {pkg.badge ? (
                      <span className="inline-flex rounded-full bg-mint px-3 py-1 text-[11px] font-semibold text-pine">{pkg.badge}</span>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-2xl border border-line bg-soft p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">{pkg.discountLabel}</p>
                    <p className="mt-1 inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                      {pkg.quota}
                    </p>
                    <p className="mt-1 text-sm font-medium text-muted line-through">{pkg.oldPrice}</p>
                    <p className="mt-1 text-2xl font-bold text-anchor">{pkg.discountedPrice}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">{pkg.perLessonPrice}</p>
                  </div>

                  <ul className="mt-5 space-y-2 text-sm text-muted">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-brand" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <PurchaseFunnelTrigger
                    source={`${data.examKey.toLowerCase()}_${pkg.subject}_package_cta`}
                    packageName={`${pkg.category} ${pkg.subject}`}
                    paymentLink={getPackagePaymentLink(pkg.category, pkg.subject) ?? ""}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-pine"
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
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Sık Sorulan Sorular</h2>
            <div className="mt-5 space-y-3">
              {data.faq.map((item) => (
                <details key={item.q} className="rounded-2xl border border-line bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">{item.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        <section className="pb-20 pt-8">
          <Container>
            <div className="rounded-3xl border border-line bg-white p-7 shadow-soft sm:p-10">
              <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Uygun paketi birlikte seçelim</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                1 dakikalık başvuru ile seviyene uygun gruba yerleşim önerini ve fiyat detaylarını netleştirelim.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LeadFunnelTrigger
                  source={`${data.examKey.toLowerCase()}_landing_final_cta`}
                  eventName="landing_cta_click"
                  className="inline-flex rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white"
                >
                  Hemen Başvur
                </LeadFunnelTrigger>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <MultiStepLeadForm />
      <PurchaseIntentForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
