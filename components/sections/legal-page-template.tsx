import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

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

export function LegalPageTemplate({
  pageTitle,
  intro,
  effectiveDate,
  sections,
}: LegalPageTemplateProps) {
  return (
    <>
      <Navbar />
      <main className="od-public bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* Hero */}
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-3xl px-5 pt-28 pb-14 sm:pt-36 sm:pb-20 text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
              Yasal Bilgilendirme
            </span>
            <h1 className="mt-5 font-display text-[42px] font-normal leading-[1.05] tracking-tight text-[var(--od-ink)] sm:text-[60px]">
              {pageTitle}
            </h1>
            <p className="mt-6 text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              {intro}
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--od-line)] bg-white/70 px-3 py-1 text-[12px] text-[#7A7A6F]">
              Yürürlük tarihi: <strong className="font-medium text-[var(--od-ink)]">{effectiveDate}</strong>
            </p>
          </div>
        </section>

        {/* Body */}
        <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
          <div className="space-y-10">
            {sections.map((section, idx) => (
              <article
                key={section.title}
                className="border-b border-[var(--od-line)] pb-10 last:border-b-0 last:pb-0"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-[22px] text-[var(--od-olive)]/70">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-display text-[24px] font-normal leading-tight tracking-tight text-[var(--od-ink)] sm:text-[28px]">
                    {section.title}
                  </h2>
                </div>
                <div className="mt-5 space-y-4 pl-9 text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
