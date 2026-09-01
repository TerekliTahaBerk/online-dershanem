import type { UserRole } from "@prisma/client";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";
import type { BusinessPermission } from "@/lib/business/permission-matrix";

/**
 * Panel global search + command palette — saf domain.
 *
 * DB yok. Sorgu normalizasyonu, komut kataloğu ve sonuç gruplama burada;
 * Prisma sorguları `global-search-server.ts` içinde çalışır.
 */

export const GLOBAL_SEARCH_MIN_CHARS = 2;
export const GLOBAL_SEARCH_DEBOUNCE_MS = 180;
export const GLOBAL_SEARCH_PER_KIND_LIMIT = 5;
export const GLOBAL_SEARCH_RECENT_KEY = "od.panel.global-search.recent";
export const GLOBAL_SEARCH_RECENT_LIMIT = 6;

export type GlobalSearchKind =
  | "STUDENT"
  | "PARENT"
  | "TEACHER"
  | "USER"
  | "GROUP"
  | "LESSON"
  | "ORDER"
  | "LEAD"
  | "EXAM"
  | "COMMAND";

export type GlobalSearchResult = {
  kind: GlobalSearchKind;
  id: string;
  label: string;
  detail: string;
  href: string;
};

export type GlobalSearchCommandMatch = {
  id: string;
  label: string;
  detail: string;
  href: string;
};

export type GlobalSearchCommand = GlobalSearchCommandMatch & {
  roles: readonly UserRole[];
  /** Verilirse yalnız bu feature flag açıkken görünür. */
  flag?: keyof PanelFeatureFlags;
  /** İşletme paneli izni; yoksa işletme kontrolü uygulanmaz. */
  businessPermission?: BusinessPermission;
};

export type GlobalSearchViewer = {
  role: UserRole;
  flags: PanelFeatureFlags;
  businessPermissions: ReadonlySet<BusinessPermission> | readonly BusinessPermission[];
};

export const GLOBAL_SEARCH_KIND_LABELS: Record<Exclude<GlobalSearchKind, "COMMAND">, string> = {
  STUDENT: "Öğrenciler",
  PARENT: "Veliler",
  TEACHER: "Öğretmenler",
  USER: "Kullanıcılar",
  GROUP: "Gruplar",
  LESSON: "Dersler",
  ORDER: "Siparişler",
  LEAD: "Adaylar",
  EXAM: "Denemeler",
};

export const GLOBAL_SEARCH_KIND_ORDER: Array<Exclude<GlobalSearchKind, "COMMAND">> = [
  "STUDENT",
  "PARENT",
  "TEACHER",
  "USER",
  "GROUP",
  "LESSON",
  "ORDER",
  "LEAD",
  "EXAM",
];

