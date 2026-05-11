"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandMenuProvider } from "./command-menu";
import { panelMeta, type PanelKey } from "./nav-manifest";

/**
 * AppShell — yeni panel sisteminin ana iskeleti.
 * Sidebar + Topbar + Breadcrumb + CommandMenu hepsini sarar.
 *
 * Kullanım: `app/v2/<panel>/layout.tsx` içinde:
 *   <AppShell panel="admin">{children}</AppShell>
 */
export function AppShell({ panel, children }: { panel: PanelKey; children: React.ReactNode }) {
  const meta = panelMeta[panel];
  return (
    <CommandMenuProvider basePrefix={meta.href}>
      <div className="flex min-h-screen bg-od-bg text-od-ink antialiased">
        <Sidebar panel={panel} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-8 animate-od-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </CommandMenuProvider>
  );
}
