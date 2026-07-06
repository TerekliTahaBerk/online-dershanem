import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalPageTemplateProps = {
  pageTitle: string;
  intro: string;
  effectiveDate: string;
  sections: LegalSection[];
};

/**
 * Yasal sayfa şablonu (KVKK / Gizlilik / İade) — yeni public site dili:
 * site-scope + büyük serif hero + numaralı, yuvarlak köşeli metin kartları.
 */
export function LegalPageTemplate({
  pageTitle,
  intro,
  effectiveDate,
  sections,
}: LegalPageTemplateProps) {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Yasal Bilgilendirme"
          title={pageTitle}
          subtitle={intro}
          actions={
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--site-line)] bg-white px-3.5 py-1.5 text-[13px] text-[var(--site-muted)]">
              Yürürlük tarihi:
              <strong className="font-semibold text-[var(--site-ink)]">{effectiveDate}</strong>
            </p>
          }
        />

        <section className="site-container py-16 sm:py-20">
          <div className="mx-auto max-w-3xl space-y-5">
            {sections.map((section, idx) => (
              <article
                key={section.title}
                className="rounded-[24px] border border-[var(--site-line)] bg-white p-7 shadow-[0_1px_2px_rgba(20,20,15,0.03)] sm:p-9"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-[22px] leading-none text-[var(--brand-orange-ink)]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-display text-[22px] font-normal leading-tight tracking-[-0.01em] text-[var(--site-ink)] sm:text-[26px]">
                    {section.title}
                  </h2>
                </div>
                <div className="mt-5 space-y-4 text-[15px] leading-7 text-[var(--site-body)]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
