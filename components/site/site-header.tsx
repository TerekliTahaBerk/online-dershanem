"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { primaryNav, navCta, navLogin } from "@/lib/site-content";
import { MobileMenu } from "@/components/site/mobile-menu";
import { ProductsMenu } from "@/components/site/products-menu";

/**
 * Public site header — solda marka, ortada ürünler, sağda giriş ve CTA.
 * Genişlik ürün adlarını tek satırda taşımaya yetmediğinde mobil menüye geçer.
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
          {/* Handoff 01 Navbar: 76px, sticky; masaüstünde 1fr auto 1fr — solda
              menü, ortada marka, sağda giriş + birincil CTA. Mobilde 44px'lik
              satır + hamburger drawer. */}
          <div className="grid h-[56px] grid-cols-[auto_1fr] items-center gap-4 xl:h-[76px] xl:grid-cols-[1fr_auto_1fr]">
            {/* Sol — masaüstü menü */}
            <nav
              aria-label="Ana menü"
              className="hidden items-center gap-1 xl:order-1 xl:flex"
            >
              <ProductsMenu isActive={isActive} />
              {primaryNav.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-label={link.accessibleLabel}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`rounded-full px-3.5 py-2 text-[14.5px] font-semibold transition-colors ${
                    isActive(link.href)
                      ? "text-[var(--site-ink)]"
                      : "text-[var(--site-body)] hover:text-[var(--site-ink)]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Orta — marka */}
            <Link
              href="/"
              aria-label="Online Dershanem ana sayfa"
              className="flex shrink-0 items-center xl:order-2 xl:justify-self-center"
            >
              {/* Handoff: 38×38, radius 10, object-fit cover */}
              <Image
                src="/design/od-logo.png"
                alt="Online Dershanem"
                width={1254}
                height={1254}
                priority
                sizes="38px"
                className="h-9 w-9 rounded-[10px] object-cover sm:h-[38px] sm:w-[38px]"
              />
            </Link>

            {/* Sağ — aksiyonlar / hamburger */}
            <div className="ml-auto flex items-center gap-2 sm:gap-3 xl:order-3">
              <Link
                href={navLogin.href}
                aria-current={isActive(navLogin.href) ? "page" : undefined}
                className="hidden rounded-full px-3.5 py-2 text-[14.5px] text-[var(--site-body)] transition-colors hover:text-[var(--site-ink)] xl:inline-flex"
              >
                {navLogin.label}
              </Link>

              <Link
                href={navCta.href}
                className="site-btn site-btn-primary site-btn-sm !hidden xl:!inline-flex"
              >
                {navCta.label}
              </Link>

              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--site-line)] text-[var(--site-ink)] xl:hidden"
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
