"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Sidebar } from "@/components/panel/shell/sidebar";
import { Topbar } from "@/components/panel/shell/topbar";
import { CommandPalette } from "@/components/panel/shell/command-palette";
import type { ProductSections } from "@/components/panel/shell/sections";
import type { NavCommand } from "@/lib/panel-nav";
import type { AccessFlags } from "@/lib/access/odk";

type Props = {
  role: UserRole;
  actualRole: UserRole;
  isViewingAs: boolean;
  userId: string;
  userName: string | null;
  userEmail: string;
  productSections: ProductSections;
  commands: NavCommand[];
  accessFlags: AccessFlags;
  children: React.ReactNode;
};

const ROLE_TO_SEGMENT: Record<UserRole, "admin" | "ogretmen" | "ogrenci" | "veli"> = {
  ADMIN: "admin",
  TEACHER: "ogretmen",
  STUDENT: "ogrenci",
  PARENT: "veli",
};

export function PanelShellClient({
  role,
  actualRole,
  isViewingAs,
  userId,
  userName,
  userEmail,
  productSections,
  commands,
  accessFlags,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Aktif ürün URL'den türetilir. /panel/<rol>/odk altındaysa ODK; aksi halde OD.
  const currentProduct: "od" | "odk" = useMemo(() => {
    const seg = ROLE_TO_SEGMENT[role];
    return pathname.startsWith(`/panel/${seg}/odk`) ? "odk" : "od";
  }, [pathname, role]);

  const sections =
    currentProduct === "odk" ? productSections.odk : productSections.od;

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
    <div
      className={`od-panel-app${drawerOpen ? " is-drawer-open" : ""}`}
      data-product={currentProduct}
    >
      <Sidebar
        role={role}
        sections={sections}
        product={currentProduct}
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
          accessFlags={accessFlags}
          currentProduct={currentProduct}
          onMenuClick={() => setDrawerOpen((v) => !v)}
        />
        <div className="od-panel-body">{children}</div>
      </main>
      <CommandPalette role={role} commands={commands} />
    </div>
  );
}
