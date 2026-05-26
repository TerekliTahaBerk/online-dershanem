"use client";

/**
 * Keyboard productivity layer:
 *  - "?"           → kısayollar overlay
 *  - "g" prefix    → rol bazlı sayfa atlama (g d, g i, g o, ...)
 *  - "/"           → SearchInput'a focus (component'in kendisinde)
 *  - "Cmd/Ctrl+K"  → Command palette (zaten paletten dinlenir)
 *
 * Tüm dinleyiciler form/input içindeyken devre dışıdır.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { goToShortcutsForRole, quickActionsForRole } from "@/lib/panel-quick-actions";

type Props = { role: UserRole };

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts({ role }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const gMap = useRef<Record<string, string>>({});
  const waitingG = useRef<NodeJS.Timeout | null>(null);
  const inGMode = useRef(false);

  useEffect(() => {
    gMap.current = goToShortcutsForRole(role);
  }, [role]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      // "?" → overlay
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Esc kapatma
      if (e.key === "Escape") {
        if (open) setOpen(false);
        inGMode.current = false;
        if (waitingG.current) { clearTimeout(waitingG.current); waitingG.current = null; }
        return;
      }

      // g-prefix mode
      if (!inGMode.current && e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        inGMode.current = true;
        if (waitingG.current) clearTimeout(waitingG.current);
        waitingG.current = setTimeout(() => { inGMode.current = false; }, 1200);
        return;
      }
      if (inGMode.current && e.key.length === 1 && /[a-z]/i.test(e.key)) {
        const k = e.key.toLowerCase();
        const href = gMap.current[k];
        inGMode.current = false;
        if (waitingG.current) { clearTimeout(waitingG.current); waitingG.current = null; }
        if (href) {
          e.preventDefault();
          router.push(href);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, router]);

  if (!open) return null;

  const actions = quickActionsForRole(role).filter((a) => a.shortcut);

  return (
    <div
      className="od-kbdhelp-overlay"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Klavye kısayolları"
    >
      <div className="od-kbdhelp" onClick={(e) => e.stopPropagation()}>
        <header className="od-kbdhelp-head">
          <strong>Klavye Kısayolları</strong>
          <button type="button" onClick={() => setOpen(false)} className="od-iconbtn" aria-label="Kapat">✕</button>
        </header>

        <section className="od-kbdhelp-section">
          <h4>Genel</h4>
          <ul>
            <li><kbd className="od-kbd">⌘ K</kbd> / <kbd className="od-kbd">Ctrl K</kbd> <span>Komut paleti</span></li>
            <li><kbd className="od-kbd">/</kbd> <span>Sayfa içi aramaya odaklan</span></li>
            <li><kbd className="od-kbd">?</kbd> <span>Bu pencereyi aç / kapat</span></li>
            <li><kbd className="od-kbd">Esc</kbd> <span>Pencereyi kapat / aramayı temizle</span></li>
          </ul>
        </section>

        <section className="od-kbdhelp-section">
          <h4>Hızlı gezinme</h4>
          <ul>
            <li><kbd className="od-kbd">g</kbd> <kbd className="od-kbd">d</kbd> <span>Dashboard</span></li>
            {actions.map((a) => (
              <li key={a.id}>
                <kbd className="od-kbd">{(a.shortcut ?? "").split(" ")[0]}</kbd>
                <kbd className="od-kbd">{(a.shortcut ?? "").split(" ")[1] ?? ""}</kbd>
                <span>{a.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="od-kbdhelp-section">
          <h4>Tablolar</h4>
          <ul>
            <li><kbd className="od-kbd">Enter</kbd> <span>Seçili satırı aç</span></li>
            <li><kbd className="od-kbd">Space</kbd> <span>Bulk seçim toggle</span></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
