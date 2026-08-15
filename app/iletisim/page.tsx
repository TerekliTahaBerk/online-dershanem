import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle, ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { ContactLeadForm } from "@/components/sections/contact-lead-form";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { contact } from "@/lib/content";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "İletişim",
  description:
    "Öğrencinizin matematikte nerede zorlandığını ve uygun ders temposunu konuşmak için bize ulaşabilirsiniz.",
  canonical: "/iletisim",
  imageAlt: "Online Dershanem iletişim ve ücretsiz ön görüşme",
});

const waHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;

export default function ContactPage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "İletişim", url: "/iletisim/" },
        ])}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <PageHero
          eyebrow="İletişim"
          align="left"
          title={
            <>
              Aklınızdakileri <span className="site-hl">konuşalım.</span>
            </>
          }
          subtitle="WhatsApp veya telefonla doğrudan ulaşabilirsiniz. Formu tercih ederseniz yaklaşık bir dakikada iletişim, sınıf ve hedef bilgilerini paylaşabilirsiniz."
        />

        <section className="site-container pb-20 pt-10 sm:pb-28 sm:pt-14">
          <div className="grid items-start gap-6 lg:grid-cols-2">
            {/* Sol: çalışan lead formu */}
            <ContactLeadForm />

            {/* Sağ: kanallar */}
            <div className="flex flex-col gap-3.5">
              <a
                href={waHref}
                className="flex items-center gap-4 rounded-2xl border border-[var(--site-line)] bg-[var(--brand-orange-soft)] px-6 py-5 transition-colors hover:border-[var(--brand-orange)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand-orange-ink)]">
                  <MessageCircle size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[16px] font-semibold text-[var(--site-ink)]">WhatsApp</div>
                  <div className="text-[14px] text-[var(--site-body)]">En hızlısı — buradan yazabilirsiniz</div>
                </div>
                <ArrowRight size={18} strokeWidth={1.8} className="ml-auto text-[var(--brand-orange-ink)]" aria-hidden="true" />
              </a>

              <a
                href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                className="flex items-center gap-4 rounded-2xl border border-[var(--site-line)] bg-white px-6 py-5 transition-colors hover:border-[var(--brand-orange)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--site-bg-warm)] text-[var(--brand-orange-ink)]">
                  <Phone size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[16px] font-semibold text-[var(--site-ink)]">Telefon</div>
                  <div className="text-[14px] text-[var(--site-body)]">{contact.phone}</div>
                </div>
                <ArrowRight size={18} strokeWidth={1.8} className="ml-auto text-[var(--site-muted)]" aria-hidden="true" />
              </a>

              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-4 rounded-2xl border border-[var(--site-line)] bg-white px-6 py-5 transition-colors hover:border-[var(--brand-orange)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--site-bg-warm)] text-[var(--brand-orange-ink)]">
                  <Mail size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-[16px] font-semibold text-[var(--site-ink)]">E-posta</div>
                  <div className="truncate text-[14px] text-[var(--site-body)]">{contact.email}</div>
                </div>
                <ArrowRight size={18} strokeWidth={1.8} className="ml-auto shrink-0 text-[var(--site-muted)]" aria-hidden="true" />
              </a>

              <div className="flex items-center gap-4 rounded-2xl border border-[var(--site-line)] bg-white px-6 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--site-bg-warm)] text-[var(--brand-orange-ink)]">
                  <MapPin size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[16px] font-semibold text-[var(--site-ink)]">Konum</div>
                  <div className="text-[14px] text-[var(--site-body)]">{contact.address}</div>
                </div>
              </div>

              {/* Cross-sell */}
              <div className="mt-1.5 rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-6 py-6">
                <div className="mb-1.5 text-[15.5px] font-semibold text-[var(--site-ink)]">
                  Önce paketi incelemek ister misiniz?
                </div>
                <p className="mb-4 text-[14.5px] leading-6 text-[var(--site-body)]">
                  Fiyatı, derslerin kapsamını ve ödeme sonrası süreci tek sayfada görebilirsiniz.
                </p>
                <Link
                  href="/ders-paketleri"
                  className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--brand-orange-ink)] hover:underline"
                >
                  Ders Paketi&apos;ni gör
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
