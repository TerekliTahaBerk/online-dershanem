import type { BusinessPermission } from "@/lib/business/permission-matrix";

/**
 * İşletme Paneli bölüm haritası — navigasyon, sayfa guard'ı ve gruplama için
 * TEK kaynak. Menüde görünen her bölüm buradaki izinle korunur; menüyü
 * gizlemek güvenlik sınırı değildir, sunucu guard'ı her zaman ayrıca çalışır.
 */

export type BusinessSectionSlug =
  | "genel-bakis"
  | "mesaj-kutusu"
  | "adaylar"
  | "satis-hunisi"
  | "reklamlar"
  | "kampanyalar"
  | "gelirler"
  | "giderler"
  | "vergiler"
  | "mutabakat"
  | "raporlar"
  | "ai-bilgi-merkezi"
  | "otomasyon-kurallari"
  | "entegrasyonlar"
  | "sistem-kayitlari"
  | "ayarlar";

/** Bölümü GÖRÜNTÜLEMEK için gereken izin. Yazma izinleri ayrıca kontrol edilir. */
export const SECTION_PERMISSIONS: Record<BusinessSectionSlug, BusinessPermission> = {
  "genel-bakis": "dashboard:read",
  "mesaj-kutusu": "conversation:read",
  adaylar: "lead:read",
  "satis-hunisi": "lead:read",
  reklamlar: "campaign:read",
  kampanyalar: "campaign:read",
  gelirler: "finance:read",
  giderler: "finance:read",
  vergiler: "finance:read",
  mutabakat: "finance:read",
  raporlar: "finance:read",
  "ai-bilgi-merkezi": "knowledge:read",
  "otomasyon-kurallari": "automation:read",
  entegrasyonlar: "integration:read",
  "sistem-kayitlari": "audit:read",
  ayarlar: "settings:read",
};

/**
 * On altı düz menü öğesi yerine anlamlı gruplar. Grup tamamen boşsa
 * (kullanıcının hiçbir bölümüne izni yoksa) menüde hiç görünmez.
 */
export const BUSINESS_SECTION_GROUPS: ReadonlyArray<{
  id: string;
  label: string;
  sections: readonly BusinessSectionSlug[];
}> = [
  { id: "genel", label: "Genel", sections: ["genel-bakis"] },
  { id: "crm", label: "CRM", sections: ["mesaj-kutusu", "adaylar", "satis-hunisi"] },
  { id: "pazarlama", label: "Pazarlama", sections: ["reklamlar", "kampanyalar"] },
  { id: "finans", label: "Finans", sections: ["gelirler", "giderler", "vergiler", "mutabakat", "raporlar"] },
  { id: "ai", label: "AI ve Otomasyon", sections: ["ai-bilgi-merkezi", "otomasyon-kurallari"] },
  { id: "platform", label: "Platform", sections: ["entegrasyonlar", "sistem-kayitlari", "ayarlar"] },
];

export const SECTION_LABELS: Record<BusinessSectionSlug, string> = {
  "genel-bakis": "Genel Bakış",
  "mesaj-kutusu": "Mesaj Kutusu",
  adaylar: "Adaylar",
  "satis-hunisi": "Satış Hunisi",
  reklamlar: "Reklamlar",
  kampanyalar: "Kampanyalar",
  gelirler: "Gelirler",
  giderler: "Giderler",
  vergiler: "Vergiler",
  mutabakat: "Mutabakat",
  raporlar: "Raporlar",
  "ai-bilgi-merkezi": "AI Bilgi Merkezi",
  "otomasyon-kurallari": "Otomasyon Kuralları",
  entegrasyonlar: "Entegrasyonlar",
  "sistem-kayitlari": "Sistem Kayıtları",
  ayarlar: "Ayarlar",
};

export const BUSINESS_SECTION_SLUGS = Object.keys(SECTION_PERMISSIONS) as BusinessSectionSlug[];

export function isBusinessSection(value: string): value is BusinessSectionSlug {
  return Object.hasOwn(SECTION_PERMISSIONS, value);
}

/** Finans bölümleri ayrı bir feature flag ile kapatılabilir. */
export const FINANCE_SECTIONS: readonly BusinessSectionSlug[] = [
  "gelirler",
  "giderler",
  "vergiler",
  "mutabakat",
  "raporlar",
];

/**
 * Kullanıcının izinlerine ve açık feature flag'lere göre görünecek bölümler.
 * Sunucu ve istemci aynı fonksiyonu kullanır; menü ile route asla ayrışmaz.
 */
export function visibleSections(
  granted: ReadonlySet<BusinessPermission>,
  options: { financeEnabled: boolean },
): BusinessSectionSlug[] {
  return BUSINESS_SECTION_SLUGS.filter((slug) => {
    if (!options.financeEnabled && FINANCE_SECTIONS.includes(slug)) return false;
    return granted.has(SECTION_PERMISSIONS[slug]);
  });
}
