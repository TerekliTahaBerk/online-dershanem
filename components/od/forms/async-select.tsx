"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type AsyncOption = { value: string; label: string; hint?: string };

export type AsyncSelectProps = {
  /** API endpoint — `?q=foo` ile arama, `?ids=a,b` ile prefill desteklemeli. */
  endpoint: string;
  value: string | null | undefined;
  onChange: (value: string | null, option: AsyncOption | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** İstemcide ek query string parametreleri (örn. `&type=ACTIVE`). */
  extraParams?: Record<string, string | undefined>;
};

/**
 * Debounced async dropdown. Prefill için `value` verilirse mount'ta
 * `?ids=value` ile etiket çekilir.
 */
export function AsyncSelect({
  endpoint,
  value,
  onChange,
  placeholder = "Seç…",
  required,
  className,
  extraParams,
}: AsyncSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AsyncOption[]>([]);
  const [selected, setSelected] = useState<AsyncOption | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Build query string
  function buildUrl(params: Record<string, string>) {
    const sp = new URLSearchParams(params);
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        if (v) sp.set(k, v);
      }
    }
    return `${endpoint}?${sp.toString()}`;
  }

  // Prefill label
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.value === value) return;
    let aborted = false;
    fetch(buildUrl({ ids: value }))
      .then((r) => r.json())
      .then((j) => {
        if (aborted) return;
        const opt: AsyncOption | undefined = j.items?.[0];
        if (opt) setSelected(opt);
      })
      .catch(() => {});
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(buildUrl({ q: query }))
        .then((r) => r.json())
        .then((j) => setItems(j.items ?? []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-od border border-od-border bg-od-surface px-od-2 text-left text-od-body",
          !selected && "text-od-mute",
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <span className="ml-1 flex items-center gap-1">
          {selected && !required && (
            <X
              className="h-3.5 w-3.5 text-od-mute hover:text-od-ink"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(null);
                onChange(null, null);
              }}
            />
          )}
          <ChevronDown className="h-4 w-4 text-od-mute" />
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-od border border-od-border bg-od-surface shadow-od-md">
          <div className="border-b border-od-border p-od-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara…"
              className="h-8 w-full rounded-od border border-od-border bg-od-subtle px-od-2 text-od-small"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center p-od-3 text-od-tiny text-od-mute">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-od-3 text-center text-od-tiny text-od-mute">Sonuç yok</div>
            ) : (
              items.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelected(opt);
                      onChange(opt.value, opt);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-od-2 rounded-od px-od-2 py-1.5 text-left text-od-small hover:bg-od-subtle",
                      active && "bg-od-subtle font-medium",
                    )}
                  >
                    <span className="flex-1 truncate">
                      <span className="block truncate">{opt.label}</span>
                      {opt.hint && (
                        <span className="block truncate text-od-tiny text-od-mute">{opt.hint}</span>
                      )}
                    </span>
                    {active && <Check className="h-3.5 w-3.5 text-pastel-mint-ink" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
