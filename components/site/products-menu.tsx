"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { productsMenu } from "@/lib/site-content";
import type { PublicProduct } from "@/lib/product-architecture";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";
import { DenemeLigiMenuItem } from "./deneme-ligi-menu-item";

type ProductsMenuProps = {
  isActive: (href: string) => boolean;
  products: readonly PublicProduct[];
};

/**
 * Masaüstü "Ürünler" açılır menüsü — onaylı tasarım (Site Nav.dc.html):
 * etiket + ▼, altında üç ürün.
 *
 * Erişilebilirlik: tasarımdaki hover görünümü yerine gerçek bir disclosure
 * uygulanır — buton `aria-expanded`/`aria-controls` taşır, Escape kapatır ve
 * odağı butona döndürür, dışarı tıklama ve odak kaybı menüyü kapatır.
 * (§38 — görsel niyet korunur, erişilebilirlik düzeltilir.)
 */
export function ProductsMenu({ isActive, products }: ProductsMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const items = products.map(({ name, href, role }) => ({
    label: name,
    href,
    summary: role,
  }));
  const anyProductActive = items.some((item) =>
    isActive(item.href),
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={productsMenu.accessibleLabel}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14.5px] font-semibold transition-colors ${
          anyProductActive || open
            ? "text-(--site-ink)"
            : "text-(--site-body) hover:text-(--site-ink)"
        }`}
      >
        {productsMenu.label}
        <ChevronDown
          size={13}
          strokeWidth={2.2}
          aria-hidden="true"
          className={`text-(--dc-ink-faint) transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          className="absolute left-0 top-[calc(100%+10px)] z-50 w-[320px] rounded-(--dc-radius-card-sm) border border-(--dc-line) bg-white p-2 shadow-dc-sticky"
        >
          {/*
            Özet metni bağlantının DIŞINDA duruyor: içeride olsaydı bağlantının
            erişilebilir adı "onlinedershanem. Çok dersli canlı öğrenme" olurdu.
            Ekran okuyucuda ürün adı tek başına tanınabilir kalmalı.
          */}
          <ul className="flex flex-col">
            {items.map((item) => item.href === denemeLigiBrand.href ? (
              <li key={item.href} className="my-1">
                <DenemeLigiMenuItem
                  active={isActive(item.href)}
                  onNavigate={() => setOpen(false)}
                  summary={item.summary}
                />
              </li>
            ) : (
              <li
                key={item.href}
                className="rounded-od px-3 py-2.5 hover:bg-(--dc-surface-muted)"
              >
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="block wrap-break-word text-[14px] font-semibold text-(--dc-ink)"
                >
                  {item.label}
                </Link>
                <span className="mt-0.5 block text-[13px] leading-normal text-(--dc-ink-muted)">
                  {item.summary}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={productsMenu.href}
            onClick={() => setOpen(false)}
            className="mt-1 block border-t border-(--dc-line-soft) px-3 pb-1 pt-3 text-[13.5px] font-semibold text-(--dc-brand-strong) hover:text-(--dc-brand-hover)"
          >
            Tüm ürünleri karşılaştır →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
