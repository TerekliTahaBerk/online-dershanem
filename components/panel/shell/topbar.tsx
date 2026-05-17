"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { UserRole } from "@prisma/client";
import { PanelIcon } from "@/components/panel/ui/icon";
import { setViewAsAction } from "@/components/panel/shell/actions";
import { useTheme } from "@/components/providers/theme-provider";
import { NotificationBell } from "@/components/panel/shell/notification-bell";
import { ProductSwitcher } from "@/components/panel/shell/product-switcher";
import type { AccessFlags } from "@/lib/access/odk";

type Props = {
  role: UserRole;
  actualRole: UserRole;
  isViewingAs: boolean;
  userId: string;
  accessFlags: AccessFlags;
  currentProduct?: "od" | "odk";
  onMenuClick?: () => void;
};

const ROLE_OPTIONS: { value: "admin" | "ogretmen" | "ogrenci" | "veli"; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "ogretmen", label: "Öğretmen" },
  { value: "ogrenci", label: "Öğrenci" },
  { value: "veli", label: "Veli" },
];

export function Topbar({ role, actualRole, isViewingAs, userId, accessFlags, currentProduct = "od", onMenuClick }: Props) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const currentSegment =
    role === "ADMIN" ? "admin" :
    role === "TEACHER" ? "ogretmen" :
    role === "PARENT" ? "veli" : "ogrenci";

  const onSwitch = (value: string) => {
    startTransition(async () => {
      await setViewAsAction(value);
      router.refresh();
    });
  };

  return (
    <header className="od-topbar">
      {onMenuClick ? (
        <button
          type="button"
          className="od-iconbtn od-topbar-menu"
          onClick={onMenuClick}
          aria-label="Menüyü aç"
          title="Menü"
        >
          <PanelIcon name="menu" size={18} />
        </button>
      ) : null}

      <ProductSwitcher role={role} actualRole={actualRole} accessFlags={accessFlags} currentProduct={currentProduct} />

      {isViewingAs ? (
        <div className="od-topbar-banner">
          <PanelIcon name="eye" size={14} />
          <span>
            <strong>{role === "TEACHER" ? "Öğretmen" : role === "STUDENT" ? "Öğrenci" : "Veli"}</strong> görünümündesin (Admin)
          </span>
        </div>
      ) : null}

      <div className="od-topbar-spacer" />

      <div className="od-topbar-actions">
        {actualRole === "ADMIN" ? (
          <select
            className="od-select"
            value={currentSegment}
            onChange={(e) => onSwitch(e.target.value)}
            disabled={pending}
            aria-label="Rol değiştir"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          className="od-iconbtn"
          onClick={() => toggleTheme()}
          aria-label="Tema değiştir"
          title="Tema değiştir"
        >
          <PanelIcon name={theme === "dark" ? "sun" : "moon"} size={16} />
        </button>

        <NotificationBell userId={userId} />

        <a className="od-iconbtn" href="/" aria-label="Siteye dön" title="Siteye dön">
          <PanelIcon name="home" size={16} />
        </a>
      </div>
    </header>
  );
}
