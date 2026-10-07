"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronsUpDown, LayoutGrid, Loader2 } from "lucide-react";

export type WorkspaceKey = "OD" | "OK" | "ODK" | "BUSINESS";

export type WorkspaceOption = {
  key: WorkspaceKey;
  label: string;
  logo: string;
  /** Ürün çalışma alanları seçimi oturuma yazar; İşletme doğrudan bağlantıdır. */
  href: string;
};

/**
 * ÇALIŞMA ALANI DEĞİŞTİRİCİ — kenar çubuğunun tepesi.
 *
 * Eski "<ürün> · Panel değiştir" bağlantısının yerini alır. Ürün seçimi,
 * `/panel/urun-sec` kartlarıyla aynı uca yazılır (`/api/panel/active-product`)
 * ve yalnız MENÜ KAPSAMINI belirler; erişim kararı sunucudadır (uç, erişimi
 * olmayan veya pilotu kapalı ürünü 403 ile reddeder).
 *
 * Erişilebilirlik: açılır panel (disclosure) deseni — düğme `aria-expanded`
 * taşır, Escape ve dış tıklama kapatır, kapanışta odak düğmeye döner.
 */
export function WorkspaceSwitcher({
  current,
  subtitle,
  options,
  selectorHref,
  disabled = false,
}: {
  current: WorkspaceOption | null;
  subtitle: string;
  options: WorkspaceOption[];
  selectorHref: string;
  /** Yönetici önizlemesinde (View As) değiştirme kapalıdır. */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<WorkspaceKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  async function choose(option: WorkspaceOption, event: React.MouseEvent<HTMLAnchorElement>) {
    if (option.key === "BUSINESS") return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (pending) return;
    setPending(option.key);
    setError(null);
    try {
      const response = await fetch("/api/panel/active-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: option.key }),
      });
      const data = (await response.json().catch(() => ({}))) as { redirect?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Çalışma alanı açılamadı.");
      window.location.assign(data.redirect ?? option.href);
    } catch (caught) {
      setPending(null);
      setError(caught instanceof Error ? caught.message : "Bağlantı kurulamadı.");
    }
  }

  const mark = (option: WorkspaceOption | null, size: number) =>
    option ? (
      <Image
        src={option.logo}
        alt=""
        aria-hidden="true"
        width={1254}
        height={1254}
        sizes={`${size}px`}
        loading="eager"
        className="shrink-0 rounded-md object-cover"
        style={{ width: size, height: size }}
      />
    ) : (
      <span
        aria-hidden="true"
        className="grid shrink-0 place-items-center rounded-md bg-pn-selected text-pn-text-muted"
        style={{ width: size, height: size }}
      >
        <LayoutGrid size={size * 0.6} />
      </span>
    );

  const label = current?.label ?? "Çalışma alanı";

  if (disabled || (options.length <= 1 && !current)) {
    return (
      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
        {mark(current, 24)}
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold text-pn-text">{label}</span>
          <span className="block truncate text-[12px] text-pn-text-muted">{subtitle}</span>
        </span>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Çalışma alanı: ${label}. Değiştir`}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-pn-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--pn-focus)"
      >
        {mark(current, 24)}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-pn-text">{label}</span>
          <span className="block truncate text-[12px] text-pn-text-muted">{subtitle}</span>
        </span>
        <ChevronsUpDown size={14} aria-hidden="true" className="shrink-0 text-pn-text-muted" />
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full z-50 mt-1 rounded-[10px] border border-pn-border bg-white p-1 shadow-[0_4px_16px_rgba(20,32,28,0.08)]"
        >
          <p className="px-2 pb-1 pt-1.5 text-[11.5px] font-semibold text-pn-text-muted">Çalışma alanları</p>
          <ul>
            {options.map((option) => {
              const selected = option.key === current?.key;
              return (
                <li key={option.key}>
                  <a
                    href={option.href}
                    onClick={(event) => void choose(option, event)}
                    aria-current={selected ? "true" : undefined}
                    aria-busy={pending === option.key}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13.5px] text-pn-text transition-colors hover:bg-pn-hover"
                  >
                    {mark(option, 20)}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {pending === option.key ? (
                      <Loader2 size={14} aria-hidden="true" className="animate-spin text-pn-text-muted motion-reduce:animate-none" />
                    ) : selected ? (
                      <Check size={14} aria-hidden="true" className="text-pn-accent" />
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
          {error ? (
            <p role="alert" className="mx-2 my-1 text-[12px] text-(--pn-tone-critical)">
              {error}
            </p>
          ) : null}
          <div className="mt-1 border-t border-pn-border pt-1">
            <Link
              href={selectorHref}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-pn-text-secondary transition-colors hover:bg-pn-hover"
            >
              <LayoutGrid size={14} aria-hidden="true" />
              Tüm çalışma alanları
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
