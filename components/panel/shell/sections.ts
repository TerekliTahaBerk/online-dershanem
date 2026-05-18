import type { UserRole } from "@prisma/client";
import type { PanelRole } from "@/lib/panel-access";
import { roleToSegment } from "@/lib/panel-access";
import type { AccessFlags } from "@/lib/access/odk";

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

export type ProductId = "od" | "odk";

export type ProductSections = {
  od: SidebarGroup[];
  odk: SidebarGroup[];
};

const base = (seg: PanelRole, path: string) =>
  `/panel/${seg}${path === "" ? "" : `/${path}`}`;
const odkBase = (seg: PanelRole, path: string) =>
  `/panel/${seg}/odk${path === "" ? "" : `/${path}`}`;

// ── ODK alt-ürün sidebar grupları ────────────────────────────────────────────

function adminOdkSections(): SidebarGroup[] {
  const seg: PanelRole = "admin";
  return [
    { items: [
      { id: "odk-dashboard", label: "ODK Dashboard", icon: "target", href: odkBase(seg, "") },
    ]},
    { title: "İçerik", items: [
      { id: "odk-denemeler", label: "Denemeler", icon: "report", href: odkBase(seg, "denemeler") },
      { id: "odk-kazanim", label: "Kazanım Analizi", icon: "chart", href: odkBase(seg, "kazanim") },
      { id: "odk-cheat", label: "Cheat Logları", icon: "alert", href: odkBase(seg, "cheat") },
    ]},
    { title: "Satış", items: [
      { id: "odk-paketler", label: "ODK Paketleri", icon: "package", href: odkBase(seg, "paketler") },
      { id: "odk-siparisler", label: "ODK Siparişleri", icon: "money", href: odkBase(seg, "siparisler") },
      { id: "odk-odemeler", label: "ODK Ödemeleri", icon: "money", href: odkBase(seg, "odemeler") },
      { id: "odk-muhasebe", label: "ODK Muhasebe", icon: "money", href: "/panel/admin/muhasebe?service=ODK" },
    ]},
    { title: "Erişim", items: [
      { id: "odk-erisim", label: "Erişim Tagları", icon: "shield", href: odkBase(seg, "erisim") },
      { id: "odk-erisim-users", label: "Kullanıcı Erişimleri", icon: "users", href: odkBase(seg, "erisim/kullanicilar") },
    ]},
    { title: "İnsanlar", items: [
      { id: "odk-ogrenciler", label: "ODK Öğrencileri", icon: "users", href: odkBase(seg, "ogrenciler") },
    ]},
    { title: "Analiz", items: [
      { id: "odk-raporlar", label: "Raporlar", icon: "report", href: odkBase(seg, "raporlar") },
    ]},
  ];
}

function teacherOdkSections(): SidebarGroup[] {
  const seg: PanelRole = "ogretmen";
  return [
    { items: [
      { id: "odk-dashboard", label: "ODK Dashboard", icon: "target", href: odkBase(seg, "") },
    ]},
    { title: "ODK", items: [
      { id: "odk-ogrencilerim", label: "Öğrenci Sonuçları", icon: "users", href: odkBase(seg, "ogrencilerim") },
      { id: "odk-siniflar", label: "Sınıf Analizi", icon: "classroom", href: odkBase(seg, "siniflar") },
      { id: "odk-kazanim", label: "Kazanım Zayıflıkları", icon: "chart", href: odkBase(seg, "kazanim") },
      { id: "odk-cheat", label: "Cheat Logları", icon: "alert", href: odkBase(seg, "cheat") },
    ]},
  ];
}

function studentOdkSections(): SidebarGroup[] {
  const seg: PanelRole = "ogrenci";
  return [
    { items: [
      { id: "odk-dashboard", label: "ODK Dashboard", icon: "target", href: odkBase(seg, "") },
    ]},
    { title: "Eğitim", items: [
      { id: "odk-denemeler", label: "Denemeler", icon: "play", href: odkBase(seg, "denemeler") },
      { id: "odk-kazanim", label: "Kazanım Analizim", icon: "chart", href: odkBase(seg, "kazanim-analizim") },
      { id: "odk-gelisim", label: "Gelişim Grafiğim", icon: "chart", href: odkBase(seg, "gelisim") },
    ]},
  ];
}

