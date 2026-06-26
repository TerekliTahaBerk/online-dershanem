import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { FaqAccordion } from "@/components/sections/faq-accordion";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { faqCategories } from "@/lib/content";

export const metadata: Metadata = {
  title: "Sıkça Sorulanlar",
  description:
    "Online Dershanem hakkında sık sorulan sorular: ders modeli, seviye ve grup yerleşimi, ödeme ve iade, veli takibi, teknik gereksinimler ve uygunluk.",
  alternates: { canonical: "/sss/" },
};

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
    <>
      <SchemaJsonLd
        schema={[
          faqJsonLd,
          breadcrumbJsonLd([
            { name: "Ana Sayfa", url: "/" },
            { name: "Sıkça Sorulanlar", url: "/sss/" },
          ]),
        ]}
      />
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-3xl px-5 pt-28 pb-14 sm:pt-36 sm:pb-20 text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
              Yardım Merkezi
            </span>
            <h1 className="mt-5 font-display text-[42px] font-normal leading-[1.05] tracking-tight sm:text-[60px]">
              Sıkça <em className="italic text-[var(--od-olive)]">sorulanlar</em>.
            </h1>
            <p className="mt-6 text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              Ders modeli, ödeme, küçük grup düzeni ve veli takibiyle ilgili en
              çok sorulanları kategorilere ayırdık. Cevabını bulamazsan bize
              yazabilirsin.
            </p>
          </div>
        </section>

        <div className="pt-14 sm:pt-20">
          <FaqAccordion categories={faqCategories} />
        </div>
      </main>
      <Footer />
    </>
  );
}
