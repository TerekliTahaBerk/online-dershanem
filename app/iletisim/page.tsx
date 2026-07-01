import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { ContactLeadForm } from "@/components/sections/contact-lead-form";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "İletişim",
  description:
    "Öğrencinizin matematikte nerede zorlandığını ve uygun ders temposunu konuşmak için bize ulaşabilirsiniz.",
  alternates: { canonical: "/iletisim/" },
};

const waHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;

export default function ContactPage() {
  return (
    <>
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "İletişim", url: "/iletisim/" },
        ])}
      />
      <Navbar />
      <main className="od-public overflow-x-hidden bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] pb-[clamp(48px,7vw,88px)] pt-[clamp(44px,7vw,84px)]">
          {/* Başlık */}
          <div className="mb-[clamp(36px,5vw,56px)] max-w-[52ch]">
            <h1 className="mb-[18px] font-display text-[clamp(32px,5vw,52px)] font-medium leading-[1.04] tracking-[-0.025em]">
              Aklınızdakileri <em className="font-normal italic">konuşalım.</em>
            </h1>
            <p className="text-[clamp(17px,2.2vw,19px)] leading-[1.6] text-[var(--od-ink-soft)]">
              WhatsApp veya telefonla doğrudan ulaşabilirsiniz. Formu tercih ederseniz
              adınızı ve numaranızı bırakmanız yeter; sizi arayıp gerisini birlikte konuşuruz.
            </p>
          </div>

          <div className="grid items-start gap-[clamp(24px,4vw,40px)] lg:grid-cols-[1fr_1fr]">
            {/* Sol: çalışan lead formu */}
            <ContactLeadForm />

            {/* Sağ: kanallar */}
            <div className="flex flex-col gap-3.5">
              <a
                href={waHref}
                className="flex items-center gap-4 rounded-2xl bg-[var(--od-mint)] px-6 py-[22px] transition-opacity hover:opacity-90"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--od-cream)] text-[#2C3A24]">
                  <MessageCircle size={18} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[16px] font-semibold">WhatsApp</div>
                  <div className="text-[14px] text-[#3B5232]">En hızlısı — buradan yazabilirsiniz</div>
                </div>
                <ArrowRight size={18} strokeWidth={1.7} className="ml-auto text-[#3B5232]" aria-hidden="true" />
              </a>

              <a
                href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                className="flex items-center gap-4 rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)] px-6 py-[22px] transition-colors hover:border-[var(--od-ink)]/30"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                  <Phone size={18} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[16px] font-semibold">Telefon</div>
                  <div className="text-[14px] text-[var(--od-ink-soft)]">{contact.phone}</div>
                </div>
                <ArrowRight size={18} strokeWidth={1.7} className="ml-auto text-[var(--od-ink-soft)]" aria-hidden="true" />
              </a>

              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-4 rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)] px-6 py-[22px] transition-colors hover:border-[var(--od-ink)]/30"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                  <Mail size={18} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-[16px] font-semibold">E-posta</div>
                  <div className="truncate text-[14px] text-[var(--od-ink-soft)]">{contact.email}</div>
                </div>
                <ArrowRight size={18} strokeWidth={1.7} className="ml-auto shrink-0 text-[var(--od-ink-soft)]" aria-hidden="true" />
              </a>

              <div className="flex items-center gap-4 rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)] px-6 py-[22px]">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                  <MapPin size={18} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[16px] font-semibold">Konum</div>
                  <div className="text-[14px] text-[var(--od-ink-soft)]">{contact.address}</div>
                </div>
              </div>

              {/* Cross-sell */}
              <div className="mt-1.5 rounded-2xl border border-[var(--od-line)] bg-[var(--od-cream-2)] px-6 py-[22px]">
                <div className="mb-1.5 text-[15px] font-semibold">
                  Önce paketi incelemek ister misiniz?
                </div>
                <p className="mb-3.5 text-[14px] leading-[1.55] text-[var(--od-ink-soft)]">
                  Fiyatı, derslerin kapsamını ve ödeme sonrası süreci tek sayfada görebilirsiniz.
                </p>
                <Link
                  href="/matematik-ders-paketi/"
                  className="inline-flex items-center gap-2 border-b border-[var(--od-olive-soft)] pb-0.5 text-[14px] font-medium text-[var(--od-olive)]"
                >
                  Matematik Ders Paketi&apos;ne git
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
