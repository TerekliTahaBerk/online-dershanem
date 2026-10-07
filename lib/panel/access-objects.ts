/**
 * ÜRÜN ERİŞİMİ NESNELERİ (docs/panel-design-roadmap.md §14.3) — kullanıcı
 * detayındaki erişim kartlarının saf sunumu. Kaynak bilgisi `ProductMembership`
 * alanlarından gelir; satın alınmış erişim yalnız siparişten yönetilir.
 */

export type MembershipLike = {
  source: "MANUAL" | "PURCHASE" | "STAFF" | "PROMOTION" | "LEGACY_BACKFILL";
  startsAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

export const ACCESS_SOURCE_LABEL: Record<MembershipLike["source"], string> = {
  MANUAL: "Manuel erişim",
  PURCHASE: "Satın alındı",
  STAFF: "Personel erişimi",
  PROMOTION: "Kampanya",
  LEGACY_BACKFILL: "Eski kayıt aktarımı",
};

export type AccessState = { label: "Aktif" | "Süresi doldu" | "Sonlandırıldı" | "Başlamadı"; tone: "success" | "neutral" | "warning" };

export function accessState(membership: MembershipLike, now: Date): AccessState {
  if (membership.revokedAt) return { label: "Sonlandırıldı", tone: "neutral" };
  if (membership.expiresAt && membership.expiresAt <= now) return { label: "Süresi doldu", tone: "warning" };
  if (membership.startsAt > now) return { label: "Başlamadı", tone: "warning" };
  return { label: "Aktif", tone: "success" };
}

/** Satın alınmış erişim bu ekrandan değiştirilmez (Phase 0 P0-2); sipariş üzerinden yönetilir. */
export function accessEditableHere(membership: Pick<MembershipLike, "source">): boolean {
  return membership.source !== "PURCHASE";
}

/** Etkin erişimler önce, sonra en yeni başlangıç. */
export function sortAccessObjects<T extends MembershipLike>(rows: readonly T[], now: Date): T[] {
  const rank = (row: T) => (accessState(row, now).label === "Aktif" ? 0 : 1);
  return [...rows].sort((a, b) => rank(a) - rank(b) || b.startsAt.getTime() - a.startsAt.getTime());
}