/** Hızlı aksiyonlar — yetki/flag sunucuda ve istemcide aynı kaynaktan süzülür. */
export const GLOBAL_SEARCH_COMMANDS: readonly GlobalSearchCommand[] = [
  {
    id: "ops-center",
    label: "Operasyon merkezine git",
    detail: "Bugün müdahale gerekenler ve operasyon özeti",
    href: "/panel/yonetim",
    roles: ["ADMIN"],
  },
  {
    id: "create-student",
    label: "Yeni öğrenci oluştur",
    detail: "Geçici parolalı öğrenci hesabı aç",
    href: "/panel/yonetim/kullanicilar#yeni-hesap",
    roles: ["ADMIN"],
  },
  {
    id: "create-group",
    label: "Yeni grup oluştur",
    detail: "En fazla dört öğrencilik grup kur",
    href: "/panel/yonetim/egitim#yeni-grup",
    roles: ["ADMIN"],
  },
  {
    id: "schedule-lesson",
    label: "Ders planla",
    detail: "Gruba 60 dakikalık ders oturumu ekle",
    href: "/panel/yonetim/egitim#ders-planla",
    roles: ["ADMIN"],
  },
  {
    id: "orders",
    label: "Siparişlere git",
    detail: "Ödeme ve provisioning durumları",
    href: "/panel/yonetim/siparisler",
    roles: ["ADMIN"],
  },
  {
    id: "provisioning",
    label: "Bekleyen provisioning işleri",
    detail: "İş kuyruğu, onboarding ve cron durumu",
    href: "/panel/yonetim/isler",
    roles: ["ADMIN"],
  },
  {
    id: "interventions",
    label: "Açık müdahaleleri göster",
    detail: "Açıklanabilir müdahale kutusu",
    href: "/panel/yonetim/mudahale",
    roles: ["ADMIN"],
    flag: "interventionInbox",
  },
  {
    id: "teacher-interventions",
    label: "Açık müdahaleleri göster",
    detail: "Kapsamındaki öğrenci müdahaleleri",
    href: "/panel/ogretmen/mudahale",
    roles: ["TEACHER"],
    flag: "interventionInbox",
  },
  {
    id: "exam-ops",
    label: "Deneme operasyonunu aç",
    detail: "Canlı deneme akışı ve incident takibi",
    href: "/panel/odk/yonetim/operasyon",
    roles: ["ADMIN"],
  },
  {
    id: "exam-plan",
    label: "Deneme planlamayı aç",
    detail: "Sınav planı, hazırlık ve yayın akışı",
    href: "/panel/odk/yonetim/sinavlar",
    roles: ["ADMIN"],
  },
  {
    id: "students",
    label: "Öğrencileri aç",
    detail: "Öğrenci operasyon görünümünü aç",
    href: "/panel/yonetim/ogrenciler",
    roles: ["ADMIN"],
  },
  {
    id: "teachers",
    label: "Öğretmenleri aç",
    detail: "Öğretmen operasyon görünümünü aç",
    href: "/panel/yonetim/egitmenler",
    roles: ["ADMIN"],
  },
  {
    id: "parents",
    label: "Velileri aç",
    detail: "Veli operasyon görünümünü aç",
    href: "/panel/yonetim/veliler",
    roles: ["ADMIN"],
  },
  {
    id: "users",
    label: "Kişileri aç",
    detail: "Evrensel dizin: tüm rollerde arama",
    href: "/panel/yonetim/kullanicilar",
    roles: ["ADMIN"],
  },
  {
    id: "education",
    label: "Gruplar ve dersleri aç",
    detail: "Eğitim operasyonu",
    href: "/panel/yonetim/egitim",
    roles: ["ADMIN"],
  },
  {
    id: "calendar",
    label: "Haftalık takvimi aç",
    detail: "Tüm ders oturumlarını gün gün gör",
    href: "/panel/yonetim/takvim",
    roles: ["ADMIN"],
  },
  {
    id: "teacher-calendar",
    label: "Takvimimi aç",
    detail: "Kendi ders programın",
    href: "/panel/ogretmen/takvim",
    roles: ["TEACHER"],
  },
  {
    id: "teacher-groups",
    label: "Gruplarımı aç",
    detail: "Aktif gruplar ve öğrenciler",
    href: "/panel/ogretmen/gruplar",
    roles: ["TEACHER"],
  },
  {
    id: "coaching",
    label: "Koçluk operasyonunu aç",
    detail: "Öğrenci başarısı / koçluk masası",
    href: "/panel/yonetim/kocluk",
    roles: ["ADMIN"],
  },
  {
    id: "audit",
    label: "İşlem geçmişini aç",
    detail: "Yönetim ve güvenlik kayıtları",
    href: "/panel/yonetim/kayitlar",
    roles: ["ADMIN"],
  },
  {
    id: "leads",
    label: "Adayları aç",
    detail: "İşletme CRM aday listesi",
    href: "/panel/yonetim/isletme/adaylar",
    roles: ["ADMIN"],
    businessPermission: "lead:read",
  },
] as const;

export function hasBusinessPermission(
  granted: GlobalSearchViewer["businessPermissions"],
  permission: BusinessPermission,
): boolean {
  if (granted instanceof Set) return granted.has(permission);
  return (granted as readonly BusinessPermission[]).includes(permission);
}

export function visibleGlobalSearchCommands(viewer: GlobalSearchViewer): GlobalSearchCommand[] {
  return GLOBAL_SEARCH_COMMANDS.filter((command) => {
    if (!command.roles.includes(viewer.role)) return false;
    if (command.flag && !viewer.flags[command.flag]) return false;
    if (command.businessPermission && !hasBusinessPermission(viewer.businessPermissions, command.businessPermission)) {
      return false;
    }
    return true;
  });
}

