"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { PanelIcon, type PanelIconName } from "@/components/panel/ui/icon";
import type { SidebarGroup } from "@/components/panel/shell/sections";

type Props = {
  role: UserRole;
  sections: SidebarGroup[];
  userName: string | null;
  userEmail: string;
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

export function Sidebar({ role, sections, userName, userEmail }: Props) {
  const pathname = usePathname();
  return (
    <aside className="od-sidebar">
      <div className="od-sb-brand">
        <div className="od-sb-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="Online Dershanem" />
        </div>
        <div>
          <div className="od-sb-brand-name">OnlineDershanem</div>
          <div className="od-sb-brand-sub">{ROLE_LABEL[role]} paneli</div>
        </div>
      </div>

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
