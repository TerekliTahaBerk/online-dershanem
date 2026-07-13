import { Plus } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { FooterCta } from "@/components/marketing/footer-cta";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { contact, faqCategories } from "@/lib/content";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Sıkça Sorulanlar",
  description:
    "Online Dershanem hakkında sık sorulan sorular: ders modeli, seviye ve grup yerleşimi, ödeme ve iade, veli takibi, teknik gereksinimler ve uygunluk.",
  canonical: "/sss",
  imageAlt: "Online Dershanem sıkça sorulan sorular",
});

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
      <main id="main-content" tabIndex={-1}>
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

        <FooterCta
          title="Sorunuz hâlâ duruyor mu?"
          subtitle="Öğrencinin sınıfını, matematik hedefini veya paket sürecini ücretsiz görüşmede konuşalım."
          ctaLabel="Bize ulaşın"
          ctaHref="/iletisim/"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
