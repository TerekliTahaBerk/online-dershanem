"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { ProductCode, UserRole } from "@prisma/client";
import { Menu, X } from "lucide-react";
import { PanelNav } from "@/components/panel/panel-nav";

/**
 * Panel mobil navigasyonu — masaüstü sidebar'ın küçültülmüş hâli DEĞİL,
 * ayrı bir drawer (§30). Erişilebilir dialog: focus-trap, Escape,
 * body-lock ve kapanışta odağın tetikleyiciye dönmesi.
 */
export function PanelMobileNav({
  role,
  products,
  nav,
}: {
  role: UserRole;
  products: ProductCode[];
  /** Kendi menüsü olan çalışma alanları için. */
  nav?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
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

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.requestAnimationFrame(() => trigger?.focus());
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Panel menüsünü aç"
        aria-expanded={open}
        aria-controls="panel-mobile-nav"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-dc-line bg-white text-dc-ink lg:hidden"
      >
        <Menu size={18} strokeWidth={2} aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={dialogRef}
          id="panel-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Panel menüsü"
          className="fixed inset-0 z-[120] flex flex-col bg-white lg:hidden"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-dc-line px-5">
            <span className="text-[14.5px] font-bold text-dc-ink">Menü</span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menüyü kapat"
              className="grid h-10 w-10 place-items-center rounded-[10px] border border-dc-line text-dc-ink"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {nav ?? (
              <PanelNav role={role} products={products} onNavigate={() => setOpen(false)} />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
