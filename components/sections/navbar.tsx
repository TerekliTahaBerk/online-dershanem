"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { subjectPackageGroups } from "@/lib/content";

const links = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Ders Paketi", href: "/matematik-ders-paketi/" },
  { label: "Kamplar", href: "/kamplar/" },
  { label: "Misyonumuz", href: "/misyonumuz/" },
  { label: "SSS", href: "/sss/" },
  { label: "İletişim", href: "/iletisim/" }
];

const desktopLinks = links.filter((link) => link.href !== "/" && link.href !== "/sss/");

const lessonPkg = subjectPackageGroups[0].packages.find(
  (p) => p.subject === "Ders Paketi",
)!;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const trigger = menuButtonRef.current;
    const header = headerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    header?.setAttribute("inert", "");
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      header?.removeAttribute("inert");
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-40 w-full border-b border-[var(--od-line)] bg-[#FBFAF5]/92 text-[var(--od-ink)] backdrop-blur-xl">
        <div className="relative mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <Link href="/" aria-label="Online Dershanem ana sayfa" className="flex shrink-0 items-center">
            <Image
              src="/onlinedershanem_.png"
              alt="Online Dershanem"
              width={1050}
              height={200}
              priority
              sizes="150px"
              className="h-[26px] w-auto"
            />
          </Link>

          <nav aria-label="Ana menü" className="ml-auto hidden items-center gap-4 md:flex xl:gap-7">
            {desktopLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded-md px-1 py-2 text-[13.5px] transition-colors ${
                  isActive(l.href) ? "font-medium text-[var(--od-ink)]" : "text-[var(--od-ink-soft)] hover:text-[var(--od-ink)]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <a
              href="tel:+905377954434"
              className="hidden items-center gap-1.5 whitespace-nowrap text-[13.5px] font-medium text-[var(--od-ink)] lg:flex"
            >
              <Phone size={15} strokeWidth={1.6} className="text-[var(--od-olive-soft)]" aria-hidden="true" />
              0537 795 44 34
            </a>
            <PurchaseFunnelTrigger
              source="navbar_cta"
              packageName={lessonPkg.name}
              category={lessonPkg.category}
              subject={lessonPkg.subject}
              priceLabel={lessonPkg.discountedPrice}
              paymentLink=""
              className="inline-flex min-h-10 items-center justify-center rounded-[9px] bg-[var(--od-olive)] px-4 py-2 text-[13.5px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[#2C3A21]"
            >
              Sepete Ekle
            </PurchaseFunnelTrigger>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <PurchaseFunnelTrigger
              source="navbar_mobile_cta"
              packageName={lessonPkg.name}
              category={lessonPkg.category}
              subject={lessonPkg.subject}
              priceLabel={lessonPkg.discountedPrice}
              paymentLink=""
              className="inline-flex min-h-[42px] items-center justify-center rounded-[9px] bg-[var(--od-olive)] px-[15px] py-2 text-[14px] font-medium text-[var(--od-cream)] transition-colors duration-150 hover:bg-[#2C3A21]"
            >
              Sepete Ekle
            </PurchaseFunnelTrigger>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] border border-[var(--od-line)] bg-transparent text-[var(--od-ink)]"
              aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={open}
              aria-controls="mobile-navigation-dialog"
            >
              <Menu size={20} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div
        ref={dialogRef}
        id="mobile-navigation-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Mobil menü"
        aria-hidden={!open}
        className={`fixed inset-0 z-[100] flex flex-col bg-[var(--od-cream)] text-[var(--od-ink)] transition-[opacity,transform,visibility] md:hidden ${
          open
            ? "visible translate-y-0 opacity-100 duration-200"
            : "invisible -translate-y-2 opacity-0 duration-200"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--od-line)] px-[clamp(20px,6vw,32px)]">
          <Link href="/" onClick={() => setOpen(false)} aria-label="Online Dershanem ana sayfa">
            <Image
              src="/onlinedershanem_.png"
              alt="Online Dershanem"
              width={1050}
              height={200}
              sizes="150px"
              className="h-[26px] w-auto"
            />
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Menüyü kapat"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-[var(--od-line)]"
          >
            <X size={20} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Mobil menü" className="flex-1 overflow-y-auto px-[clamp(20px,6vw,32px)] py-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`block border-b border-[var(--od-line)] py-5 font-display text-[26px] font-medium tracking-[-0.01em] last:border-b-0 ${
                isActive(link.href) ? "text-[var(--od-olive)]" : "text-[var(--od-ink)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 flex-col gap-4 border-t border-[var(--od-line)] px-[clamp(20px,6vw,32px)] pb-[max(28px,env(safe-area-inset-bottom))] pt-5">
          <a
            href="tel:+905377954434"
            className="flex items-center gap-3 text-[22px] font-semibold"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[var(--od-cream-2)] text-[var(--od-olive-soft)]">
              <Phone size={19} strokeWidth={1.6} aria-hidden="true" />
            </span>
            0537 795 44 34
          </a>
          <a
            href="https://wa.me/905377954434"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center justify-center gap-2.5 rounded-xl bg-[var(--od-mint)] px-5 py-4 text-[16px] font-semibold text-[#2C3A24]"
          >
            <MessageCircle size={20} strokeWidth={1.6} aria-hidden="true" />
            WhatsApp&apos;tan yazın
          </a>
        </div>
      </div>
    </>
  );
}
