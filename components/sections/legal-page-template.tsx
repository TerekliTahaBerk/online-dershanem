import Link from "next/link";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";

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
  const sectionId = (title: string) =>
    title
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ş/g, "s")
      .replace(/ç/g, "c")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const pathByTitle: Record<string, string> = {
    "İade Politikası": "/iade/",
    "Gizlilik Politikası": "/gizlilik/",
    "KVKK Aydınlatma Metni": "/kvkk/",
  };
  const canonicalPath = pathByTitle[pageTitle] ?? "/";

  return (
    <div className="site-scope">
      <SchemaJsonLd schema={breadcrumbJsonLd([
        { name: "Ana Sayfa", url: "/" },
        { name: pageTitle, url: canonicalPath },
      ])} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <PageHero
          eyebrow="Yasal Bilgilendirme"
          align="left"
          title={pageTitle}
          subtitle={intro}
          actions={
            <p className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--site-line)] bg-white px-4 py-2 text-[13px] text-[var(--site-muted)]">
              <ShieldCheck size={15} className="text-[var(--brand-olive)]" aria-hidden="true" />
              Yürürlük tarihi:
              <strong className="font-semibold text-[var(--site-ink)]">{effectiveDate}</strong>
            </p>
          }
        />

        <section className="site-container py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <p className="site-kicker">Bu metinde</p>
              <nav aria-label={`${pageTitle} bölüm başlıkları`} className="mt-4 border-y border-[var(--site-line)]">
                {sections.map((section, index) => (
                  <Link
                    key={section.title}
                    href={`#${sectionId(section.title)}`}
                    className="flex min-h-12 items-center gap-3 border-b border-[var(--site-line)] py-3 text-[13.5px] leading-5 text-[var(--site-body)] last:border-b-0 hover:text-[var(--brand-olive)]"
                  >
                    <span className="text-[11px] font-bold text-[var(--site-muted)]">{String(index + 1).padStart(2, "0")}</span>
                    {section.title.replace(/^\d+\.\s*/, "")}
                  </Link>
                ))}
              </nav>
              <div className="mt-5 rounded-[18px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4">
                <Mail size={17} className="text-[var(--brand-olive)]" aria-hidden="true" />
                <p className="mt-3 text-[12.5px] leading-6 text-[var(--site-body)]">Bu metinle ilgili bir sorunuz varsa ekibimize yazabilirsiniz.</p>
                <Link href="/iletisim" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--brand-olive)] hover:underline">
                  İletişime geç <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </aside>

            <div className="overflow-hidden rounded-[26px] border border-[var(--site-line)] bg-white px-6 sm:px-10">
              {sections.map((section, idx) => (
                <article
                  key={section.title}
                  id={sectionId(section.title)}
                  className="scroll-mt-28 border-b border-[var(--site-line)] py-8 last:border-b-0 sm:py-10"
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-olive-soft)] text-[11px] font-bold text-[var(--brand-olive)]">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h2 className="font-display text-[22px] font-normal leading-tight tracking-[-0.01em] text-[var(--site-ink)] sm:text-[27px]">
                      {section.title}
                    </h2>
                  </div>
                  <div className="mt-5 space-y-4 pl-0 text-[15px] leading-7 text-[var(--site-body)] sm:pl-12">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
