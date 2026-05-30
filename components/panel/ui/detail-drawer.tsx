"use client";

/**
 * DetailDrawer — right-side, URL-driven entity quick-view primitive.
 *
 * Why URL-driven? So that:
 * - opening a drawer is shareable and back-button-safe,
 * - filter/sort/search state on the underlying page is preserved,
 * - server components can read `searchParams.drawer` if they ever need to.
 *
 * Usage from a list page:
 *
 *   <Link href={withDrawer(pathname, sp, { drawer: "student", id: s.id })}>
 *     {s.fullName}
 *   </Link>
 *
 *   <StudentQuickDrawer />        // mounted once, listens to searchParams
 *
 * Authoring a new drawer:
 *
 *   export function FooDrawer() {
 *     const { open, id, close } = useDrawer("foo");
 *     return (
 *       <DetailDrawer open={open} onClose={close} title="Foo">
 *         (fetch & render with id)
 *       </DetailDrawer>
 *     );
 *   }
 */

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { PanelIcon, type PanelIconName } from "@/components/panel/ui/icon";

// ────────────────────────────────────────────────────────────────────────────
// URL helpers
// ────────────────────────────────────────────────────────────────────────────

export type DrawerKey =
  | "student"
  | "parent"
  | "teacher"
  | "lesson"
  | "homework"
  | "payment"
  | "audit"
  | "odk-exam"
  | "odk-attempt";

