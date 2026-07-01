import Image from "next/image";
import Link from "next/link";
import { Instagram, Linkedin, Send, MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { contact } from "@/lib/content";
import { ContactLink } from "@/components/ui/contact-link";

const productLinks = [
  { label: "Matematik Ders Paketi", href: "/matematik-ders-paketi/" },
  { label: "Matematik Kampları", href: "/kamplar/" },
  { label: "Misyonumuz", href: "/misyonumuz/" },
  { label: "İletişim", href: "/iletisim/" },
];
const supportLinks = [
  { label: "Sıkça Sorulanlar", href: "/sss/" },
  { label: "İade Politikası", href: "/iade/" },
  { label: "Gizlilik", href: "/gizlilik/" },
  { label: "KVKK", href: "/kvkk/" },
];

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/onlinedershanem.tr/",
    Icon: Instagram,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@onlinedershanem.tr",
    Icon: TikTokIcon,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/onlinedershanem",
    Icon: Linkedin,
  },
  {
    label: "WhatsApp",
    href: `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`,
    Icon: MessageCircle,
  },
  {
    label: "E-posta",
    href: `mailto:${contact.email}`,
    Icon: Send,
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[var(--od-ink)] text-[#C7C7BD]">
      <div className="mx-auto max-w-[1080px] px-5 pb-8 pt-16 sm:px-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr]">
          {/* Brand + contact */}
          <div className="flex flex-col gap-5">
            <Link
              href="/"
              aria-label="Online Dershanem"
              className="inline-flex items-center text-[var(--od-cream)]"
            >
              <Image
                src="/onlinedershanem_.png"
                alt="Online Dershanem"
                width={1050}
                height={200}
                sizes="180px"
                className="h-7 w-auto [filter:brightness(0)_invert(1)]"
              />
            </Link>

            <p className="max-w-sm text-[13.5px] leading-6 text-[#A8A89E]">
              Online matematik dershanesi. En fazla 4 öğrencilik canlı dersler,
              her ders sonunda net çalışma planı ve veliye anlaşılır haftalık not.
            </p>

            {/* Contact details */}
            <ul className="mt-1 space-y-2.5 text-[13.5px] text-[#D6D6CD]">
              <li className="flex items-center gap-2.5">
                <Phone size={14} className="text-[var(--od-olive)]" />
                <ContactLink
                  href={`tel:${contact.phone}`}
                  channel="phone"
                  placement="footer_phone"
                  className="transition-colors hover:text-[var(--od-cream)]"
                >
                  {contact.phone}
                </ContactLink>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={14} className="text-[var(--od-olive)]" />
                <a
                  href={`mailto:${contact.email}`}
                  className="transition-colors hover:text-[var(--od-cream)]"
                >
                  {contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-[#A8A89E]">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--od-olive)]" />
                <span>{contact.address}</span>
              </li>
            </ul>

            {/* Socials */}
            <div className="mt-2 flex items-center gap-2">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-white/15 bg-white/5 text-[#D6D6CD] transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Link cols */}
          <div className="grid grid-cols-2 gap-8 lg:justify-self-end lg:gap-16">
            <FooterCol title="Ürün" links={productLinks} />
            <FooterCol title="Destek" links={supportLinks} />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[12.5px] text-[#85857B] sm:flex-row">
          <span>
            © {new Date().getFullYear()} Online Dershanem · Tüm hakları saklıdır.
          </span>
          <span className="flex items-center gap-3">
            <Link href="/gizlilik/" className="hover:text-[var(--od-cream)]">
              Gizlilik
            </Link>
            <span className="text-[#5F5F58]">·</span>
            <Link href="/kvkk/" className="hover:text-[var(--od-cream)]">
              KVKK
            </Link>
            <span className="text-[#5F5F58]">·</span>
            <Link href="/iade/" className="hover:text-[var(--od-cream)]">
              İade
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h5 className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#85857B]">
        {title}
      </h5>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-[14px] text-[#D6D6CD] transition-colors hover:text-[var(--od-cream)]"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* TikTok inline SVG (lucide doesn't ship one). */
function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89 2.92 2.92 0 0 1 .88.13v-3.55a6.45 6.45 0 0 0-.88-.06 6.41 6.41 0 1 0 6.41 6.41V8.86a8.4 8.4 0 0 0 4.92 1.59V6.99a4.85 4.85 0 0 1-1.22-.3z" />
    </svg>
  );
}
