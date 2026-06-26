import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle, Instagram, Linkedin, Send } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { ContactLeadForm } from "@/components/sections/contact-lead-form";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "İletişim",
  description:
    "Öğrenciniz için doğru matematik temposunu birlikte belirlemek üzere Online Dershanem ekibine ulaşın.",
  alternates: { canonical: "/iletisim/" },
};

const channels = [
  {
    label: "Telefon",
    value: contact.phone,
    href: `tel:${contact.phone}`,
    Icon: Phone,
    note: "Hafta içi 09:00 — 21:00",
  },
  {
    label: "WhatsApp",
    value: contact.whatsapp,
    href: `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`,
    Icon: MessageCircle,
    note: "En hızlı dönüş",
  },
  {
    label: "E-posta",
    value: contact.email,
    href: `mailto:${contact.email}`,
    Icon: Mail,
    note: "Aynı gün yanıt",
  },
];

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/onlinedershanem.tr/", Icon: Instagram },
  { label: "TikTok", href: "https://www.tiktok.com/@onlinedershanem.tr", Icon: Send },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/onlinedershanem", Icon: Linkedin },
];

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
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* Hero */}
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-3xl px-5 pt-28 pb-14 sm:pt-36 sm:pb-20 text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
              İletişim
            </span>
            <h1 className="mt-5 font-display text-[42px] font-normal leading-[1.05] tracking-tight sm:text-[60px]">
              Öğrenciniz için doğru matematik temposunu birlikte belirleyelim.
            </h1>
            <p className="mt-6 text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              Öğrencinin sınıfını, hedefini ve derste nerede zorlandığını
              konuşalım. Uygun küçük grup başlangıcını ve ödeme sonrası hesap
              hazırlama sürecini net şekilde anlatalım.
            </p>
          </div>
        </section>

        {/* Ön görüşme formu */}
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
            <ContactLeadForm />
          </div>
        </section>

        {/* Channels grid */}
        <section>
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {channels.map(({ label, value, href, Icon, note }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex flex-col gap-4 rounded-[24px] border border-[var(--od-line)] bg-white p-7 transition hover:border-[var(--od-ink)]/30 hover:shadow-[0_20px_50px_-36px_rgba(20,20,15,0.18)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                  <Icon size={20} strokeWidth={1.6} />
                </span>
                <div>
                  <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#8B8B7E]">
                    {label}
                  </span>
                  <p className="mt-1.5 font-display text-[22px] leading-tight text-[var(--od-ink)] transition group-hover:text-[var(--od-olive)]">
                    {value}
                  </p>
                  <p className="mt-2 text-[13px] text-[var(--od-ink-soft)]">{note}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Address */}
          <div className="mt-10 grid gap-6 rounded-[24px] border border-[var(--od-line)] bg-white p-8 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                <MapPin size={20} strokeWidth={1.6} />
              </span>
              <div>
                <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#8B8B7E]">
                  Merkezimiz
                </span>
                <p className="mt-1.5 font-display text-[22px] leading-tight text-[var(--od-ink)]">
                  {contact.address}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--od-line)] bg-white text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Soft CTA */}
          <div className="mt-10 rounded-[24px] border border-[var(--od-line)] bg-[var(--od-blush)]/65 p-8 sm:p-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-[26px] leading-tight text-[var(--od-ink)] sm:text-[30px]">
                  Önce ders paketini birlikte değerlendirelim mi?
                </h3>
                <p className="mt-2 max-w-md text-[14.5px] text-[var(--od-ink-soft)]">
                  En fazla 4 öğrencilik canlı matematik dersi, ders sonrası
                  çalışma yönü ve veliye sade özet kapsamını inceleyin.
                </p>
              </div>
              <Link
                href="/#matematik-ders-paketi"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--od-olive)] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-[#2E3B24]"
              >
                Ders Paketini İncele
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