/** Build an href that opens a drawer while preserving every other search param. */
export function withDrawer(
  pathname: string,
  current: URLSearchParams | ReadonlyURLSearchParamsLike | Record<string, string | string[] | undefined> | null | undefined,
  next: { drawer: DrawerKey; id: string; tab?: string },
): string {
  const sp = toSearchParams(current);
  sp.set("drawer", next.drawer);
  sp.set("id", next.id);
  if (next.tab) sp.set("tab", next.tab);
  else sp.delete("tab");
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Build an href that closes any drawer. */
export function withoutDrawer(
  pathname: string,
  current: URLSearchParams | ReadonlyURLSearchParamsLike | Record<string, string | string[] | undefined> | null | undefined,
): string {
  const sp = toSearchParams(current);
  sp.delete("drawer");
  sp.delete("id");
  sp.delete("tab");
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

type ReadonlyURLSearchParamsLike = { toString(): string };

function toSearchParams(
  src: URLSearchParams | ReadonlyURLSearchParamsLike | Record<string, string | string[] | undefined> | null | undefined,
): URLSearchParams {
  if (!src) return new URLSearchParams();
  if (src instanceof URLSearchParams) return new URLSearchParams(src);
  // ReadonlyURLSearchParams from next/navigation has toString()
  if (typeof (src as ReadonlyURLSearchParamsLike).toString === "function") {
    try {
      const s = (src as ReadonlyURLSearchParamsLike).toString();
      if (typeof s === "string") return new URLSearchParams(s);
    } catch {}
  }
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(src as Record<string, string | string[] | undefined>)) {
    if (v == null) continue;
    if (Array.isArray(v)) for (const vv of v) sp.append(k, vv);
    else sp.set(k, v);
  }
  return sp;
}

// ────────────────────────────────────────────────────────────────────────────
// Hook used by every concrete drawer component
// ────────────────────────────────────────────────────────────────────────────

export function useDrawer(key: DrawerKey) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const drawer = params.get("drawer");
  const id = params.get("id");
  const tab = params.get("tab");
  const open = drawer === key && !!id;

  const close = useCallback(() => {
    const sp = new URLSearchParams(params.toString());
    sp.delete("drawer");
    sp.delete("id");
    sp.delete("tab");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, params, router]);

  const setTab = useCallback(
    (t: string | null) => {
      const sp = new URLSearchParams(params.toString());
      if (t) sp.set("tab", t);
      else sp.delete("tab");
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [pathname, params, router],
  );

  return { open, id, tab, close, setTab };
}

/** Programmatic opener — useful in non-link contexts (e.g. table row onClick). */
export function useDrawerOpener() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return useCallback(
    (next: { drawer: DrawerKey; id: string; tab?: string }) => {
      const sp = new URLSearchParams(params.toString());
      sp.set("drawer", next.drawer);
      sp.set("id", next.id);
      if (next.tab) sp.set("tab", next.tab);
      else sp.delete("tab");
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [pathname, params, router],
  );
}

// ────────────────────────────────────────────────────────────────────────────
// DetailDrawer — Radix Dialog with right-side slide-in
// ────────────────────────────────────────────────────────────────────────────

export type DrawerTab = {
  id: string;
  label: string;
  count?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** "Öğrenci" or "Veli" — small uppercase label above the title */
  kind?: string;
  title: string;
  subtitle?: React.ReactNode;
  /** Action buttons rendered top-right of the drawer header */
  headerActions?: React.ReactNode;
  /** Optional tab strip (drawer-internal). Use the tab in URL to drive content. */
  tabs?: DrawerTab[];
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  /** Sticky footer (e.g. "Profili aç →") */
  footer?: React.ReactNode;
  /** "md" (default 460px) | "lg" (560px) | "xl" (720px) */
  size?: "md" | "lg" | "xl";
  children: React.ReactNode;
};

const SIZE_PX: Record<NonNullable<Props["size"]>, number> = {
  md: 460,
  lg: 560,
  xl: 720,
};

export function DetailDrawer({
  open,
  onClose,
  kind,
  title,
  subtitle,
  headerActions,
  tabs,
  activeTab,
  onTabChange,
  footer,
  size = "md",
  children,
}: Props) {
  // Restore body scroll lock — Radix handles it, but we also want our `is-drawer-open`
  // class for shell-aware styling (e.g. dim the table beneath).
  useEffect(() => {
    const el = document.documentElement;
    if (open) el.classList.add("od-has-detail-drawer");
    else el.classList.remove("od-has-detail-drawer");
    return () => el.classList.remove("od-has-detail-drawer");
  }, [open]);

  const widthStyle = useMemo(() => ({ width: `min(100vw, ${SIZE_PX[size]}px)` }), [size]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="od-detail-drawer-overlay" />
        <Dialog.Content
          className="od-detail-drawer"
          style={widthStyle}
          aria-describedby={undefined}
        >
          <header className="od-detail-drawer-head">
            <div className="od-detail-drawer-titleblock">
              {kind ? <div className="od-detail-drawer-kind">{kind}</div> : null}
              <Dialog.Title className="od-detail-drawer-title">{title}</Dialog.Title>
              {subtitle ? <div className="od-detail-drawer-subtitle">{subtitle}</div> : null}
            </div>
            <div className="od-detail-drawer-actions">
              {headerActions}
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="od-iconbtn"
                  aria-label="Kapat"
                  title="Kapat (Esc)"
                >
                  <PanelIcon name="x" size={16} />
                </button>
              </Dialog.Close>
            </div>
          </header>

          {tabs && tabs.length > 0 ? (
            <nav className="od-detail-drawer-tabs" role="tablist">
              {tabs.map((t) => {
                const isActive = (activeTab ?? tabs[0]!.id) === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`od-detail-drawer-tab${isActive ? " is-active" : ""}`}
                    onClick={() => onTabChange?.(t.id)}
                  >
                    <span>{t.label}</span>
                    {t.count != null ? (
                      <span className="od-detail-drawer-tab-count">{t.count}</span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          ) : null}

          <div className="od-detail-drawer-body">{children}</div>

          {footer ? <footer className="od-detail-drawer-foot">{footer}</footer> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Inline helpers for drawer content
// ────────────────────────────────────────────────────────────────────────────

export function DrawerSection({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon?: PanelIconName;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="od-detail-drawer-section">
      <div className="od-detail-drawer-section-head">
        <div className="od-detail-drawer-section-title">
          {icon ? <PanelIcon name={icon} size={13} /> : null}
          <span>{title}</span>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="od-detail-drawer-section-body">{children}</div>
    </section>
  );
}

export function DrawerKv({
  k,
  v,
}: {
  k: React.ReactNode;
  v: React.ReactNode;
}) {
  return (
    <div className="od-detail-drawer-kv">
      <div className="k">{k}</div>
      <div className="v">{v ?? <span className="od-muted">—</span>}</div>
    </div>
  );
}

export function DrawerLoading() {
  return (
    <div className="od-detail-drawer-loading">
      <div className="od-skel" style={{ height: 14, width: "60%" }} />
      <div className="od-skel" style={{ height: 14, width: "40%", marginTop: 8 }} />
      <div className="od-skel" style={{ height: 80, width: "100%", marginTop: 16 }} />
      <div className="od-skel" style={{ height: 80, width: "100%", marginTop: 8 }} />
    </div>
  );
}

export function DrawerError({ message }: { message?: string }) {
  return (
    <div className="od-detail-drawer-error">
      <PanelIcon name="alert" size={16} />
      <div>{message ?? "Yüklenemedi."}</div>
    </div>
  );
}
