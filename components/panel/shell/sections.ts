import type { UserRole } from "@prisma/client";
import type { PanelRole } from "@/lib/panel-access";
import { roleToSegment } from "@/lib/panel-access";

export type SidebarItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  count?: number | string;
  dot?: boolean;
};

export type SidebarGroup = {
  title?: string;
  items: SidebarItem[];
};

const base = (seg: PanelRole, path: string) => `/panel/${seg}${path === "" ? "" : `/${path}`}`;

function adminSections(): SidebarGroup[] {
  const seg: PanelRole = "admin";
  return [
    { items: [
      { id: "dashboard", label: "Dashboard", icon: "home", href: base(seg, "") },
      { id: "inbox", label: "Inbox", icon: "inbox", href: base(seg, "inbox") },
    ]},
    { title: "Operasyon", items: [
      { id: "ogrenciler", label: "Öğrenciler", icon: "users", href: base(seg, "ogrenciler") },
      { id: "ogretmenler", label: "Öğretmenler", icon: "school", href: base(seg, "ogretmenler") },
      { id: "veliler", label: "Veliler", icon: "parent", href: base(seg, "veliler") },
      { id: "siniflar", label: "Sınıflar", icon: "classroom", href: base(seg, "siniflar") },
      { id: "dersler", label: "Dersler", icon: "book", href: base(seg, "dersler") },
      { id: "odevler", label: "Ödevler", icon: "assignment", href: base(seg, "odevler") },
      { id: "ders-programi", label: "Ders programı", icon: "cal", href: base(seg, "ders-programi") },
    ]},
    { title: "Finans", items: [
      { id: "paketler", label: "Paketler", icon: "package", href: base(seg, "paketler") },
      { id: "odemeler", label: "Ödemeler", icon: "money", href: base(seg, "odemeler") },
      { id: "muhasebe", label: "Muhasebe", icon: "report", href: base(seg, "muhasebe") },
    ]},
    { title: "Analiz", items: [
      { id: "istatistikler", label: "İstatistikler", icon: "chart", href: base(seg, "istatistikler") },
      { id: "raporlar", label: "Raporlar", icon: "report", href: base(seg, "raporlar") },
    ]},
    { title: "Sistem", items: [
      { id: "ayarlar", label: "Ayarlar", icon: "settings", href: base(seg, "ayarlar") },
      { id: "yetkiler", label: "Yetkiler", icon: "shield", href: base(seg, "yetkiler") },
      { id: "audit", label: "Audit logs", icon: "log", href: base(seg, "audit") },
    ]},
  ];
}

function teacherSections(): SidebarGroup[] {
  const seg: PanelRole = "ogretmen";
  return [
    { items: [
      { id: "dashboard", label: "Dashboard", icon: "home", href: base(seg, "") },
      { id: "siniflarim", label: "Sınıflarım", icon: "classroom", href: base(seg, "siniflarim") },
      { id: "ogrencilerim", label: "Öğrencilerim", icon: "users", href: base(seg, "ogrencilerim") },
    ]},
    { title: "Ders", items: [
      { id: "ders-programi", label: "Ders programı", icon: "cal", href: base(seg, "ders-programi") },
      { id: "yoklama", label: "Yoklama", icon: "check", href: base(seg, "yoklama") },
      { id: "odevler", label: "Ödevler", icon: "assignment", href: base(seg, "odevler") },
      { id: "karne", label: "Karne", icon: "chart", href: base(seg, "karne") },
    ]},
    { title: "İletişim", items: [
      { id: "mesajlar", label: "Mesajlar", icon: "inbox", href: base(seg, "mesajlar") },
      { id: "duyurular", label: "Duyurular", icon: "megaphone", href: base(seg, "duyurular") },
    ]},
    { title: "Hesap", items: [
      { id: "kazanclarim", label: "Kazançlarım", icon: "money", href: base(seg, "kazanclarim") },
      { id: "profilim", label: "Profilim", icon: "user", href: base(seg, "profilim") },
    ]},
  ];
}

function studentSections(): SidebarGroup[] {
  const seg: PanelRole = "ogrenci";
  return [
    { items: [
      { id: "dashboard", label: "Dashboard", icon: "home", href: base(seg, "") },
      { id: "sinifim", label: "Sınıfım", icon: "classroom", href: base(seg, "sinifim") },
      { id: "derslerim", label: "Derslerim", icon: "book", href: base(seg, "derslerim") },
      { id: "ogretmenlerim", label: "Öğretmenlerim", icon: "school", href: base(seg, "ogretmenlerim") },
    ]},
    { title: "Eğitim", items: [
      { id: "ders-programi", label: "Ders programı", icon: "cal", href: base(seg, "ders-programi") },
      { id: "odevler", label: "Ödevler", icon: "assignment", href: base(seg, "odevler") },
      { id: "performansim", label: "Performansım", icon: "chart", href: base(seg, "performansim") },
    ]},
    { title: "Hesap", items: [
      { id: "paketim", label: "Paketim", icon: "package", href: base(seg, "paketim") },
      { id: "bildirimler", label: "Bildirimler", icon: "bell", href: base(seg, "bildirimler") },
      { id: "profilim", label: "Profilim", icon: "user", href: base(seg, "profilim") },
    ]},
  ];
}

function parentSections(): SidebarGroup[] {
  const seg: PanelRole = "veli";
  return [
    { items: [
      { id: "dashboard", label: "Dashboard", icon: "home", href: base(seg, "") },
      { id: "cocuklarim", label: "Çocuklarım", icon: "users", href: base(seg, "cocuklarim") },
    ]},
    { title: "Takip", items: [
      { id: "performans", label: "Performans", icon: "chart", href: base(seg, "performans") },
      { id: "devam", label: "Devam durumu", icon: "check", href: base(seg, "devam") },
      { id: "odev-takibi", label: "Ödev takibi", icon: "assignment", href: base(seg, "odev-takibi") },
      { id: "ders-programi", label: "Ders programı", icon: "cal", href: base(seg, "ders-programi") },
    ]},
    { title: "Finans", items: [
      { id: "odemeler", label: "Ödemeler", icon: "money", href: base(seg, "odemeler") },
      { id: "faturalar", label: "Faturalar", icon: "report", href: base(seg, "faturalar") },
    ]},
    { title: "İletişim", items: [
      { id: "ogretmenlerle", label: "Öğretmenlerle", icon: "inbox", href: base(seg, "ogretmenlerle") },
      { id: "profilim", label: "Profilim", icon: "user", href: base(seg, "profilim") },
    ]},
  ];
}

export function getSectionsForRole(role: UserRole): SidebarGroup[] {
  switch (role) {
    case "ADMIN": return adminSections();
    case "TEACHER": return teacherSections();
    case "STUDENT": return studentSections();
    case "PARENT": return parentSections();
    default: return studentSections();
  }
}

export function roleHomeHref(role: UserRole): string {
  return `/panel/${roleToSegment(role)}`;
}
