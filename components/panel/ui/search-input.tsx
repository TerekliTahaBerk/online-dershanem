"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { PanelIcon } from "@/components/panel/ui/icon";

export function SearchInput({
  placeholder = "Ara…",
  paramName = "q",
  /** Sayfada görünmüyorsa kullanıcı `/` tuşuyla buraya odaklanabilir */
  enableSlashShortcut = true,
  autoFocus = false,
}: {
  placeholder?: string;
  paramName?: string;
  enableSlashShortcut?: boolean;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(paramName) ?? "");
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced URL update
  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (value) sp.set(paramName, value); else sp.delete(paramName);
      // arama değişince ilk sayfaya dön
      sp.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // "/" keyboard shortcut → focus
  useEffect(() => {
    if (!enableSlashShortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as HTMLElement).isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableSlashShortcut]);

  return (
    <div className="od-search">
      <PanelIcon name="search" size={14} className="od-search-ico" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") { setValue(""); (e.target as HTMLInputElement).blur(); } }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="od-search-input"
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => { setValue(""); inputRef.current?.focus(); }}
          className="od-search-clear"
          aria-label="Aramayı temizle"
          title="Temizle"
        >
          <PanelIcon name="x" size={12} />
        </button>
      ) : (
        <kbd className="od-search-kbd" aria-hidden>/</kbd>
      )}
    </div>
  );
}
