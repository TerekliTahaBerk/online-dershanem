"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandMenuProvider } from "./command-menu";
import { panelMeta, type PanelKey } from "./nav-manifest";

type MobileNavCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};
const MobileNavContext = React.createContext<MobileNavCtx | null>(null);

export function useMobileNav() {
  const ctx = React.useContext(MobileNavContext);
  if (!ctx) {
    return { open: false, setOpen: () => {}, toggle: () => {} } as MobileNavCtx;
  }
  return ctx;
}

/**
 * AppShell — yeni panel sisteminin ana iskeleti.
 * Sidebar + Topbar + Breadcrumb + CommandMenu hepsini sarar.
 *
 * Mobile (<lg): Sidebar drawer olarak hamburgerden açılır.
 *
 * Kullanım: `app/v2/<panel>/layout.tsx` içinde:
 *   <AppShell panel="admin">{children}</AppShell>
 */
export function AppShell({ panel, children }: { panel: PanelKey; children: React.ReactNode }) {
  const meta = panelMeta[panel];
  const [open, setOpen] = React.useState(false);
  const ctx = React.useMemo<MobileNavCtx>(
    () => ({ open, setOpen, toggle: () => setOpen((v) => !v) }),
    [open],
  );

  // Route değişiminde drawer'ı kapat
  React.useEffect(() => {
    setOpen(false);
  }, []);

  return (
    <CommandMenuProvider basePrefix={meta.href}>
      <MobileNavContext.Provider value={ctx}>
        <div className="flex min-h-screen bg-od-bg text-od-ink antialiased">
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <Sidebar panel={panel} />
          </div>

          {/* Mobile drawer */}
          {open && (
            <>
              <div
                className="fixed inset-0 z-40 bg-od-ink/40 backdrop-blur-sm lg:hidden"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-od-fade-in">
                <Sidebar panel={panel} />
              </div>
            </>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-x-hidden">
              <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8 animate-od-fade-in">
                {children}
              </div>
            </main>
          </div>
        </div>
      </MobileNavContext.Provider>
    </CommandMenuProvider>
  );
}

