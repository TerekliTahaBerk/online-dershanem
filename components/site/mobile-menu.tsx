"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Phone, MessageCircle } from "lucide-react";
import {
  primaryNavForDino,
  productsMenu,
  navCta,
  navLogin,
  waHref,
  telHref,
} from "@/lib/site-content";
import { contact } from "@/lib/content";
import type { PublicProduct } from "@/lib/product-architecture";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  isActive: (href: string) => boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  products: readonly PublicProduct[];
  dinoAiEnabled: boolean;
};

/**
 * Tam ekran mobil menü — erişilebilir dialog (focus-trap + Escape + body-lock).
 * Referans tasarımın sade mobil menüsü: büyük link listesi + giriş + CTA + iletişim.
 */
export function MobileMenu({
  open,
  onClose,
  isActive,
  triggerRef,
  products,
  dinoAiEnabled,
}: MobileMenuProps) {
  const primaryNav = primaryNavForDino(dinoAiEnabled);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(
      () => closeButtonRef.current?.focus(),
      0,
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.requestAnimationFrame(() => trigger?.focus());
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      id="site-mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Mobil menü"
      className="fixed inset-0 z-100 flex flex-col bg-white text-(--site-ink) lg:hidden"
    >
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-(--site-line) px-[clamp(20px,6vw,28px)]">
        <Link
          href="/"
          onClick={onClose}
          aria-label="onlinedershanem. ana sayfa"
        >
          <Image
            src="/design/od-logo.png"
            alt="onlinedershanem."
            width={1254}
            height={1254}
            sizes="38px"
            className="h-[38px] w-[38px] rounded-od object-cover"
          />
        </Link>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Menüyü kapat"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-(--site-line) text-(--site-ink)"
        >
          <X size={20} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>

      <nav
        aria-label="Mobil menü"
        className="flex-1 overflow-y-auto px-[clamp(20px,6vw,28px)] py-2"
      >
        {/* Ürünler — masaüstündeki açılır menünün mobil karşılığı */}
        <div className="border-b border-(--site-line) py-5">
          <h2 className="dc-eyebrow">{productsMenu.label}</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {products.map((product) => (
              <li key={product.href}>
                <Link
                  href={product.href}
                  onClick={onClose}
                  aria-current={isActive(product.href) ? "page" : undefined}
                  className={`block wrap-break-word font-display text-[clamp(1.2rem,5vw,1.45rem)] leading-tight ${
                    isActive(product.href)
                      ? "text-(--brand-orange-ink)"
                      : "text-(--site-ink)"
                  }`}
                >
                  {product.name}
                </Link>
                <span className="mt-0.5 block text-[13.5px] text-(--site-muted)">
                  {product.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {primaryNav.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.accessibleLabel}
            onClick={onClose}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={`block wrap-break-word border-b border-(--site-line) py-5 font-display text-[clamp(1.35rem,6vw,1.65rem)] leading-tight ${
              isActive(link.href)
                ? "text-(--brand-orange-ink)"
                : "text-(--site-ink)"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href={navLogin.href}
          onClick={onClose}
          aria-current={isActive(navLogin.href) ? "page" : undefined}
          className={`block wrap-break-word border-b border-(--site-line) py-5 font-display text-[clamp(1.35rem,6vw,1.65rem)] leading-tight ${
            isActive(navLogin.href)
              ? "text-(--brand-orange-ink)"
              : "text-(--site-ink)"
          }`}
        >
          {navLogin.label}
        </Link>
      </nav>

      <div className="flex shrink-0 flex-col gap-3 border-t border-(--site-line) px-[clamp(20px,6vw,28px)] pb-[max(24px,env(safe-area-inset-bottom))] pt-5">
        <Link
          href={navCta.href}
          onClick={onClose}
          className="site-btn site-btn-primary site-btn-lg w-full"
        >
          {navCta.label}
        </Link>
        <div className="flex gap-3">
          <a
            href={telHref}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-(--site-line) px-4 py-3 text-[14px] font-medium text-(--site-ink)"
          >
            <Phone size={16} strokeWidth={1.7} aria-hidden="true" />
            Ara
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-(--site-line) px-4 py-3 text-[14px] font-medium text-(--site-ink)"
          >
            <MessageCircle size={16} strokeWidth={1.7} aria-hidden="true" />
            WhatsApp
          </a>
        </div>
        <p className="pt-1 text-center text-[12.5px] text-(--site-muted)">
          {contact.phone}
        </p>
      </div>
    </div>
  );
}
