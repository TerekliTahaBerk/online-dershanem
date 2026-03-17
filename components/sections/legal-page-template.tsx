import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { Container } from "@/components/ui/container";

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

export function LegalPageTemplate({ pageTitle, intro, effectiveDate, sections }: LegalPageTemplateProps) {
  return (
    <>
      <Navbar />
      <main className="pb-16 pt-14 sm:pt-20">
        <Container>
          <article className="mx-auto max-w-4xl rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Yasal Bilgilendirme</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{pageTitle}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">{intro}</p>
            <p className="mt-3 text-xs font-semibold text-muted">Yürürlük tarihi: {effectiveDate}</p>

            <div className="mt-8 space-y-6">
              {sections.map((section) => (
                <section key={section.title} className="rounded-2xl border border-line bg-soft p-5">
                  <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
                  <div className="mt-3 space-y-3">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-relaxed text-muted">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </Container>
      </main>
      <Footer />
      <StickyContactBar />
    </>
  );
}
