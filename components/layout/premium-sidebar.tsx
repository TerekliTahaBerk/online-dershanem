"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard, Users, CreditCard, CalendarDays, Package, GraduationCap,
  FileText, Tent, Trophy, BookOpen, Calendar, User, LogOut, Menu, X,
  Inbox, BarChart2, FlaskConical, Tag, ClipboardList
} from "lucide-react";

export type SidebarPersona = "admin" | "student" | "teacher";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  exact?: boolean;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

function getAdminNav(): NavSection[] {
  return [
    {
      label: "Online Dershanem",
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: "/admin/formlar", label: "Lead Inbox", icon: Inbox },
        { href: "/admin/ogrenciler", label: "Öğrenciler", icon: Users },
        { href: "/admin/hocalar", label: "Hocalar", icon: GraduationCap },
        { href: "/admin/paketler", label: "Paketler", icon: Package },
        { href: "/admin/odemeler", label: "Ödemeler", icon: CreditCard },
        { href: "/admin/kamplar", label: "Kamplar", icon: Tent },
        { href: "/admin/dersler", label: "Dersler", icon: CalendarDays },
        { href: "/admin/istatistikler", label: "İstatistikler", icon: BarChart2 },
      ]
    },
    {
      label: "Deneme Kulübü",
      items: [
        { href: "/odk/admin", label: "ODK Dashboard", icon: Trophy, exact: true },
        { href: "/odk/admin/sinavlar", label: "Sınavlar", icon: FileText },
        { href: "/odk/admin/paketler", label: "ODK Paketler", icon: Package },
        { href: "/odk/admin/ogrenciler", label: "ODK Öğrenciler", icon: Users },
        { href: "/odk/admin/etiketler", label: "Etiketler", icon: Tag },
      ]
    }
  ];
}

function getStudentNav(hasOdkAccess: boolean): NavSection[] {
  const sections: NavSection[] = [
    {
      label: "Öğrenci",
      items: [
        { href: "/panel", label: "Anasayfa", icon: LayoutDashboard, exact: true },
        { href: "/panel/dersler", label: "Derslerim", icon: CalendarDays },
        { href: "/panel/takvim", label: "Takvim", icon: Calendar },
        { href: "/panel/ogretmenlerim", label: "Öğretmenlerim", icon: GraduationCap },
        { href: "/panel/kamplar", label: "Kamplar", icon: Tent },
        { href: "/panel/odemeler", label: "Ödemelerim", icon: CreditCard },
        { href: "/panel/paketler", label: "Paketler", icon: Package },
        { href: "/panel/profil", label: "Profilim", icon: User },
      ]
    }
  ];

  if (hasOdkAccess) {
    sections.push({
      label: "Deneme Kulübü",
      items: [
        { href: "/odk/panel", label: "Sınavlarım", icon: Trophy, exact: true },
        { href: "/odk/panel/sinavlar", label: "Tüm Sınavlar", icon: FileText },
        { href: "/odk/panel/sonuclar", label: "Sonuçlarım", icon: BarChart2 },
        { href: "/odk/panel/paketim", label: "Paketim", icon: Package },
      ]
    });
  }

  return sections;
}

function getTeacherNav(): NavSection[] {
  return [
    {
      label: "Öğretmen",
      items: [
        { href: "/ogretmen", label: "Anasayfa", icon: LayoutDashboard, exact: true },
        { href: "/ogretmen/dersler", label: "Derslerim", icon: CalendarDays },
        { href: "/ogretmen/ogrencilerim", label: "Öğrencilerim", icon: Users },
        { href: "/ogretmen/takvim", label: "Takvim", icon: Calendar },
        { href: "/ogretmen/profil", label: "Profilim", icon: User },
      ]
    }
  ];
}

interface PremiumSidebarProps {
  persona: SidebarPersona;
  userName?: string | null;
  userRole?: string | null;
  hasOdkAccess?: boolean;
}

function SidebarContent({
  persona,
  userName,
  userRole,
  hasOdkAccess,
  onNavigate
}: PremiumSidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  const sections =
    persona === "admin"
      ? getAdminNav()
      : persona === "student"
      ? getStudentNav(!!hasOdkAccess)
      : getTeacherNav();

  const initials = (userName ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Brand */}
      <div className="pd-sidebar-brand">
        <div className="pd-sidebar-logo-sq">OD</div>
        <div>
          <div className="pd-sidebar-brand-name">Online Dershanem</div>
          <div className="pd-sidebar-brand-sub">
            {persona === "admin"
              ? "Yönetici paneli"
              : persona === "student"
              ? "Öğrenci paneli"
              : "Öğretmen paneli"}
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <div className="pd-sidebar-nav">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="pd-sidebar-section-label">{section.label}</div>
            {section.items.map(({ href, label, icon: Icon, exact, badge }) => (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`pd-sidebar-item ${isActive(href, exact) ? "active" : ""}`}
              >
                <Icon size={15} strokeWidth={isActive(href, exact) ? 2.2 : 1.8} />
                <span>{label}</span>
                {badge ? (
                  <span className="pd-sidebar-badge">{badge}</span>
                ) : null}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pd-sidebar-footer">
        <div className="pd-sidebar-avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pd-sidebar-user-name">{userName ?? "Kullanıcı"}</div>
          <div className="pd-sidebar-user-role">{userRole ?? persona}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/giris" })}
          title="Çıkış yap"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--pd-muted-2)",
            padding: "4px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            transition: "color 120ms ease"
          }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </>
  );
}

export function PremiumSidebar(props: PremiumSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="pd-mobile-topbar">
        <div className="pd-sidebar-brand" style={{ border: "none", padding: 0, gap: 8 }}>
          <div className="pd-sidebar-logo-sq">OD</div>
          <span className="pd-sidebar-brand-name">Online Dershanem</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--pd-ink-3)",
            padding: "6px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center"
          }}
          aria-label="Menü"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(2px)"
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`pd-app-sidebar ${open ? "open" : ""}`}>
        <SidebarContent {...props} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
