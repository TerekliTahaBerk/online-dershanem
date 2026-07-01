import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { contact, faqCategories } from "@/lib/content";

export const metadata: Metadata = {
  title: "Sıkça Sorulanlar",
  description:
    "Online Dershanem hakkında sık sorulan sorular: ders modeli, seviye ve grup yerleşimi, ödeme ve iade, veli takibi, teknik gereksinimler ve uygunluk.",
  alternates: { canonical: "/sss/" },
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
      <main className="od-public overflow-x-hidden bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* HERO */}
        <section className="mx-auto max-w-[760px] px-[clamp(20px,4vw,40px)] pb-[clamp(24px,4vw,40px)] pt-[clamp(44px,7vw,84px)] text-center">
          <h1 className="mb-4 font-display text-[clamp(32px,5vw,52px)] font-medium leading-[1.04] tracking-[-0.025em]">
            Sık sorulan <em className="font-normal italic">sorular</em>
          </h1>
          <p className="text-[clamp(16px,2.2vw,18px)] leading-[1.6] text-[var(--od-ink-soft)]">
            Aradığınızı bulamazsanız{" "}
            <a
              href={waHref}
              className="border-b border-[var(--od-olive-soft)] font-medium text-[var(--od-olive)]"
            >
              WhatsApp&apos;tan yazın
            </a>{" "}
            veya{" "}
            <a
              href={telHref}
              className="border-b border-[var(--od-olive-soft)] font-medium text-[var(--od-olive)]"
            >
              arayın
            </a>
            .
          </p>
        </section>

        {/* KATEGORİLER */}
        <section className="mx-auto flex max-w-[760px] flex-col gap-9 px-[clamp(20px,4vw,40px)] pb-[clamp(48px,7vw,88px)]">
          {faqCategories.map((cat) => (
            <div key={cat.category}>
              <h2 className="mb-4 text-[14px] font-semibold uppercase tracking-[0.04em] text-[var(--od-olive-soft)]">
                {cat.category}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)]">
                {cat.items.map((item) => (
                  <details
                    key={item.q}
                    className="group border-b border-[var(--od-line)] last:border-b-0"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-[22px] py-5 [&::-webkit-details-marker]:hidden">
                      <span className="text-[16px] font-semibold">{item.q}</span>
                      <span className="shrink-0 text-[var(--od-olive-soft)] transition-transform duration-200 group-open:rotate-45">
                        <Plus size={20} strokeWidth={1.6} aria-hidden="true" />
                      </span>
                    </summary>
                    <div className="px-[22px] pb-5 text-[15px] leading-[1.6] text-[var(--od-ink-soft)]">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-olive)] text-[var(--od-cream)]">
          <div className="mx-auto max-w-[760px] px-[clamp(20px,4vw,40px)] py-[clamp(48px,7vw,80px)] text-center">
            <h2 className="mb-4 font-display text-[clamp(24px,3.6vw,36px)] font-medium tracking-[-0.02em]">
              Sorunuz hâlâ duruyor mu?
            </h2>
            <p className="mx-auto mb-7 max-w-[40ch] text-[16px] text-[#D8DCCF]">
              Bir cümlelik soru bile olsa yazın — hemen yanıtlarız.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={waHref}
                className="inline-flex min-h-12 items-center rounded-[11px] bg-[var(--od-cream)] px-6 py-3.5 text-[15px] font-medium text-[var(--od-olive)] transition-colors hover:bg-[var(--od-cream-2)]"
              >
                WhatsApp&apos;tan yaz
              </a>
              <a
                href={telHref}
                className="inline-flex min-h-12 items-center rounded-[11px] border border-[var(--od-cream)]/[0.28] bg-[var(--od-cream)]/10 px-6 py-3.5 text-[15px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[var(--od-cream)]/[0.18]"
              >
                {contact.phone}
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
