import Image from "next/image";
import Link from "next/link";
import { Instagram, Linkedin, MessageCircle, Mail } from "lucide-react";
import { contact } from "@/lib/content";
import { footerColumns, footerTagline } from "@/lib/site-content";

const socials = [
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
    Icon: Mail,
  },
];

/**
 * Public site footer — referans tasarım: açık zemin, sol marka bloğu, sağda
 * minimal kolonlar, altta telif + yasal linkler.
 */
export function SiteFooter() {
  return (
    <footer id="site-footer" className="site-scope border-t border-[var(--site-line)] bg-[var(--site-bg-warm)]">
      <div className="site-container py-12 sm:py-16 lg:py-20">
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-x-12">
          {/* Marka */}
          <div className="flex max-w-sm flex-col gap-5">
            <Link href="/" aria-label="Online Dershanem ana sayfa" className="inline-flex">
              <Image
                src="/onlinedershanem_.png"
                alt="Online Dershanem"
                width={1050}
                height={200}
                sizes="180px"
                className="h-auto w-[180px]"
              />
            </Link>
            <p className="text-[14px] leading-6 text-[var(--site-body)]">{footerTagline}</p>
            <div className="mt-1 flex items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--site-line)] bg-white text-[var(--site-body)] transition-colors hover:border-[var(--brand-orange)] hover:text-[var(--brand-orange-ink)]"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Kolonlar */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--site-muted)]">
                {col.title}
              </h2>
              <ul className="mt-5 space-y-3.5">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}-${l.href}`}>
                    <Link
                      href={l.href}
                      className="text-[15.5px] text-[var(--site-body)] transition-colors hover:text-[var(--brand-orange-ink)]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[var(--site-line)] pt-6 text-[13px] text-[var(--site-muted)] sm:mt-12 sm:flex-row">
          <span>© {new Date().getFullYear()} Online Dershanem. Tüm hakları saklıdır.</span>
          <span className="flex items-center gap-4">
            <Link href="/gizlilik/" className="hover:text-[var(--site-ink)]">
              Gizlilik Politikası
            </Link>
            <Link href="/kvkk/" className="hover:text-[var(--site-ink)]">
              KVKK
            </Link>
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
