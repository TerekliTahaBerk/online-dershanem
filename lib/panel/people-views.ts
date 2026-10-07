import type { Prisma } from "@prisma/client";

/**
 * KİŞİLER & ERİŞİM görünümleri (docs/panel-design-roadmap.md §14.1) — saf
 * kurallar. Liste sayfası bunlardan Prisma süzgecini ve sekme bağlantılarını
 * kurar; görünüm adı yetki değildir (sayfa ADMIN guard'ı arkasındadır).
 */

export const PEOPLE_VIEWS = [
  { id: "tumu", label: "Tümü" },
  { id: "ogrenciler", label: "Öğrenciler" },
  { id: "veliler", label: "Veliler" },
  { id: "ogretmenler", label: "Öğretmenler" },
  { id: "koclar", label: "Koçlar" },
  { id: "personel", label: "Personel" },
] as const;
export type PeopleView = (typeof PEOPLE_VIEWS)[number]["id"];

/**
 * Eski `?sekme=` değerleri (STUDENT/TEACHER/PARENT) görünüme eşlenir. Sekme
 * yoksa eski `kullanicilar?rol=` bağlantıları (yönlendirme sorguyu korur)
 * rolden görünüme düşer; ADMIN rolü "Tümü" + rol süzgecidir. Varsayılan Öğrenciler.
 */
export function parsePeopleView(raw: string | undefined, rol?: string): PeopleView {
  const value = raw ?? (rol === "ADMIN" ? "tumu" : rol);
  if (value === "STUDENT") return "ogrenciler";
  if (value === "TEACHER") return "ogretmenler";
  if (value === "PARENT") return "veliler";
  return PEOPLE_VIEWS.find((view) => view.id === value)?.id ?? "ogrenciler";
}

/** Deneme Ligi ve ürün yöneticisi rolleri: "Personel" görünümü. */
export const STAFF_VIEW_ROLES = ["EXAM_EDITOR", "EXAM_OPERATOR", "RESULT_PUBLISHER", "REPORT_VIEWER", "PRODUCT_MANAGER"] as const;

/** Görünümün temel süzgeci; arama/ürün/durum süzgeciyle `AND` ile birleşir. */
export function peopleViewWhere(view: PeopleView): Prisma.UserWhereInput {
  switch (view) {
    case "ogrenciler":
      return { role: "STUDENT" };
    case "veliler":
      return { role: "PARENT" };
    case "ogretmenler":
      return { role: "TEACHER" };
    case "koclar":
      return {
        role: "TEACHER",
        OR: [{ teacherProfile: { isCoach: true } }, { productStaffAssignments: { some: { role: "COACH", revokedAt: null } } }],
      };
    case "personel":
      return {
        OR: [{ role: "ADMIN" }, { role: "TEACHER", productStaffAssignments: { some: { role: { in: [...STAFF_VIEW_ROLES] }, revokedAt: null } } }],
      };
    default:
      return {};
  }
}

/** Rol süzgeci yalnız "Tümü" görünümünde anlamlıdır (diğerleri rolü zaten sabitler). */
export function viewAllowsRoleFilter(view: PeopleView): boolean {
  return view === "tumu";
}

export const RESPONSIBILITY_LABEL: Record<string, string> = {
  TEACHER: "Öğretmen",
  COACH: "Koç",
  EXAM_EDITOR: "Editör",
  EXAM_OPERATOR: "Operatör",
  RESULT_PUBLISHER: "Yayıncı",
  REPORT_VIEWER: "Rapor",
  PRODUCT_MANAGER: "Ürün yön.",
};

const RESPONSIBILITY_ORDER = Object.keys(RESPONSIBILITY_LABEL);

/** Aktif sorumluluk rozetleri: tekrarsız ve sabit sırada. */
export function responsibilityBadges(roles: readonly string[]): string[] {
  return [...new Set(roles)]
    .filter((role) => role in RESPONSIBILITY_LABEL)
    .sort((a, b) => RESPONSIBILITY_ORDER.indexOf(a) - RESPONSIBILITY_ORDER.indexOf(b))
    .map((role) => RESPONSIBILITY_LABEL[role]!);
}

export type PeopleQuery = { view: PeopleView; q: string; rol: string; urun: string; durum: string; sayfa?: number };

/** Paylaşılabilir liste bağlantısı; boş süzgeçler URL'ye yazılmaz. */
export function peopleHref(query: PeopleQuery, patch: Partial<PeopleQuery> = {}): string {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  params.set("sekme", next.view);
  if (next.q) params.set("q", next.q);
  if (next.rol && viewAllowsRoleFilter(next.view)) params.set("rol", next.rol);
  if (next.urun) params.set("urun", next.urun);
  if (next.durum) params.set("durum", next.durum);
  if (next.sayfa && next.sayfa > 1) params.set("sayfa", String(next.sayfa));
  return `/panel/yonetim/kisiler?${params.toString()}`;
}

/** Sayfalama penceresi: ilk, son ve geçerli sayfanın komşuları; arada boşluk (null). */
export function pageWindow(page: number, pages: number): Array<number | null> {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((n, index) => {
    if (index && n - sorted[index - 1]! > 1) out.push(null);
    out.push(n);
  });
  return out;
}
