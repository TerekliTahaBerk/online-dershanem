"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { primaryNav, navCta, navLogin } from "@/lib/site-content";
import { MobileMenu } from "@/components/site/mobile-menu";

/**
 * Public site header — referans tasarım: sol menü · ortada logo · sağda
 * yardımcı bağlantı + yeşil CTA. Minimal, beyaz, hafif sticky.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const header = headerRef.current;
    if (open) header?.setAttribute("inert", "");
    else header?.removeAttribute("inert");
  }, [open]);

  const isActive = (href: string) => {
    const clean = href.replace(/\/$/, "");
    if (clean === "") return pathname === "/";
    return pathname === clean || pathname.startsWith(`${clean}/`);
  };

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[200] -translate-y-24 rounded-full bg-[var(--site-ink)] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Ana içeriğe geç
      </a>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 w-full border-b border-[var(--site-line)] bg-white/85 backdrop-blur-xl"
      >
        <div className="site-container">
          <div className="flex h-[70px] items-center justify-between gap-5">
            {/* Sol — masaüstü menü */}
            <nav
              aria-label="Ana menü"
              className="hidden items-center gap-1 lg:order-2 lg:flex"
            >
              {primaryNav.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`rounded-full px-3.5 py-2 text-[14.5px] transition-colors ${
                    isActive(link.href)
                      ? "font-semibold text-[var(--site-ink)]"
                      : "text-[var(--site-body)] hover:text-[var(--site-ink)]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Orta — logo */}
            <Link
              href="/"
              aria-label="Online Dershanem ana sayfa"
              className="flex shrink-0 items-center lg:order-1"
            >
              <Image
                src="/onlinedershanem_.png"
                alt="Online Dershanem"
                width={1050}
                height={200}
                priority
                sizes="160px"
                className="h-auto w-[150px] sm:w-[160px]"
              />
            </Link>

            {/* Sağ — aksiyonlar / hamburger */}
            <div className="ml-auto flex items-center gap-2 lg:order-3 sm:gap-3">
              <Link
                href={navLogin.href}
                aria-current={isActive(navLogin.href) ? "page" : undefined}
                className="hidden rounded-full px-3.5 py-2 text-[14.5px] text-[var(--site-body)] transition-colors hover:text-[var(--site-ink)] lg:inline-flex"
              >
                {navLogin.label}
              </Link>

              <Link
                href={navCta.href}
                className="site-btn site-btn-primary site-btn-sm !hidden lg:!inline-flex"
              >
                {navCta.label}
              </Link>

              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--site-line)] text-[var(--site-ink)] lg:hidden"
                aria-label="Menüyü aç"
                aria-expanded={open}
                aria-controls="site-mobile-menu"
              >
                <Menu size={20} strokeWidth={1.7} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
        isActive={isActive}
        triggerRef={menuButtonRef}
      />
    </>
  );
}
