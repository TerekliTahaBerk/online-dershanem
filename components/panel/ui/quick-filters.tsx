"use client";

/**
 * Quick filter chips — URL searchParams güdümlü.
 * Server bileşeniyle uyumlu: client tıklar, URL değişir, sunucu yeniden
 * render eder. Liste sayfaları için ortak hızlı filtre standardıdır.
 */

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export type ChipOption = { value: string; label: string; tone?: "ok" | "warn" | "bad" | "neutral" | "accent" };

type Props = {
  /** URL parametre adı */
  param: string;
  /** "Tümü" davranışı için bu değer URL'den kaldırılır */
  allValue?: string;
  options: ChipOption[];
  /** Chip etiketinin üstüne küçük başlık */
  label?: string;
};

export function QuickFilters({ param, allValue = "", options, label }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const current = params.get(param) ?? allValue;

  const set = (v: string) => {
    const sp = new URLSearchParams(params.toString());
    if (!v || v === allValue) sp.delete(param);
    else sp.set(param, v);
    // sayfa numarasını sıfırla — pagination tutarlılığı
    sp.delete("page");
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }));
  };

  return (
    <div className="od-qfilters" role="group" aria-label={label ?? "Hızlı filtreler"}>
      {label ? <span className="od-qfilters-label">{label}</span> : null}
      {options.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => set(o.value)}
            className={`od-qchip${active ? " is-active" : ""}${o.tone ? ` tone-${o.tone}` : ""}`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Tarih aralığı hızlı presets ────────────────────────────────────────────

type DateRangeProps = {
  /** Başlangıç/bitiş için kullanılacak parametre adları */
  fromParam?: string;
  toParam?: string;
  /** Aktif preset için tek bir parametre adı (örn. ?range=7d). İçeriği server tarafında çözebilirsin. */
  rangeParam?: string;
};

export function DateRangeQuickFilter({ rangeParam = "range" }: DateRangeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const current = params.get(rangeParam) ?? "";

  const set = (v: string) => {
    const sp = new URLSearchParams(params.toString());
    if (!v) sp.delete(rangeParam); else sp.set(rangeParam, v);
    sp.delete("page");
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }));
  };

  const opts: ChipOption[] = [
    { value: "", label: "Tümü" },
    { value: "today", label: "Bugün" },
    { value: "7d", label: "7 gün" },
    { value: "30d", label: "30 gün" },
    { value: "month", label: "Bu ay" },
  ];

  return (
    <div className="od-qfilters" role="group" aria-label="Tarih aralığı">
      {opts.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            onClick={() => set(o.value)}
            className={`od-qchip${active ? " is-active" : ""}`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
