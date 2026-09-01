"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CreditCard,
  History,
  LayoutDashboard,
  Plus,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  GLOBAL_SEARCH_DEBOUNCE_MS,
  GLOBAL_SEARCH_MIN_CHARS,
  commandsToResults,
  flattenSearchSections,
  groupGlobalSearchResults,
  matchCommands,
  readRecentSearches,
  writeRecentSearch,
  type GlobalSearchKind,
  type GlobalSearchResult,
} from "@/lib/panel/global-search";

type CommandSeed = {
  id: string;
  label: string;
  detail: string;
  href: string;
};

const KIND_ICON: Record<GlobalSearchKind, LucideIcon> = {
  COMMAND: LayoutDashboard,
  STUDENT: UsersRound,
  PARENT: UsersRound,
  TEACHER: UsersRound,
  USER: UsersRound,
  GROUP: UsersRound,
  LESSON: BookOpenCheck,
  ORDER: CreditCard,
  LEAD: History,
  EXAM: CalendarDays,
};

function iconFor(item: GlobalSearchResult): LucideIcon {
  if (item.kind !== "COMMAND") return KIND_ICON[item.kind];
  if (item.label.includes("Yeni") || item.label.includes("planla") || item.label.includes("oluştur")) {
    return Plus;
  }
  if (item.href.includes("siparis") || item.href.includes("isler")) return CreditCard;
  if (item.href.includes("takvim") || item.href.includes("deneme") || item.href.includes("sinav")) {
    return CalendarDays;
  }
  if (item.href.includes("egitim") || item.href.includes("kocluk")) return BookOpenCheck;
  if (item.href.includes("kayitlar")) return History;
  return LayoutDashboard;
}

type AdminCommandSearchProps = {
  /** Sunucuda filtrelenmiş komutlar — yetkisiz aksiyon istemciye gelmez. */
  commands: CommandSeed[];
};

