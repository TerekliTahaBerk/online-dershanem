/**
 * Panel navigation manifests — admin/teacher/student/parent için sidebar yapısı.
 *
 * Her item bir `permission` key'i ile gating'lenir; runtime'da
 * `usePermissions().can(perm)` ile gizlenir/gösterilir.
 */

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  HeartHandshake,
  School,
  CalendarDays,
  ClipboardList,
  PackageOpen,
  Receipt,
  Wallet,
  Inbox,
  BarChart3,
  FileText,
  Settings,
  ShieldCheck,
  ScrollText,
  BookOpen,
  CheckSquare,
  CalendarCheck,
  UserCircle,
  type LucideIcon
} from "lucide-react";
import type { PermissionKey } from "@/lib/rbac/matrix";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  badge?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type PanelKey = "admin" | "teacher" | "student" | "parent";

export const navManifests: Record<PanelKey, NavGroup[]> = {
  admin: [
    {
      label: "Genel",
      items: [
        { href: "/v2/admin",                label: "Dashboard",   icon: LayoutDashboard, permission: "statistics.dashboard.read" },
        { href: "/v2/admin/inbox",          label: "Inbox",       icon: Inbox,           permission: "inbox.read.own" }
      ]
    },
    {
      label: "Eğitim",
      items: [
        { href: "/v2/admin/ogrenciler",     label: "Öğrenciler",  icon: Users,           permission: "students.read" },
        { href: "/v2/admin/ogretmenler",    label: "Öğretmenler", icon: GraduationCap,   permission: "teachers.read" },
        { href: "/v2/admin/veliler",        label: "Veliler",     icon: HeartHandshake,  permission: "parents.read" },
        { href: "/v2/admin/siniflar",       label: "Sınıflar",    icon: School,          permission: "classrooms.read" },
        { href: "/v2/admin/dersler",        label: "Dersler",     icon: CalendarDays,    permission: "lessons.read" },
        { href: "/v2/admin/odevler",        label: "Ödevler",     icon: ClipboardList,   permission: "assignments.read" }
      ]
    },
    {
      label: "Finans",
      items: [
        { href: "/v2/admin/paketler",       label: "Paketler",    icon: PackageOpen,     permission: "packages.read" },
        { href: "/v2/admin/odemeler",       label: "Ödemeler",    icon: Receipt,         permission: "payments.read" },
        { href: "/v2/admin/muhasebe",       label: "Muhasebe",    icon: Wallet,          permission: "accounting.read" }
      ]
    },
    {
      label: "Analiz",
      items: [
        { href: "/v2/admin/istatistikler",  label: "İstatistikler", icon: BarChart3,     permission: "statistics.dashboard.read" },
        { href: "/v2/admin/raporlar",       label: "Raporlar",      icon: FileText,      permission: "reports.read" }
      ]
    },
    {
      label: "Sistem",
      items: [
        { href: "/v2/admin/izinler",        label: "İzinler",     icon: ShieldCheck,     permission: "permissions.read" },
        { href: "/v2/admin/audit",          label: "Audit Log",   icon: ScrollText,      permission: "audit.read" },
        { href: "/v2/admin/ayarlar",        label: "Ayarlar",     icon: Settings,        permission: "settings.read" }
      ]
    }
  ],

  teacher: [
    {
      label: "Genel",
      items: [
        { href: "/v2/ogretmen",             label: "Dashboard",   icon: LayoutDashboard, permission: "statistics.dashboard.read.own" },
        { href: "/v2/ogretmen/inbox",       label: "Inbox",       icon: Inbox,           permission: "inbox.read.own" }
      ]
    },
    {
      label: "Eğitim",
      items: [
        { href: "/v2/ogretmen/siniflarim",  label: "Sınıflarım",   icon: School,         permission: "classrooms.read.own" },
        { href: "/v2/ogretmen/dersler",     label: "Derslerim",    icon: CalendarDays,   permission: "lessons.read.own" },
        { href: "/v2/ogretmen/ogrencilerim",label: "Öğrencilerim", icon: Users,          permission: "students.read.classroom" },
        { href: "/v2/ogretmen/yoklama",     label: "Yoklama",      icon: CheckSquare,    permission: "lessons.attendance.write" },
        { href: "/v2/ogretmen/odevler",     label: "Ödevler",      icon: ClipboardList,  permission: "assignments.write" },
        { href: "/v2/ogretmen/takvim",      label: "Takvim",       icon: CalendarCheck,  permission: "lessons.read.own" }
      ]
    },
    {
      label: "Hesabım",
      items: [
        { href: "/v2/ogretmen/profil",      label: "Profil & Maaş", icon: UserCircle,    permission: "accounting.payroll.read.own" }
      ]
    }
  ],

  student: [
    {
      label: "Panelim",
      items: [
        { href: "/v2/panel",                label: "Dashboard",   icon: LayoutDashboard, permission: "statistics.dashboard.read.own" },
        { href: "/v2/panel/inbox",          label: "Inbox",       icon: Inbox,           permission: "inbox.read.own" }
      ]
    },
    {
      label: "Eğitim",
      items: [
        { href: "/v2/panel/sinifim",        label: "Sınıfım",      icon: School,         permission: "students.read.own" },
        { href: "/v2/panel/dersler",        label: "Derslerim",    icon: BookOpen,       permission: "lessons.read.own" },
        { href: "/v2/panel/odevler",        label: "Ödevlerim",    icon: ClipboardList,  permission: "assignments.read.own" },
        { href: "/v2/panel/devamsizlik",    label: "Devamsızlık",  icon: CalendarCheck,  permission: "students.read.own" },
        { href: "/v2/panel/denemelerim",    label: "Denemelerim",  icon: BarChart3,      permission: "students.read.own" },
        { href: "/v2/panel/paketim",        label: "Paketim",      icon: PackageOpen,    permission: "students.read.own" }
      ]
    },
    {
      label: "Hesabım",
      items: [
        { href: "/v2/panel/profil",         label: "Profil",       icon: UserCircle,     permission: "students.read.own" }
      ]
    }
  ],

  parent: [
    {
      label: "Genel",
      items: [
        { href: "/v2/veli",                 label: "Dashboard",   icon: LayoutDashboard, permission: "statistics.dashboard.read.own" },
        { href: "/v2/veli/inbox",           label: "Inbox",       icon: Inbox,           permission: "inbox.read.own" }
      ]
    },
    {
      label: "Çocuğum",
      items: [
        { href: "/v2/veli/cocuklarim",      label: "Çocuklarım",   icon: Users,          permission: "students.read.own" },
        { href: "/v2/veli/dersler",         label: "Dersler",      icon: BookOpen,       permission: "lessons.read.own" },
        { href: "/v2/veli/odevler",         label: "Ödevler",      icon: ClipboardList,  permission: "assignments.read.own" },
        { href: "/v2/veli/devamsizlik",     label: "Devamsızlık",  icon: CalendarCheck,  permission: "students.read.own" }
      ]
    },
    {
      label: "Finans",
      items: [
        { href: "/v2/veli/odemeler",        label: "Ödemeler",     icon: Receipt,        permission: "payments.read.own" }
      ]
    },
    {
      label: "Hesabım",
      items: [
        { href: "/v2/veli/profil",          label: "Profil",       icon: UserCircle,     permission: "parents.read.own" }
      ]
    }
  ]
};

export const panelMeta: Record<PanelKey, { label: string; href: string; pastel: "mint" | "sky" | "yellow" | "blush" | "lavender" }> = {
  admin:   { label: "Admin",    href: "/v2/admin",    pastel: "mint" },
  teacher: { label: "Öğretmen", href: "/v2/ogretmen", pastel: "sky" },
  student: { label: "Öğrenci",  href: "/v2/panel",    pastel: "yellow" },
  parent:  { label: "Veli",     href: "/v2/veli",     pastel: "blush" }
};
