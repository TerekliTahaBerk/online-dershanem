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
 * "Giriş yap" + turuncu CTA. Minimal, beyaz, hafif sticky.
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
      <header
        ref={headerRef}
        className="sticky top-0 z-50 w-full border-b border-[var(--site-line)] bg-white/85 backdrop-blur-xl"
      >
        <div className="site-container">
          <div className="flex h-[68px] items-center justify-between gap-4 md:grid md:grid-cols-[1fr_auto_1fr]">
            {/* Sol — masaüstü menü */}
            <nav
              aria-label="Ana menü"
              className="hidden items-center gap-1 justify-self-start md:flex"
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
              className="flex shrink-0 items-center justify-self-center"
            >
              <Image
                src="/onlinedershanem_.png"
                alt="Online Dershanem"
                width={1050}
                height={200}
                priority
                sizes="160px"
                className="h-[27px] w-auto"
              />
            </Link>

            {/* Sağ — aksiyonlar / hamburger */}
            <div className="flex items-center gap-2 justify-self-end sm:gap-3">
              <Link
                href={navLogin.href}
                className="hidden text-[14.5px] font-medium text-[var(--site-body)] transition-colors hover:text-[var(--site-ink)] md:inline-flex"
              >
                {navLogin.label}
              </Link>

              <Link
                href={navCta.href}
                className="site-btn site-btn-primary site-btn-sm !hidden md:!inline-flex"
              >
                {navCta.label}
              </Link>

              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--site-line)] text-[var(--site-ink)] md:hidden"
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
