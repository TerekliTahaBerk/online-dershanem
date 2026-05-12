"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import type { UserRole } from "@prisma/client";
import { PanelIcon, type PanelIconName } from "@/components/panel/ui/icon";
import type { NavCommand } from "@/lib/panel-nav";

type SearchHit = { type: string; id: string; label: string; href: string; meta?: string };

type Props = {
  role: UserRole;
  commands: NavCommand[];
};

export function CommandPalette({ commands }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // External trigger (sidebar button)
    const onTrigger = () => setOpen(true);
    window.addEventListener("od:open-palette", onTrigger);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("od:open-palette", onTrigger);
    };
  }, []);

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

  const go = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
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
              placeholder="Ara: sayfa, öğrenci, öğretmen, sınıf…"
              value={query}
              onValueChange={setQuery}
              className="od-cmd-input"
            />
            {loading ? <span className="od-muted" style={{ fontSize: 12 }}>…</span> : null}
            <kbd className="od-kbd">ESC</kbd>
          </div>

          <Command.List className="od-cmd-list">
            <Command.Empty className="od-cmd-empty">Sonuç yok.</Command.Empty>

            {hits.length > 0 ? (
              <Command.Group heading="Veritabanı" className="od-cmd-group">
                {hits.map((h) => (
                  <Command.Item key={`${h.type}-${h.id}`} value={`${h.label} ${h.type}`} onSelect={() => go(h.href)} className="od-cmd-item">
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

            <Command.Group heading="Sayfalar" className="od-cmd-group">
              {commands.map((c) => (
                <Command.Item key={c.id} value={`${c.label} ${c.group}`} onSelect={() => go(c.href)} className="od-cmd-item">
                  <PanelIcon name={c.icon as PanelIconName} size={14} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">{c.label}</div>
                    <div className="m">{c.group}</div>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
