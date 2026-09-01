"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ProductCode, UserRole } from "@prisma/client";
import { Menu, X } from "lucide-react";
import { rolePath } from "@/lib/auth/roles";
import { withParentStudentContext } from "@/lib/parent-home-summary";
import { usePanelFeatureFlags } from "@/components/panel/panel-feature-provider";
import { PanelNav, mobilePrimaryNav } from "@/components/panel/panel-nav";

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
  const flags = usePanelFeatureFlags();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const root = rolePath(role);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectedStudentId = role === "PARENT" ? searchParams.get("studentId") : null;
  const quickItems = nav ? [] : mobilePrimaryNav(role, products, flags, root);

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
      <nav
        aria-label="Mobil hızlı menü"
        className="fixed inset-x-0 bottom-0 z-[90] border-t border-dc-line bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/85 lg:hidden"
      >
        <ul
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.min(3, quickItems.length + 1)}, minmax(0, 1fr))` }}
        >
          {quickItems.map((item) => {
            const active =
              pathname === item.href || (item.href !== root && pathname.startsWith(`${item.href}/`));
            const shouldPreserveParentContext =
              Boolean(selectedStudentId) &&
              (item.href.startsWith(root) || item.href.startsWith("/panel/odk/veli"));
            const href = shouldPreserveParentContext
              ? withParentStudentContext(item.href, selectedStudentId)
              : item.href;
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  prefetch
                  aria-current={active ? "page" : undefined}
                  className={`block min-h-11 rounded-[10px] px-2 py-2 text-center text-[12.5px] font-semibold leading-tight transition-colors ${
                    active
                      ? "bg-dc-brand-soft text-dc-brand-deep"
                      : "text-dc-ink-muted hover:bg-dc-surface-muted hover:text-dc-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Panel menüsünü aç"
              aria-expanded={open}
              aria-controls="panel-mobile-nav"
              className="flex min-h-11 w-full items-center justify-center gap-1 rounded-[10px] border border-dc-line px-2 py-2 text-[12.5px] font-semibold text-dc-ink"
            >
              <Menu size={14} strokeWidth={2} aria-hidden="true" /> Menü
            </button>
          </li>
        </ul>
      </nav>

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
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            {nav ?? (
              <PanelNav role={role} products={products} onNavigate={() => setOpen(false)} />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
