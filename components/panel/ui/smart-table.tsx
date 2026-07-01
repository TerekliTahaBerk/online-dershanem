"use client";

/**
 * Smart Table primitives — opt-in, drop-in.
 *
 * Tasarım kuralı: Mevcut `.od-table` sınıflarını ve sayfa kodlarını
 * BOZMAZ. Sayfalar kademeli olarak (a) sıralama, (b) yoğunluk,
 * (c) bulk seçim, (d) kolon görünürlüğü ekleyebilir. Hiçbiri zorunlu değildir.
 *
 * Tüm state ya URL searchParams'ta (sıralama, filtreler) ya da
 * localStorage'ta (yoğunluk, kolon görünürlüğü) tutulur — server-side
 * sayfalama/sıralama ile birebir uyumludur.
 */

import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PanelIcon } from "@/components/panel/ui/icon";

// ────────────────────────────────────────────────────────────────────────────
// Density (compact / cozy)
// ────────────────────────────────────────────────────────────────────────────

type Density = "compact" | "cozy";

function readDensity(tableId: string): Density {
  if (typeof window === "undefined") return "cozy";
  const v = window.localStorage.getItem(`od.tbl.${tableId}.density`);
  return v === "compact" ? "compact" : "cozy";
}

function writeDensity(tableId: string, d: Density) {
  try { window.localStorage.setItem(`od.tbl.${tableId}.density`, d); } catch {}
}

// ────────────────────────────────────────────────────────────────────────────
// Column visibility
// ────────────────────────────────────────────────────────────────────────────

