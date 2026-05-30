import type { UserRole } from "@prisma/client";

/**
 * Quick Action = kullanıcıların en sık yaptıkları işlemlere bir-tık erişim.
 * Command Palette ve Quick Actions menüsü bunu paylaşır.
 */

export type QuickAction = {
  id: string;
  label: string;
  hint?: string;
  /** URL — nereye gider */
  href: string;
  /** Lucide icon adı (components/panel/ui/icon.tsx -> ICONS keys) */
  icon: string;
  /** Klavye ipucu (örn: "n s") — sadece görsel hint */
  shortcut?: string;
};

const ADMIN: QuickAction[] = [
  { id: "qa-new-student",   label: "Yeni öğrenci ekle",      href: "/panel/admin/ogrenciler/yeni",   icon: "plus",       shortcut: "n s" },
  { id: "qa-new-teacher",   label: "Yeni öğretmen ekle",     href: "/panel/admin/ogretmenler",       icon: "school",     shortcut: "n t" },
  { id: "qa-new-lesson",    label: "Yeni canlı ders oluştur", href: "/panel/admin/dersler",          icon: "play",       shortcut: "n l" },
  { id: "qa-new-classroom", label: "Yeni sınıf oluştur",     href: "/panel/admin/siniflar",          icon: "classroom",  shortcut: "n c" },
  { id: "qa-new-package",   label: "Yeni paket oluştur",     href: "/panel/admin/paketler",          icon: "package" },
  { id: "qa-new-exam",      label: "Yeni ODK denemesi yayınla", href: "/panel/admin/odk/denemeler",  icon: "target" },
  { id: "qa-discount",      label: "İndirim kodu oluştur",   href: "/panel/admin/indirim-kodlari",   icon: "tag" },
  { id: "qa-payments",      label: "Ödemeleri aç",           href: "/panel/admin/odemeler",          icon: "money" },
  { id: "qa-inbox",         label: "Inbox’a git",            href: "/panel/admin/inbox",             icon: "inbox",      shortcut: "g i" },
  { id: "qa-audit",         label: "Audit loglarına git",    href: "/panel/admin/audit",             icon: "log" },
];

const TEACHER: QuickAction[] = [
  { id: "qa-attendance",    label: "Yoklama al",             href: "/panel/ogretmen/yoklama",        icon: "check",      shortcut: "g y" },
  { id: "qa-schedule",      label: "Ders programıma git",    href: "/panel/ogretmen/ders-programi",  icon: "cal",        shortcut: "g p" },
  { id: "qa-assignments",   label: "Ödevleri aç",            href: "/panel/ogretmen/odevler",        icon: "assignment", shortcut: "g o" },
  { id: "qa-messages",      label: "Mesajlara git",          href: "/panel/ogretmen/mesajlar",       icon: "msg",        shortcut: "g m" },
  { id: "qa-announce",      label: "Duyuru gönder",          href: "/panel/ogretmen/duyurular",      icon: "megaphone" },
  { id: "qa-students",      label: "Öğrencilerime git",      href: "/panel/ogretmen/ogrencilerim",   icon: "users",      shortcut: "g s" },
];

const STUDENT: QuickAction[] = [
  { id: "qa-schedule",      label: "Ders programım",         href: "/panel/ogrenci/ders-programi",   icon: "cal",        shortcut: "g p" },
  { id: "qa-assignments",   label: "Ödevlerim",              href: "/panel/ogrenci/odevler",         icon: "assignment", shortcut: "g o" },
  { id: "qa-odk-exams",     label: "ODK denemeler",          href: "/panel/ogrenci/odk/denemeler",   icon: "target",     shortcut: "g e" },
  { id: "qa-study",         label: "Çalışma odası",          href: "/panel/ogrenci/calisma-odasi",   icon: "clock",      shortcut: "g r" },
  { id: "qa-performance",   label: "Performansım",           href: "/panel/ogrenci/performansim",    icon: "chart" },
  { id: "qa-package",       label: "Paketim",                href: "/panel/ogrenci/paketim",         icon: "package" },
];

const PARENT: QuickAction[] = [
  { id: "qa-children",      label: "Çocuklarım",             href: "/panel/veli/cocuklarim",         icon: "users",      shortcut: "g c" },
  { id: "qa-attendance",    label: "Devam durumu",           href: "/panel/veli/devam",              icon: "check" },
  { id: "qa-assignments",   label: "Ödev takibi",            href: "/panel/veli/odev-takibi",        icon: "assignment" },
  { id: "qa-performance",   label: "Performans",             href: "/panel/veli/performans",         icon: "chart" },
  { id: "qa-payments",      label: "Ödemeler",               href: "/panel/veli/odemeler",           icon: "money" },
  { id: "qa-teachers",      label: "Öğretmenlerle iletişim", href: "/panel/veli/ogretmenlerle",      icon: "inbox" },
];

export function quickActionsForRole(role: UserRole): QuickAction[] {
  switch (role) {
    case "ADMIN":   return ADMIN;
    case "TEACHER": return TEACHER;
    case "STUDENT": return STUDENT;
    case "PARENT":  return PARENT;
    default:        return [];
  }
}

/**
 * `g+x` go-to map (keyboard shortcuts). Quick action shortcut'larından
 * `g ?` formatındakileri yakalar.
 */
export function goToShortcutsForRole(role: UserRole): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of quickActionsForRole(role)) {
    if (!a.shortcut) continue;
    const m = /^g\s+([a-z])$/i.exec(a.shortcut);
    if (m) map[m[1].toLowerCase()] = a.href;
  }
  // Dashboard her zaman 'g d'
  switch (role) {
    case "ADMIN":   map.d = "/panel/admin"; break;
    case "TEACHER": map.d = "/panel/ogretmen"; break;
    case "STUDENT": map.d = "/panel/ogrenci"; break;
    case "PARENT":  map.d = "/panel/veli"; break;
  }
  return map;
}
