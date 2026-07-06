import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { contact, faqCategories } from "@/lib/content";

export const metadata: Metadata = {
  title: "Sıkça Sorulanlar",
  description:
    "Online Dershanem hakkında sık sorulan sorular: ders modeli, seviye ve grup yerleşimi, ödeme ve iade, veli takibi, teknik gereksinimler ve uygunluk.",
  alternates: { canonical: "/sss" },
};

const waHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;
const telHref = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;

export default function SssPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqCategories.flatMap((cat) =>
      cat.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    ),
  };

  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={[
          faqJsonLd,
          breadcrumbJsonLd([
            { name: "Ana Sayfa", url: "/" },
            { name: "Sıkça Sorulanlar", url: "/sss/" },
          ]),
        ]}
      />
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Yardım Merkezi"
          title={
            <>
              Sık sorulan <span className="site-hl">sorular</span>
            </>
          }
          subtitle={
            <>
              Aradığınızı bulamazsanız{" "}
              <a href={waHref} className="font-semibold text-[var(--brand-orange-ink)] hover:underline">
                WhatsApp&apos;tan yazabilirsiniz
              </a>{" "}
              veya{" "}
              <a href={telHref} className="font-semibold text-[var(--brand-orange-ink)] hover:underline">
                bizi arayabilirsiniz
              </a>
              .
            </>
          }
        />

        <section className="site-container py-16 sm:py-20">
          <div className="mx-auto flex max-w-3xl flex-col gap-10">
            {faqCategories.map((cat) => (
              <div key={cat.category}>
                <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--brand-orange-ink)]">
                  {cat.category}
                </h2>
                <div className="divide-y divide-[var(--site-line)] overflow-hidden rounded-[24px] border border-[var(--site-line)] bg-white">
                  {cat.items.map((item) => (
                    <details key={item.q} className="group px-6">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-semibold text-[var(--site-ink)] [&::-webkit-details-marker]:hidden">
                        {item.q}
                        <span className="shrink-0 text-[var(--brand-orange-ink)] transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-open:rotate-45">
                          <Plus size={20} strokeWidth={1.7} aria-hidden="true" />
                        </span>
                      </summary>
                      <p className="pb-5 pr-8 text-[15px] leading-7 text-[var(--site-body)]">{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="site-container pb-20">
          <div className="overflow-hidden rounded-[32px] bg-[var(--brand-orange)] px-8 py-14 text-center text-white sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-xl font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-tight tracking-[-0.02em]">
              Sorunuz hâlâ duruyor mu?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[16px] leading-7 text-white/85">
              Kısa bir soru için de yazabilirsiniz; ilk fırsatta yanıtlarız.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={waHref}
                className="inline-flex min-h-12 items-center rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-[var(--brand-orange-ink)] transition-colors hover:bg-[var(--brand-orange-tint)]"
              >
                WhatsApp&apos;tan ulaşın
              </a>
              <a
                href={telHref}
                className="inline-flex min-h-12 items-center rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/20"
              >
                {contact.phone}
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
