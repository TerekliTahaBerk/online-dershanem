"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import type { UserRole } from "@prisma/client";
import { PanelIcon, type PanelIconName } from "@/components/panel/ui/icon";
import type { NavCommand } from "@/lib/panel-nav";
import { quickActionsForRole, type QuickAction } from "@/lib/panel-quick-actions";

type SearchHit = { type: string; id: string; label: string; href: string; meta?: string };
type RecentItem = { label: string; href: string; type: string; ts: number };

const RECENT_KEY = "od.cmd.recent.v1";
const RECENT_MAX = 6;

function readRecent(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as RecentItem[]).slice(0, RECENT_MAX);
  } catch { return []; }
}
function pushRecent(item: Omit<RecentItem, "ts">) {
  if (typeof window === "undefined") return;
  try {
    const cur = readRecent().filter((r) => r.href !== item.href);
    const next: RecentItem[] = [{ ...item, ts: Date.now() }, ...cur].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

type Props = {
  role: UserRole;
  commands: NavCommand[];
};

export function CommandPalette({ role, commands }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const quickActions: QuickAction[] = useMemo(() => quickActionsForRole(role), [role]);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const onTrigger = () => setOpen(true);
    window.addEventListener("od:open-palette", onTrigger);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("od:open-palette", onTrigger);
    };
  }, []);

  useEffect(() => {
    if (open) setRecent(readRecent());
  }, [open]);

  // Debounced server search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/panel/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = (await res.json()) as { results: SearchHit[] };
          setHits(data.results);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const go = useCallback((href: string, item?: { label: string; type: string }) => {
    setOpen(false);
    setQuery("");
    if (item) pushRecent({ label: item.label, href, type: item.type });
    router.push(href);
  }, [router]);

  if (!open) return null;
  return (
    <div className="od-cmd-overlay" onClick={() => setOpen(false)}>
      <div className="od-cmd-dialog" onClick={(e) => e.stopPropagation()}>
        <Command label="Komut paleti" shouldFilter={true}>
          <div className="od-cmd-input-wrap">
            <PanelIcon name="search" size={16} />
            <Command.Input
              autoFocus
              placeholder="Ara: sayfa, öğrenci, öğretmen, hızlı aksiyon…"
              value={query}
              onValueChange={setQuery}
              className="od-cmd-input"
            />
            {loading ? <span className="od-muted" style={{ fontSize: 12 }}>…</span> : null}
            <kbd className="od-kbd">ESC</kbd>
          </div>

          <Command.List className="od-cmd-list">
            <Command.Empty className="od-cmd-empty">Sonuç yok.</Command.Empty>

            {/* Hızlı Aksiyonlar — en üstte, en hızlı erişim */}
            {quickActions.length > 0 ? (
              <Command.Group heading="Hızlı aksiyonlar" className="od-cmd-group">
                {quickActions.map((a) => (
                  <Command.Item
                    key={a.id}
                    value={`${a.label} ${a.hint ?? ""} aksiyon`}
                    onSelect={() => go(a.href, { label: a.label, type: "Aksiyon" })}
                    className="od-cmd-item"
                  >
                    <PanelIcon name={a.icon as PanelIconName} size={14} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t">{a.label}</div>
                      {a.hint ? <div className="m">{a.hint}</div> : null}
                    </div>
                    {a.shortcut ? <kbd className="od-kbd" style={{ fontSize: 10 }}>{a.shortcut}</kbd> : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {/* DB Search */}
            {hits.length > 0 ? (
              <Command.Group heading="Veritabanı" className="od-cmd-group">
                {hits.map((h) => (
                  <Command.Item
                    key={`${h.type}-${h.id}`}
                    value={`${h.label} ${h.type}`}
                    onSelect={() => go(h.href, { label: h.label, type: h.type })}
                    className="od-cmd-item"
                  >
                    <PanelIcon name="search" size={14} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t">{h.label}</div>
                      {h.meta ? <div className="m">{h.meta}</div> : null}
                    </div>
                    <span className="od-badge tone-neutral" style={{ fontSize: 10 }}>{h.type}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {/* Son ziyaret edilenler (yalnızca query yokken) */}
            {!query && recent.length > 0 ? (
              <Command.Group heading="Son ziyaret edilenler" className="od-cmd-group">
                {recent.map((r) => (
                  <Command.Item
                    key={r.href}
                    value={`${r.label} ${r.type} son`}
                    onSelect={() => go(r.href, { label: r.label, type: r.type })}
                    className="od-cmd-item"
                  >
                    <PanelIcon name="clock" size={14} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t">{r.label}</div>
                      <div className="m">{r.type}</div>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            <Command.Group heading="Sayfalar" className="od-cmd-group">
              {commands.map((c) => (
                <Command.Item key={c.id} value={`${c.label} ${c.group}`} onSelect={() => go(c.href, { label: c.label, type: c.group })} className="od-cmd-item">
                  <PanelIcon name={c.icon as PanelIconName} size={14} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">{c.label}</div>
                    <div className="m">{c.group}</div>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="od-cmd-foot">
            <span><kbd className="od-kbd">↑↓</kbd> gez</span>
            <span><kbd className="od-kbd">Enter</kbd> aç</span>
            <span><kbd className="od-kbd">?</kbd> tüm kısayollar</span>
            <span><kbd className="od-kbd">Esc</kbd> kapat</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

