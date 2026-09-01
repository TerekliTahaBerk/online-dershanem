"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ProductCode, UserRole } from "@prisma/client";
import { ArrowLeftRight, Bell, Menu, ShieldCheck, X } from "lucide-react";
import { rolePath } from "@/lib/auth/roles";
import { withParentStudentContext } from "@/lib/parent-home-summary";
import { usePanelFeatureFlags } from "@/components/panel/panel-feature-provider";
import { PanelNav, mobilePrimaryNav } from "@/components/panel/panel-nav";
import { LogoutButton } from "@/components/panel/logout-button";
import type { PanelNavItem } from "@/lib/panel/navigation";

export type PanelMobileDrawerAccount = {
  displayName: string;
  email: string;
  initials: string;
  roleLine: string;
  workspaceSwitch?: { href: string; label: string } | null;
  accountHref?: string | null;
  showSessionsLink?: boolean;
};

/**
 * Panel mobil navigasyonu — masaüstü sidebar'ın küçültülmüş hâli DEĞİL,
 * ayrı bir drawer (§30). Erişilebilir dialog: focus-trap, Escape,
 * body-lock ve kapanışta odağın tetikleyiciye dönmesi.
 */
export function PanelMobileNav({
  role,
  products,
  nav,
  mobileQuickItems,
  drawerAccount,
}: {
  role: UserRole;
  products: ProductCode[];
  /** Kendi menüsü olan çalışma alanları için. */
  nav?: React.ReactNode;
  /** Özel menülü alanlarda (İşletme vb.) alt çubuk kısayolları. */
  mobileQuickItems?: PanelNavItem[];
  /** Drawer altında profil, çalışma alanı ve hesap kısayolları. */
  drawerAccount?: PanelMobileDrawerAccount;
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
  const quickItems =
    mobileQuickItems ??
    (nav ? [] : mobilePrimaryNav(role, products, flags, root));
  const bottomNavColumns = Math.min(4, Math.max(2, quickItems.length + 1));

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
          style={{ gridTemplateColumns: `repeat(${bottomNavColumns}, minmax(0, 1fr))` }}
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
                  className={`block min-h-11 rounded-[10px] px-1.5 py-2 text-center text-[11.5px] font-semibold leading-tight transition-colors sm:px-2 sm:text-[12.5px] ${
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
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              {nav ?? (
                <PanelNav role={role} products={products} onNavigate={() => setOpen(false)} />
              )}
            </div>

            {drawerAccount ? (
              <footer className="shrink-0 border-t border-dc-line bg-dc-surface-muted/60 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-dc-brand-soft text-[13px] font-bold text-dc-brand-hover"
                  >
                    {drawerAccount.initials || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-dc-ink">{drawerAccount.displayName}</p>
                    <p className="truncate text-[12px] text-dc-ink-faint">{drawerAccount.email}</p>
                    <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-dc-ink-ghost">
                      {drawerAccount.roleLine}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href="/panel/bildirimler"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-dc-line bg-white px-3 text-[12px] font-semibold text-dc-ink"
                  >
                    <Bell size={14} aria-hidden="true" /> Bildirimler
                  </Link>
                  {drawerAccount.showSessionsLink ? (
                    <Link
                      href="/panel/oturumlar"
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-dc-line bg-white px-3 text-[12px] font-semibold text-dc-ink"
                    >
                      <ShieldCheck size={14} aria-hidden="true" /> Oturumlar
                    </Link>
                  ) : drawerAccount.accountHref ? (
                    <Link
                      href={drawerAccount.accountHref}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center justify-center rounded-[10px] border border-dc-line bg-white px-3 text-[12px] font-semibold text-dc-ink"
                    >
                      Hesabım
                    </Link>
                  ) : null}
                </div>

                {drawerAccount.workspaceSwitch ? (
                  <Link
                    href={drawerAccount.workspaceSwitch.href}
                    onClick={() => setOpen(false)}
                    className="mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-dc-line-soft bg-white px-3 text-[12px] font-semibold text-dc-ink-muted transition-colors hover:text-dc-ink"
                  >
                    <ArrowLeftRight size={13} aria-hidden="true" />
                    {drawerAccount.workspaceSwitch.label}
                  </Link>
                ) : null}

                {drawerAccount.accountHref && drawerAccount.showSessionsLink ? (
                  <Link
                    href={drawerAccount.accountHref}
                    onClick={() => setOpen(false)}
                    className="mt-2 flex min-h-11 items-center justify-center rounded-[10px] border border-dc-line-soft bg-white px-3 text-[12px] font-semibold text-dc-ink"
                  >
                    Profil ve hesap
                  </Link>
                ) : null}

                <div className="mt-3 border-t border-dc-line-soft pt-3">
                  <LogoutButton compact />
                </div>
              </footer>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