function parentOdkSections(): SidebarGroup[] {
  const seg: PanelRole = "veli";
  return [
    { items: [
      { id: "odk-dashboard", label: "ODK Dashboard", icon: "target", href: odkBase(seg, "") },
    ]},
    { title: "Takip", items: [
      { id: "odk-cocuklarim", label: "Çocuklarım", icon: "users", href: odkBase(seg, "cocuklarim") },
      { id: "odk-gelisim", label: "Net Gelişimi", icon: "chart", href: odkBase(seg, "gelisim") },
      { id: "odk-kazanim", label: "Zayıf Kazanımlar", icon: "alert", href: odkBase(seg, "kazanim") },
    ]},
  ];
}

function odkSectionsForRole(role: UserRole): SidebarGroup[] {
  switch (role) {
    case "ADMIN": return adminOdkSections();
    case "TEACHER": return teacherOdkSections();
    case "STUDENT": return studentOdkSections();
    case "PARENT": return parentOdkSections();
    default: return [];
  }
}

// ── OD (OnlineDershanem) sidebar grupları ────────────────────────────────────

function adminSections(): SidebarGroup[] {
  const seg: PanelRole = "admin";
  return [
    { items: [
      { id: "dashboard", label: "Dashboard", icon: "home", href: base(seg, "") },
      { id: "inbox", label: "Inbox", icon: "inbox", href: base(seg, "inbox") },
    ]},
    { title: "Eğitim", items: [
      { id: "siniflar", label: "Sınıflar", icon: "classroom", href: base(seg, "siniflar") },
      { id: "dersler", label: "Dersler", icon: "book", href: base(seg, "dersler") },
      { id: "ders-programi", label: "Ders programı", icon: "cal", href: base(seg, "ders-programi") },
      { id: "odevler", label: "Ödevler", icon: "assignment", href: base(seg, "odevler") },
    ]},
    { title: "İnsanlar", items: [
      { id: "ogrenciler", label: "Öğrenciler", icon: "users", href: base(seg, "ogrenciler") },
      { id: "ogretmenler", label: "Öğretmenler", icon: "school", href: base(seg, "ogretmenler") },
      { id: "veliler", label: "Veliler", icon: "parent", href: base(seg, "veliler") },
    ]},
    { title: "Finans", items: [
      { id: "paketler", label: "Paketler", icon: "package", href: base(seg, "paketler") },
      { id: "od-siparisler", label: "OD Siparişleri", icon: "money", href: base(seg, "od-siparisler") },
      { id: "indirim-kodlari", label: "İndirim Kodları", icon: "tag", href: base(seg, "indirim-kodlari") },
      { id: "odemeler", label: "Ödemeler", icon: "money", href: base(seg, "odemeler") },
      { id: "muhasebe", label: "Muhasebe", icon: "report", href: `${base(seg, "muhasebe")}?service=OD` },
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

function odSectionsForRole(role: UserRole): SidebarGroup[] {
  switch (role) {
    case "ADMIN": return adminSections();
    case "TEACHER": return teacherSections();
    case "STUDENT": return studentSections();
    case "PARENT": return parentSections();
    default: return studentSections();
  }
}

export function getProductSectionsForRole(role: UserRole): ProductSections {
  return {
    od: odSectionsForRole(role),
    odk: odkSectionsForRole(role),
  };
}

export function getSectionsForProduct(
  role: UserRole,
  product: ProductId,
  accessFlags?: AccessFlags,
): SidebarGroup[] {
  if (product === "odk") {
    const allowed = role === "ADMIN" || (accessFlags?.hasODK ?? false);
    return allowed ? odkSectionsForRole(role) : [];
  }
  return odSectionsForRole(role);
}

export function getSectionsForRole(
  role: UserRole,
  accessFlags?: AccessFlags,
): SidebarGroup[] {
  const od = odSectionsForRole(role);
  const includeOdk = role === "ADMIN" || (accessFlags?.hasODK ?? false);
  if (!includeOdk) return od;
  return [...od, ...odkSectionsForRole(role)];
}

export function roleHomeHref(role: UserRole): string {
  return `/panel/${roleToSegment(role)}`;
}