export function matchCommands(
  commands: readonly GlobalSearchCommandMatch[],
  query: string,
): GlobalSearchCommandMatch[] {
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  if (!needle) return [...commands];
  return commands.filter((item) =>
    `${item.label} ${item.detail}`.toLocaleLowerCase("tr-TR").includes(needle),
  );
}

/** Türkçe karakter / case için ILIKE varyantları (en fazla 4). */
export function searchNeedleVariants(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const trLower = trimmed.toLocaleLowerCase("tr-TR");
  const asciiFold = trLower
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
  const enLower = trimmed.toLowerCase();

  const unique: string[] = [];
  for (const value of [trimmed, trLower, enLower, asciiFold]) {
    if (value && !unique.includes(value)) unique.push(value);
  }
  return unique.slice(0, 4);
}

/** Basit tek karakter kaydırma / komşu harf — ağır search engine değil. */
export function typoRelaxedNeedles(raw: string): string[] {
  const base = raw.trim().toLocaleLowerCase("tr-TR");
  if (base.length < 4 || base.length > 24) return [];
  const alphabet = "abcçdefgğhıijklmnoöprsştuüvyz";
  const variants = new Set<string>();

  for (let i = 0; i < base.length; i += 1) {
    const without = `${base.slice(0, i)}${base.slice(i + 1)}`;
    if (without.length >= GLOBAL_SEARCH_MIN_CHARS) variants.add(without);

    const ch = base[i];
    const idx = alphabet.indexOf(ch);
    if (idx >= 0) {
      for (const neighbor of [alphabet[idx - 1], alphabet[idx + 1]].filter(Boolean)) {
        variants.add(`${base.slice(0, i)}${neighbor}${base.slice(i + 1)}`);
      }
    }
  }

  return [...variants].slice(0, 6);
}

export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function looksLikeRecordId(raw: string): boolean {
  return /^c[a-z0-9]{8,}$/i.test(raw.trim());
}

export type GlobalSearchSection = {
  kind: GlobalSearchKind;
  title: string;
  items: GlobalSearchResult[];
};

export function groupGlobalSearchResults(results: readonly GlobalSearchResult[]): GlobalSearchSection[] {
  const commands = results.filter((item) => item.kind === "COMMAND");
  const sections: GlobalSearchSection[] = [];

  if (commands.length) {
    sections.push({ kind: "COMMAND", title: "Komutlar", items: [...commands] });
  }

  for (const kind of GLOBAL_SEARCH_KIND_ORDER) {
    const items = results.filter((item) => item.kind === kind);
    if (!items.length) continue;
    sections.push({ kind, title: GLOBAL_SEARCH_KIND_LABELS[kind], items: [...items] });
  }

  return sections;
}

export function flattenSearchSections(sections: readonly GlobalSearchSection[]): GlobalSearchResult[] {
  return sections.flatMap((section) => section.items);
}

export function readRecentSearches(storage: Pick<Storage, "getItem"> | null | undefined): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(GLOBAL_SEARCH_RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length >= GLOBAL_SEARCH_MIN_CHARS && item.length <= 80)
      .slice(0, GLOBAL_SEARCH_RECENT_LIMIT);
  } catch {
    return [];
  }
}

/**
 * Yalnız sorgu metnini saklar — sonuç satırı / e-posta / telefon cache'lenmez.
 */
export function writeRecentSearch(
  storage: Pick<Storage, "getItem" | "setItem"> | null | undefined,
  query: string,
): string[] {
  if (!storage) return [];
  const needle = query.trim();
  if (needle.length < GLOBAL_SEARCH_MIN_CHARS || needle.length > 80) {
    return readRecentSearches(storage);
  }
  // Hassas veri: e-posta / uzun telefon / id benzeri değerleri recent'e yazma.
  if (needle.includes("@") || phoneDigits(needle).length >= 7 || looksLikeRecordId(needle)) {
    return readRecentSearches(storage);
  }
  const next = [needle, ...readRecentSearches(storage).filter((item) => item !== needle)].slice(
    0,
    GLOBAL_SEARCH_RECENT_LIMIT,
  );
  storage.setItem(GLOBAL_SEARCH_RECENT_KEY, JSON.stringify(next));
  return next;
}

export function commandsToResults(commands: readonly GlobalSearchCommandMatch[]): GlobalSearchResult[] {
  return commands.map((command) => ({
    kind: "COMMAND",
    id: command.id,
    label: command.label,
    detail: command.detail,
    href: command.href,
  }));
}
