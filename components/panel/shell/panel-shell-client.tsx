"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Sidebar } from "@/components/panel/shell/sidebar";
import { Topbar } from "@/components/panel/shell/topbar";
import { CommandPalette } from "@/components/panel/shell/command-palette";
import type { SidebarGroup } from "@/components/panel/shell/sections";
import type { NavCommand } from "@/lib/panel-nav";

type Props = {
  role: UserRole;
  actualRole: UserRole;
  isViewingAs: boolean;
  userId: string;
  userName: string | null;
  userEmail: string;
  sections: SidebarGroup[];
  commands: NavCommand[];
  children: React.ReactNode;
};

export function PanelShellClient({
  role,
  actualRole,
  isViewingAs,
  userId,
  userName,
  userEmail,
  sections,
  commands,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [drawerOpen]);

  return (
    <div className={`od-panel-app${drawerOpen ? " is-drawer-open" : ""}`}>
      <Sidebar
        role={role}
        sections={sections}
        userName={userName}
        userEmail={userEmail}
      />
      {drawerOpen ? (
        <button
          type="button"
          className="od-drawer-overlay"
          onClick={() => setDrawerOpen(false)}
          aria-label="Menüyü kapat"
        />
      ) : null}
      <main className="od-panel-main">
        <Topbar
          role={role}
          actualRole={actualRole}
          isViewingAs={isViewingAs}
          userId={userId}
          onMenuClick={() => setDrawerOpen((v) => !v)}
        />
        <div className="od-panel-body">{children}</div>
      </main>
      <CommandPalette role={role} commands={commands} />
    </div>
  );
}