function readHidden(tableId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(`od.tbl.${tableId}.hidden`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch { return new Set(); }
}
function writeHidden(tableId: string, s: Set<string>) {
  try { window.localStorage.setItem(`od.tbl.${tableId}.hidden`, JSON.stringify(Array.from(s))); } catch {}
}

// ────────────────────────────────────────────────────────────────────────────
// SmartTableShell — wrapper that exposes a small toolbar
// ────────────────────────────────────────────────────────────────────────────

export type ColumnDef = { id: string; label: string; hideable?: boolean };

type ShellProps = {
  tableId: string;
  columns?: ColumnDef[];
  /** Toolbar sağına ekstra eleman koy (export, filter button vb.) */
  toolbarRight?: React.ReactNode;
  /** Toolbar soluna ekstra eleman koy (filter chips, search vb.) */
  toolbarLeft?: React.ReactNode;
  children: React.ReactNode;
};

export function SmartTableShell({ tableId, columns, toolbarLeft, toolbarRight, children }: ShellProps) {
  const [density, setDensity] = useState<Density>("cozy");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [colMenuOpen, setColMenuOpen] = useState(false);

  useEffect(() => {
    setDensity(readDensity(tableId));
    setHidden(readHidden(tableId));
  }, [tableId]);

  const toggleDensity = () => {
    const next: Density = density === "cozy" ? "compact" : "cozy";
    setDensity(next);
    writeDensity(tableId, next);
  };

  const toggleHidden = (id: string) => {
    setHidden((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      writeHidden(tableId, n);
      // CSS variable kanalıyla data-attribute'lı `td/th`'ler gizlenir
      return n;
    });
  };

  // Expose hidden col ids via data-attr on the wrapper so CSS can hide
  // matching cells by `[data-col="ID"]`.
  const hideStyle = useMemo(() => {
    if (hidden.size === 0) return undefined;
    const rules = Array.from(hidden)
      .map((id) => `.od-stable [data-col="${cssEscape(id)}"]`)
      .join(",");
    return `${rules}{display:none!important}`;
  }, [hidden]);

  return (
    <div className={`od-stable od-stable--${density}`} data-table-id={tableId}>
      {hideStyle ? <style>{hideStyle}</style> : null}
      <div className="od-stable-toolbar">
        <div className="od-stable-toolbar-left">{toolbarLeft}</div>
        <div className="od-stable-toolbar-right">
          {toolbarRight}
          <button
            type="button"
            className="od-iconbtn"
            onClick={toggleDensity}
            title={density === "cozy" ? "Yoğun moda geç" : "Rahat moda geç"}
            aria-label="Yoğunluk değiştir"
          >
            <PanelIcon name={density === "cozy" ? "list" : "grid"} size={14} />
          </button>
          {columns && columns.some((c) => c.hideable !== false) ? (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="od-iconbtn"
                onClick={() => setColMenuOpen((v) => !v)}
                title="Sütun görünürlüğü"
                aria-label="Sütunlar"
              >
                <PanelIcon name="filter" size={14} />
              </button>
              {colMenuOpen ? (
                <>
                  <div onClick={() => setColMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div className="od-stable-colmenu">
                    <div className="od-stable-colmenu-h">Sütunlar</div>
                    {columns.filter((c) => c.hideable !== false).map((c) => {
                      const checked = !hidden.has(c.id);
                      return (
                        <label key={c.id} className="od-stable-colmenu-row">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleHidden(c.id)}
                          />
                          <span>{c.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function cssEscape(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

// ────────────────────────────────────────────────────────────────────────────
// SortableTh — server-side sorting via URL params (?sort=field&dir=asc|desc)
// ────────────────────────────────────────────────────────────────────────────

type SortProps = {
  field: string;
  label: string;
  /** Default 'asc' or 'desc' for first click */
  defaultDir?: "asc" | "desc";
  className?: string;
  align?: "left" | "right" | "center";
};

export function SortableTh({ field, label, defaultDir = "asc", className, align = "left" }: SortProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentSort = params.get("sort");
  const currentDir = (params.get("dir") as "asc" | "desc" | null) ?? null;
  const isActive = currentSort === field;
  const nextDir: "asc" | "desc" = isActive ? (currentDir === "asc" ? "desc" : "asc") : defaultDir;

  const onClick = () => {
    const sp = new URLSearchParams(params.toString());
    sp.set("sort", field);
    sp.set("dir", nextDir);
    // Sıralama değişince ilk sayfaya dön — tutarlılık
    sp.delete("page");
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }));
  };

  return (
    <th className={className} style={{ textAlign: align, whiteSpace: "nowrap" }} data-col={field}>
      <button type="button" onClick={onClick} className="od-stable-sort" aria-sort={isActive ? (currentDir === "asc" ? "ascending" : "descending") : "none"}>
        <span>{label}</span>
        <span className="od-stable-sort-ico" aria-hidden>
          {isActive ? (currentDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Bulk selection — uncontrolled (client-only) primitive
// ────────────────────────────────────────────────────────────────────────────

type BulkContextShape = {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: (ids: string[]) => void;
  clear: () => void;
  allSelected: (ids: string[]) => boolean;
};

import { createContext, useContext } from "react";

const BulkContext = createContext<BulkContextShape | null>(null);

export function BulkProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const all = ids.every((id) => prev.has(id)) && prev.size > 0;
      if (all) return new Set();
      return new Set(ids);
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);
  const allSelected = useCallback((ids: string[]) => ids.length > 0 && ids.every((id) => selected.has(id)), [selected]);

  return (
    <BulkContext.Provider value={{ selected, toggle, toggleAll, clear, allSelected }}>
      {children}
    </BulkContext.Provider>
  );
}

export function useBulk() {
  const ctx = useContext(BulkContext);
  if (!ctx) throw new Error("useBulk must be used within <BulkProvider>");
  return ctx;
}

export function BulkRowCheckbox({ id, label }: { id: string; label?: string }) {
  const { selected, toggle } = useBulk();
  return (
    <input
      type="checkbox"
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      aria-label={label ?? "Satır seç"}
      style={{ cursor: "pointer" }}
      onClick={(e) => e.stopPropagation()}
      data-testid="bulk-row-checkbox"
      data-row-id={id}
    />
  );
}

export function BulkAllCheckbox({ ids, label = "Tümünü seç" }: { ids: string[]; label?: string }) {
  const { allSelected, toggleAll, selected } = useBulk();
  const some = ids.some((id) => selected.has(id)) && !allSelected(ids);
  return (
    <input
      type="checkbox"
      ref={(el) => { if (el) el.indeterminate = some; }}
      checked={allSelected(ids)}
      onChange={() => toggleAll(ids)}
      aria-label={label}
      style={{ cursor: "pointer" }}
    />
  );
}

type BulkBarProps = {
  children: React.ReactNode;
};

export function BulkBar({ children }: BulkBarProps) {
  const { selected, clear } = useBulk();
  if (selected.size === 0) return null;
  return (
    <div className="od-bulkbar" role="region" aria-label="Toplu işlem çubuğu" data-testid="bulk-bar">
      <div className="od-bulkbar-count" data-testid="bulk-count">
        <strong>{selected.size}</strong> satır seçildi
      </div>
      <div className="od-bulkbar-actions">
        {children}
        <button type="button" className="od-btn od-btn-ghost od-btn-sm" onClick={clear}>
          Temizle
        </button>
      </div>
    </div>
  );
}
