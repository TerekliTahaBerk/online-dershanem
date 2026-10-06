"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

/**
 * YAN PANEL (side peek) — docs/panel-design-roadmap.md §8.4.
 *
 * Küçük nesne ayrıntısı ve düzenlemesi için: tam sayfaya gitmeden açılır,
 * URL'ye bağlıdır (`?onizle=tür:kimlik`; geçmişe yeni kayıt eklemez) — bağlantı
 * paylaşılabilir. Erişilebilirlik: `role="dialog"` + `aria-modal`, açılışta
 * odak panelin içine, Tab panel içinde döner, Escape kapatır, kapanışta odak
 * açan öğeye döner, arka plan kaydırması kilitlenir. 768px altında tam ekran.
 * Panel içinde ikinci bir modal açılmaz (onay adımları satır içi yapılır).
 */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Altta sabit eylem alanı (ör. Kaydet). */
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
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
      const target = returnFocusRef.current;
      window.requestAnimationFrame(() => target?.focus?.());
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-200 flex justify-end" role="presentation">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#14201c]/20 motion-safe:animate-[pn-fade-in_120ms_ease-out]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full flex-col bg-white shadow-[-8px_0_24px_rgba(20,32,28,0.08)] motion-safe:animate-[pn-drawer-in_160ms_ease-out] md:w-[480px] md:border-l md:border-pn-border"
      >
        <div className="flex items-start gap-3 border-b border-pn-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[16px] font-semibold leading-snug text-pn-text">
              {title}
            </h2>
            {description ? <div className="mt-0.5 text-[13px] text-pn-text-muted">{description}</div> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Paneli kapat"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-pn-text-muted transition-colors hover:bg-pn-hover hover:text-pn-text"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-pn-border px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

/**
 * Yan panel durumunu URL'de tutar (`?onizle=değer`). `router.replace` ile
 * kaydırmadan yazar; değer `null` ise parametre silinir.
 */
export function useDrawerParam(param = "onizle"): [string | null, (value: string | null) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(param);
  const setValue = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set(param, next);
      else params.delete(param);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [param, pathname, router, searchParams],
  );
  return [value, setValue];
}
