"use client";

/**
 * EntitySearchCombobox — smart picker for students / parents / teachers / classrooms.
 *
 * Backed by `/api/panel/lookup/:entity` (see app/api/panel/lookup/[entity]/route.ts).
 *
 * Features:
 * - Debounced server search (180ms).
 * - Initial popover open shows the 10 most recent rows in the scope (server side).
 * - Keyboard nav (↑↓ Enter Esc).
 * - Optional "+ Yeni oluştur" footer when `onCreateNew` is provided.
 * - Selected value carried in a hidden <input name=...> for plain <form> usage,
 *   plus an `onChange(id, row)` callback for client-driven flows.
 *
 * Usage:
 *
 *   <EntitySearchCombobox
 *     entity="parents"
 *     name="parentId"
 *     placeholder="Veli ara…"
 *     onCreateNew={(q) => setParentDraft({ fullName: q })}
 *   />
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { PanelIcon } from "@/components/panel/ui/icon";

export type ComboboxRow = {
  id: string;
  label: string;
  sub?: string | null;
  badge?: string | null;
  meta?: string | null;
};

type Entity = "students" | "parents" | "teachers" | "classrooms";

type Props = {
  entity: Entity;
  /** Hidden input name for plain <form> usage. */
  name?: string;
  /** Initially-selected row (when editing). */
  initialValue?: ComboboxRow | null;
  placeholder?: string;
  /** Disable the input (e.g. while a parent action is pending). */
  disabled?: boolean;
  /** Fired when user selects a row. */
  onChange?: (id: string | null, row: ComboboxRow | null) => void;
  /** When provided, a "+ Yeni oluştur" item appears at the bottom of the popover.
   *  Receives the current query so the host can prefill a draft. */
  onCreateNew?: (query: string) => void;
  /** Override the create-new label (default: "+ Yeni …"). */
  createNewLabel?: string;
  /** Force-clear when the parent re-renders with this key changing. */
  resetKey?: string | number;
};

export function EntitySearchCombobox({
  entity,
  name,
  initialValue = null,
  placeholder,
  disabled,
  onChange,
  onCreateNew,
  createNewLabel,
  resetKey,
}: Props) {
  const [selected, setSelected] = useState<ComboboxRow | null>(initialValue);
  const [query, setQuery] = useState<string>(initialValue?.label ?? "");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ComboboxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aborterRef = useRef<AbortController | null>(null);

  // Reset on key change (e.g. host swapped the form)
  useEffect(() => {
    setSelected(initialValue);
    setQuery(initialValue?.label ?? "");
    setOpen(false);
    setRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const fetchRows = useCallback(async (q: string) => {
    if (aborterRef.current) aborterRef.current.abort();
    const ac = new AbortController();
    aborterRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/panel/lookup/${entity}?q=${encodeURIComponent(q)}`,
        { signal: ac.signal, headers: { Accept: "application/json" } },
      );
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as { rows: ComboboxRow[] };
      setRows(data.rows ?? []);
      setActiveIndex(0);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setRows([]);
    } finally {
      if (aborterRef.current === ac) setLoading(false);
    }
  }, [entity]);

  // Debounced query
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchRows(query.trim()); }, 180);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, fetchRows]);

  const pickRow = (row: ComboboxRow) => {
    setSelected(row);
    setQuery(row.label);
    setOpen(false);
    onChange?.(row.id, row);
  };

  const clear = () => {
    setSelected(null);
    setQuery("");
    setRows([]);
    onChange?.(null, null);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && rows[activeIndex]) {
        e.preventDefault();
        pickRow(rows[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="od-combobox" ref={wrapRef}>
      {name ? (
        <input type="hidden" name={name} value={selected?.id ?? ""} readOnly />
      ) : null}

      <input
        ref={inputRef}
        type="text"
        className="od-combobox-input"
        autoComplete="off"
        placeholder={placeholder ?? "Ara…"}
        value={query}
        disabled={disabled}
        onFocus={() => { setOpen(true); if (rows.length === 0) void fetchRows(query.trim()); }}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          if (selected && v !== selected.label) {
            setSelected(null);
            onChange?.(null, null);
          }
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
      />
      {query.length > 0 ? (
        <button
          type="button"
          className="od-combobox-clear"
          onClick={clear}
          aria-label="Temizle"
          tabIndex={-1}
        >
          <PanelIcon name="x" size={12} />
        </button>
      ) : null}

      {open ? (
        <div className="od-combobox-popover" role="listbox">
          {loading && rows.length === 0 ? (
            <div className="od-combobox-loading">Aranıyor…</div>
          ) : rows.length === 0 ? (
            <div className="od-combobox-empty">
              {query.trim() ? "Sonuç yok" : "Yazmaya başlayın…"}
            </div>
          ) : (
            rows.map((r, i) => (
              <div
                key={r.id}
                role="option"
                aria-selected={i === activeIndex}
                data-active={i === activeIndex}
                className="od-combobox-item"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => { e.preventDefault(); pickRow(r); }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t">{r.label}</div>
                  {r.sub ? <div className="m">{r.sub}</div> : null}
                </div>
                {r.badge ? (
                  <span className="od-badge tone-neutral" style={{ fontSize: 10 }}>{r.badge}</span>
                ) : null}
              </div>
            ))
          )}

          {onCreateNew ? (
            <div
              className="od-combobox-create"
              onMouseDown={(e) => {
                e.preventDefault();
                onCreateNew(query.trim());
                setOpen(false);
              }}
            >
              <PanelIcon name="plus" size={12} />
              <span>{createNewLabel ?? `+ Yeni oluştur${query.trim() ? `: "${query.trim()}"` : ""}`}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
