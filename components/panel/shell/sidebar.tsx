"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { PanelIcon, type PanelIconName } from "@/components/panel/ui/icon";
import type { SidebarGroup, ProductId } from "@/components/panel/shell/sections";
import { SidebarBrandSwitcher } from "@/components/panel/shell/sidebar-brand-switcher";
import type { AccessFlags } from "@/lib/access/odk";

type Props = {
  role: UserRole;
  sections: SidebarGroup[];
  product?: ProductId;
  userName: string | null;
  userEmail: string;
  accessFlags: AccessFlags;
};

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Yönetim",
  TEACHER: "Öğretmen",
  STUDENT: "Öğrenci",
  PARENT: "Veli",
};

function initials(name: string | null | undefined, fallback: string): string {
  const source = (name ?? fallback ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || source[0].toUpperCase();
}

export function Sidebar({ role, sections, product = "od", userName, userEmail, accessFlags }: Props) {
  const pathname = usePathname();
  const isOdk = product === "odk";
  return (
    <aside className={`od-sidebar${isOdk ? " is-odk" : " is-od"}`}>
      <SidebarBrandSwitcher
        role={role}
        accessFlags={accessFlags}
        currentProduct={product}
        roleLabel={ROLE_LABEL[role]}
      />

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("od:open-palette"))}
        className="od-sb-search"
        style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer" }}
      >
        <PanelIcon name="search" size={14} />
        <span>Hızlı ara</span>
        <span className="od-kbd">⌘K</span>
      </button>

      <nav className="od-sb-nav">
        {sections.map((sec, si) => (
          <div key={si} className="od-sb-group">
            {sec.title ? <div className="od-sb-section">{sec.title}</div> : null}
            {sec.items.map((it) => {
              const active =
                pathname === it.href ||
                (it.href !== `/panel/${role.toLowerCase()}` && pathname.startsWith(`${it.href}/`));
              return (
                <Link
                  key={it.id}
                  href={it.href}
                  className={`od-sb-item${active ? " is-active" : ""}`}
                >
                  <PanelIcon name={it.icon as PanelIconName} className="od-sb-ico" />
                  <span>{it.label}</span>
                  {it.count != null ? <span className="od-sb-count">{it.count}</span> : null}
                  {it.dot ? <span className="od-sb-dot" /> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="od-sb-foot">
        <div className="od-sb-user">
          <div className="od-avatar g0">{initials(userName, userEmail)}</div>
          <div className="od-sb-user-meta">
            <div className="n">{userName ?? userEmail}</div>
            <div className="r">{ROLE_LABEL[role]}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