export function AdminCommandSearch({ commands }: AdminCommandSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const listboxId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entities, setEntities] = useState<GlobalSearchResult[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  const commandResults = useMemo(
    () => commandsToResults(matchCommands(commands, query)),
    [commands, query],
  );

  const sections = useMemo(() => {
    const needle = query.trim();
    if (!needle) {
      const recentItems: GlobalSearchResult[] = recent.map((item) => ({
        kind: "COMMAND",
        id: `recent:${item}`,
        label: item,
        detail: "Son arama — tekrar çalıştır",
        href: `__recent__:${item}`,
      }));
      return groupGlobalSearchResults([...commandResults, ...recentItems]);
    }
    return groupGlobalSearchResults([...commandResults, ...entities]);
  }, [commandResults, entities, query, recent]);

  const flatResults = useMemo(() => flattenSearchSections(sections), [sections]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setEntities([]);
      setLoadingEntities(false);
      setActiveIndex(0);
      return;
    }
    setRecent(readRecentSearches(typeof window !== "undefined" ? window.localStorage : null));
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    const needle = query.trim();
    if (!open || needle.length < GLOBAL_SEARCH_MIN_CHARS) {
      setEntities([]);
      setLoadingEntities(false);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoadingEntities(true);
      try {
        const response = await fetch(`/api/panel/admin-search?q=${encodeURIComponent(needle)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as {
          results?: GlobalSearchResult[];
        } | null;
        if (!response.ok || !payload?.results) {
          setEntities([]);
          return;
        }
        setEntities(payload.results);
      } catch (error) {
        if ((error as { name?: string } | null)?.name === "AbortError") return;
        setEntities([]);
      } finally {
        setLoadingEntities(false);
      }
    }, GLOBAL_SEARCH_DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, entities, commandResults]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>(`[data-search-index="${activeIndex}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;

    function onFocus(event: FocusEvent) {
      const root = dialogRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        inputRef.current?.focus();
      }
    }

    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [open]);

  function close() {
    setOpen(false);
  }

  function go(item: GlobalSearchResult) {
    if (item.href.startsWith("__recent__:")) {
      const recentQuery = item.href.slice("__recent__:".length);
      setQuery(recentQuery);
      return;
    }
    writeRecentSearch(typeof window !== "undefined" ? window.localStorage : null, query);
    setOpen(false);
    router.push(item.href);
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!flatResults.length) return;
      setActiveIndex((index) => (index + 1) % flatResults.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!flatResults.length) return;
      setActiveIndex((index) => (index - 1 + flatResults.length) % flatResults.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = flatResults[activeIndex];
      if (item) go(item);
    }
  }

  const sectionOffsets = sections.map((_, index) =>
    sections.slice(0, index).reduce((sum, section) => sum + section.items.length, 0),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--site-line)] bg-white text-[var(--site-muted)] transition hover:border-[#d4d0c5] hover:text-[var(--site-ink)] sm:w-[260px] sm:justify-between sm:px-3.5"
        aria-label="Panelde ara"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Search size={16} aria-hidden="true" />
          <span className="hidden text-[12.5px] sm:inline">Öğrenci, sipariş, komut…</span>
        </span>
        <kbd className="hidden rounded-md border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--site-muted)] sm:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[300] flex items-start justify-center bg-[#10150d]/35 px-3 pt-[8vh] backdrop-blur-[3px] sm:px-4 sm:pt-[12vh]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex max-h-[min(80vh,640px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[14px] border border-white/60 bg-white shadow-[0_35px_100px_-25px_rgba(20,20,15,.55)]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--site-line)] px-4 py-3">
              <Search size={18} className="text-[var(--brand-olive)]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p id={titleId} className="sr-only">
                  Panel arama ve komut paleti
                </p>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    flatResults[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined
                  }
                  className="min-w-0 w-full bg-transparent py-2 text-[15px] text-[var(--site-ink)] outline-none placeholder:text-[var(--site-muted)]"
                  placeholder="Öğrenci, veli, sipariş veya komut ara…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <button
                type="button"
                onClick={close}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--site-muted)] hover:bg-[var(--site-bg-warm)] hover:text-[var(--site-ink)]"
                aria-label="Aramayı kapat"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div
              id={listboxId}
              ref={listRef}
              role="listbox"
              aria-label="Arama sonuçları"
              className="min-h-0 flex-1 overflow-y-auto p-2"
            >
              {!query.trim() && !commandResults.length ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-bold text-[var(--site-ink)]">Komut yok</p>
                  <p className="mt-1 text-xs text-[var(--site-muted)]">
                    Bu hesap için hızlı aksiyon tanımlı değil.
                  </p>
                </div>
              ) : null}

              {sections.map((section, sectionIndex) => (
                <div key={section.kind + section.title} className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--site-muted)]">
                    {section.title}
                  </p>
                  {section.items.map((item, itemIndex) => {
                    const index = (sectionOffsets[sectionIndex] ?? 0) + itemIndex;
                    const Icon = iconFor(item);
                    const active = index === activeIndex;
                    return (
                      <button
                        key={`${item.kind}:${item.id}:${item.href}`}
                        id={`${listboxId}-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-search-index={index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => go(item)}
                        className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${
                          active ? "bg-[var(--site-bg-warm)]" : "hover:bg-[var(--site-bg-warm)]"
                        }`}
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]">
                          <Icon size={16} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold text-[var(--site-ink)]">
                            {item.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] text-[var(--site-muted)]">
                            {item.detail}
                          </span>
                        </span>
                        <ArrowRight
                          size={15}
                          className={`text-[var(--site-muted)] transition ${
                            active ? "translate-x-0.5 opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              ))}

              {loadingEntities ? (
                <p className="px-4 py-2 text-[11px] text-[var(--site-muted)]" role="status">
                  Kayıtlarda aranıyor…
                </p>
              ) : null}

              {query.trim().length > 0 &&
              query.trim().length < GLOBAL_SEARCH_MIN_CHARS &&
              !commandResults.length ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-bold text-[var(--site-ink)]">Biraz daha yazın</p>
                  <p className="mt-1 text-xs text-[var(--site-muted)]">
                    Kayıt araması için en az {GLOBAL_SEARCH_MIN_CHARS} karakter gerekir.
                  </p>
                </div>
              ) : null}

              {query.trim().length >= GLOBAL_SEARCH_MIN_CHARS &&
              !loadingEntities &&
              !flatResults.length ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-bold text-[var(--site-ink)]">Sonuç bulunamadı</p>
                  <p className="mt-1 text-xs text-[var(--site-muted)]">
                    Ad, e-posta, telefon, sipariş no veya komut deneyin.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--site-line)] bg-[var(--site-bg-warm)] px-4 py-2.5 text-[10.5px] text-[var(--site-muted)]">
              <span>↑↓ gezin · Enter aç · Esc kapat</span>
              <span className="hidden sm:inline">⌘K / Ctrl+K</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
