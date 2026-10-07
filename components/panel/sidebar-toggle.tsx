"use client";

import { useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SIDEBAR_COOKIE } from "@/lib/panel/sidebar-preference";

function setCollapsed(collapsed: boolean) {
  const shell = document.querySelector<HTMLElement>("[data-pn-shell]");
  if (shell) shell.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; path=/panel; max-age=31536000; samesite=lax`;
  // Odak, gizlenen düğmede kalmasın: karşı düğmeye taşınır.
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(collapsed ? "[data-pn-sidebar-open]" : "[data-pn-sidebar-close]")?.focus();
  });
}

function isCollapsed() {
  return document.querySelector<HTMLElement>("[data-pn-shell]")?.dataset.sidebar === "collapsed";
}

/**
 * KENAR ÇUBUĞUNU GİZLE / GÖSTER (yalnız masaüstü, ≥1024px).
 *
 * Notion'daki gibi kenar çubuğu tamamen gizlenir; bağlam çubuğundaki düğme
 * geri açar. Durum kabuk kökündeki `data-sidebar` niteliğindedir ve CSS ile
 * uygulanır — yeniden çizim gerekmez. Kısayol: ⌘\ / Ctrl+\.
 */
export function SidebarToggle({ mode }: { mode: "close" | "open" }) {
  useEffect(() => {
    if (mode !== "close") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        setCollapsed(!isCollapsed());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  if (mode === "close") {
    return (
      <button
        type="button"
        data-pn-sidebar-close=""
        onClick={() => setCollapsed(true)}
        aria-label="Kenar çubuğunu gizle (⌘\)"
        title="Kenar çubuğunu gizle (⌘\)"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-pn-text-muted transition-colors hover:bg-pn-hover hover:text-pn-text"
      >
        <PanelLeftClose size={15} aria-hidden="true" />
      </button>
    );
  }
  return (
    <button
      type="button"
      data-pn-sidebar-open=""
      onClick={() => setCollapsed(false)}
      aria-label="Kenar çubuğunu göster (⌘\)"
      title="Kenar çubuğunu göster (⌘\)"
      className="pn-sidebar-open h-8 w-8 shrink-0 place-items-center rounded-md text-pn-text-muted transition-colors hover:bg-pn-hover hover:text-pn-text"
    >
      <PanelLeftOpen size={16} aria-hidden="true" />
    </button>
  );
}
