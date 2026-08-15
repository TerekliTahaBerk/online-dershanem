import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Mail, ChevronDown } from "lucide-react";
import { contact } from "@/lib/content";
import { footerColumns, footerTagline, footerLegalLinks } from "@/lib/site-content";

const socials = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/onlinedershanem.tr/",
    Icon: InstagramIcon,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@onlinedershanem.tr",
    Icon: TikTokIcon,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/onlinedershanem",
    Icon: LinkedInIcon,
  },
  {
    label: "WhatsApp",
    href: `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`,
    Icon: MessageCircle,
  },
  {
    label: "E-posta",
    href: `mailto:${contact.email}`,
    Icon: Mail,
  },
];

/**
 * Public site footer — onaylı tasarım (Site Footer.dc.html):
 * koyu yeşil zemin, sol marka bloğu (1.4fr) + üç bağlantı kolonu,
 * altta telif ve yasal şerit. Mobilde kolonlar akordeona dönüşür
 * (handoff: "footer akordeon").
 */
export function SiteFooter() {
  return (
    <footer id="site-footer" className="site-scope dc-surface-deep">
      <div className="site-container py-14 sm:py-16">
        <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          {/* Marka */}
          <div className="flex max-w-sm flex-col gap-4">
            <Link href="/" aria-label="Online Dershanem ana sayfa" className="inline-flex">
              {/* Handoff: 36×36, radius 10. Renkli marka işareti — koyu zeminde
                  ters çevrilmez. */}
              <Image
                src="/design/od-logo.png"
                alt="Online Dershanem"
                width={1254}
                height={1254}
                sizes="36px"
                className="h-9 w-9 rounded-[10px] object-cover"
              />
            </Link>
            <p className="max-w-[280px] text-[14.5px] leading-[1.7] text-[var(--dc-on-deep-muted)]">
              {footerTagline}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--dc-on-deep-line)] text-[var(--dc-on-deep-body)] transition-colors hover:border-white/40 hover:text-white"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Kolonlar — mobilde <details> akordeon, lg'den itibaren düz liste */}
          {footerColumns.map((col) => (
            <details
              key={col.title}
              className="dc-footer-col group border-b border-[var(--dc-on-deep-line)] lg:border-0"
              open
            >
              <summary className="flex cursor-pointer list-none items-center justify-between py-3 lg:py-0">
                <h2 className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[var(--dc-on-deep-label)]">
                  {col.title}
                </h2>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="text-[var(--dc-on-deep-label)] transition-transform group-open:rotate-180 lg:hidden"
                />
              </summary>
              <ul className="flex flex-col gap-2.5 pb-4 pt-2 lg:pb-0 lg:pt-4">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}-${l.href}`}>
                    <Link
                      href={l.href}
                      className="text-[14.5px] font-medium text-[var(--dc-on-deep-body)] transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--dc-on-deep-line)] pt-5 text-[13px] text-[var(--dc-on-deep-faint)] sm:mt-13 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Onlinedershanem</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {footerLegalLinks.map((l, i) => (
              <span key={l.href} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden="true">·</span> : null}
                <Link href={l.href} className="transition-colors hover:text-white">
                  {l.label}
                </Link>
              </span>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89 2.92 2.92 0 0 1 .88.13v-3.55a6.45 6.45 0 0 0-.88-.06 6.41 6.41 0 1 0 6.41 6.41V8.86a8.4 8.4 0 0 0 4.92 1.59V6.99a4.85 4.85 0 0 1-1.22-.3z" />
    </svg>
  );
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.5 8.3H3.2V19h3.3V8.3ZM4.85 3A1.92 1.92 0 1 0 4.85 6.84 1.92 1.92 0 0 0 4.85 3ZM20.8 12.87c0-3.22-1.72-4.72-4.02-4.72-1.85 0-2.68 1.02-3.15 1.73V8.3h-3.3V19h3.3v-5.3c0-1.4.27-2.8 2.04-2.8 1.75 0 1.77 1.64 1.77 2.9V19h3.3l.06-6.13Z" />
    </svg>
  );
}
