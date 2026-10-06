import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FooterCta } from "@/components/marketing/footer-cta";
import { listActivePublicProducts } from "@/lib/public-marketing-products-server";
import { publicProductDisplayName } from "@/lib/public-product-brands";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
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

export async function ExamSalesLanding({ data }: { data: ExamSalesLandingData }) {
  const products = await listActivePublicProducts();
  const packageGroup = subjectPackageGroups[0];
  const examCategory = data.examKey;
  const matchingPackages = packageGroup.packages.filter(
    (pkg) => pkg.category === examCategory,
  );
  const packages = matchingPackages.length
    ? matchingPackages
    : packageGroup.packages;
  const key = data.examKey.toLowerCase();

  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        {/* HERO */}
        <section className="border-b border-dc-line bg-dc-canvas">
          <div className="site-container grid gap-10 py-(--dc-section-tight) lg:grid-cols-[1.3fr_0.7fr] lg:items-center lg:gap-14">
            <div>
              <span className="dc-eyebrow">{data.heroBadge}</span>
              <h1 className="mt-4 max-w-[17ch] font-display text-(length:--public-display) leading-[1.08] tracking-[-0.02em] text-dc-ink text-balance">
                {data.heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-8 text-dc-ink-body">
                {data.heroText}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/urunler/online-dershanem" className="site-btn site-btn-primary site-btn-lg">Canlı öğrenmeyi incele</Link>
                <a
                  href="#paketler"
                  className="site-btn site-btn-secondary site-btn-lg"
                >
                  Fiyatı gör
                </a>
              </div>
            </div>

            <article className="rounded-[28px] border border-dc-line bg-white p-7 shadow-[0_40px_80px_-50px_rgba(20,20,15,0.35)] sm:p-8">
              <h2 className="font-display text-[22px] leading-snug text-dc-ink">
                Küçük grupta öğrenciye ne değişir?
              </h2>
              <ul className="mt-5 space-y-3.5">
                {data.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[15px] leading-6 text-dc-ink-body"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dc-brand-soft text-dc-brand-strong">
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
          <section className="site-container py-(--dc-section-tight)">
            <h2 className="max-w-3xl font-display text-(length:--public-title) leading-tight tracking-[-0.02em] text-dc-ink">
              {data.approach.heading}
            </h2>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {data.approach.items.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[22px] border border-dc-line bg-white p-6"
                >
                  <h3 className="font-display text-[19px] text-dc-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[14.5px] leading-6 text-dc-ink-body">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* PLAN */}
        {data.plan ? (
          <section className="border-y border-dc-line bg-dc-canvas">
            <div className="site-container py-(--dc-section-tight)">
              <h2 className="max-w-3xl font-display text-(length:--public-title) leading-tight tracking-[-0.02em] text-dc-ink">
                {data.plan.heading}
              </h2>
              {data.plan.note ? (
                <p className="mt-4 max-w-2xl text-[16px] leading-7 text-dc-ink-body">
                  {data.plan.note}
                </p>
              ) : null}
              <ol className="mt-9 grid gap-4 sm:grid-cols-2">
                {data.plan.steps.map((step, i) => (
                  <li
                    key={step.label}
                    className="flex items-start gap-4 rounded-[20px] border border-dc-line bg-white p-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dc-brand-soft font-display text-[16px] text-dc-brand-strong">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block text-[15.5px] font-semibold text-dc-ink">
                        {step.label}
                      </span>
                      <span className="mt-1 block text-[14px] leading-6 text-dc-ink-body">
                        {step.text}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {/* VELİ ÖZETİ */}
        {data.sampleSummary ? (
          <section className="site-container py-(--dc-section-tight)">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <h2 className="font-display text-(length:--public-title) leading-tight tracking-[-0.02em] text-dc-ink">
                  Veliye giden kısa gelişim özeti.
                </h2>
                <p className="mt-4 max-w-md text-[16px] leading-7 text-dc-ink-body">
                  Veli, sadece sonuç sayısını değil; öğrencinin matematikte
                  nerede zorlandığını anlatan kısa bir özet alır. Aşağıdaki
                  örnek temsilîdir.
                </p>
              </div>
              <figure className="rounded-dc-card border border-dc-line bg-white p-7 shadow-[0_40px_80px_-50px_rgba(20,20,15,0.3)]">
                <figcaption className="flex items-center justify-between border-b border-dc-line pb-4">
                  <span className="text-[15px] font-semibold text-dc-ink">
                    {data.sampleSummary.heading}
                  </span>
                  <span className="rounded-full bg-dc-brand-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-dc-brand-strong">
                    Örnek
                  </span>
                </figcaption>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  {data.sampleSummary.rows.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-od-lg border border-dc-line bg-dc-canvas p-4"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-dc-ink-muted">
                        {row.label}
                      </dt>
                      <dd className="mt-1 text-[13.5px] leading-6 text-dc-ink">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </figure>
            </div>
          </section>
        ) : null}

        {data.resources?.length ? (
          <section className="border-y border-dc-line bg-dc-canvas">
            <div className="site-container py-14 sm:py-[72px]">
              <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
                <div>
                  <p className="dc-eyebrow">Matematik rehberleri</p>
                  <h2 className="mt-3 font-display text-[clamp(1.8rem,3.6vw,2.5rem)] leading-tight text-dc-ink">
                    Çalışma planını doğru içerikle destekleyin.
                  </h2>
                  <p className="mt-4 text-[15px] leading-7 text-dc-ink-body">
                    Sınav hedefinize göre hazırlanmış program, soru çözümü ve
                    deneme analizi rehberlerine geçin.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.resources.map((resource) => (
                    <Link
                      key={resource.href}
                      href={resource.href}
                      className="group flex min-h-16 items-center justify-between gap-4 rounded-[18px] border border-dc-line bg-white p-4 text-[14.5px] font-semibold leading-6 text-dc-ink transition-colors hover:border-(--brand-orange)"
                    >
                      {resource.label}
                      <ArrowUpRight
                        size={16}
                        className="shrink-0 text-dc-brand-strong transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* PAKETLER */}
        <section
          id="paketler"
          className="scroll-mt-24 border-t border-dc-line bg-dc-canvas"
        >
          <div className="site-container py-(--dc-section-tight)">
            <div className="mx-auto max-w-2xl text-center">
              <span className="dc-eyebrow">Satın alınabilir matematik seçenekleri</span>
              <h2 className="mt-4 font-display text-(length:--public-title) leading-tight tracking-[-0.02em] text-dc-ink">
                {packageGroup.title}
              </h2>
              <p className="mt-4 text-[16px] leading-7 text-dc-ink-body">
                {packageGroup.subtitle}
              </p>
            </div>

            <div
              className={`mt-10 grid gap-5 ${packages.length > 1 ? "sm:grid-cols-2" : "mx-auto max-w-md"}`}
            >
              {packages.map((pkg) => (
                <article
                  key={`${packageGroup.key}-${pkg.subject}`}
                  className="flex flex-col rounded-dc-card border border-dc-line bg-white p-7 shadow-[0_1px_2px_rgba(20,20,15,0.03)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-dc-ink-muted">
                        {pkg.category}
                      </p>
                      <h3 className="mt-1 font-display text-[24px] text-dc-ink">
                        {pkg.name}
                      </h3>
                    </div>
                    {pkg.badge ? (
                      <span className="shrink-0 rounded-full bg-dc-brand-soft px-3 py-1 text-xs font-semibold text-dc-brand-strong">
                        {pkg.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[14.5px] leading-6 text-dc-ink-body">
                    {pkg.tagline}
                  </p>

                  <div className="mt-5 rounded-2xl border border-dc-line bg-dc-canvas p-4">
                    <p className="inline-flex rounded-full border border-dc-line bg-white px-2.5 py-1 text-xs font-semibold text-dc-brand-strong">
                      {pkg.quota}
                    </p>
                    {pkg.oldPrice ? (
                      <p className="mt-2 text-[14px] font-medium text-dc-ink-muted line-through">
                        {pkg.oldPrice}
                      </p>
                    ) : null}
                    <p className="mt-1 font-display text-[30px] leading-none text-dc-ink">
                      {pkg.discountedPrice}
                    </p>
                    {pkg.perLessonPrice ? (
                      <p className="mt-2 text-[12px] font-semibold text-dc-ink-muted">
                        {pkg.perLessonPrice}
                      </p>
                    ) : null}
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {[...pkg.examFocus, ...pkg.features].map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-[14.5px] leading-6 text-dc-ink-body"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-dc-brand-strong"
                          strokeWidth={2.4}
                          aria-hidden="true"
                        />
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
                    paymentLink={
                      getPackagePaymentLink(pkg.category, pkg.subject) ?? ""
                    }
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

        <section className="site-container py-(--dc-section-tight)">
          <h2 className="font-display text-(length:--public-title) leading-[1.1] tracking-tight text-dc-ink">İhtiyacına göre diğer destekler</h2>
          <p className="mt-4 max-w-2xl text-[16px] leading-7 text-dc-ink-body">Canlı öğrenme matematikle sınırlı değil; güncel ders ve formatları ürün sayfasında inceleyebilirsin. Çalışma düzeni veya ölçme ihtiyacın varsa diğer destekleri ayrıca değerlendirebilirsin.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {products.map((product) => <Link key={product.slug} href={product.href} className="site-btn site-btn-secondary">{publicProductDisplayName(product)}</Link>)}
          </div>
        </section>
        <FaqAccordion items={data.faq} title="Sık sorulan sorular" tone="plain" showAllLink />
        <FooterCta title="Doğru başlangıcı birlikte belirleyelim." subtitle="Öğrencinin seviyesini, hedefini ve ihtiyaç duyduğu canlı ders desteğini konuşalım." ctaLabel="Ücretsiz ön görüşme" ctaHref="/iletisim#on-gorusme" />
      </main>
      <SiteFooter />
    </div>
  );
}
