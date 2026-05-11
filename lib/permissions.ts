import type { UserRole } from "@prisma/client";

/**
 * Permission helpers — kullanıcı rolüne göre veri/UI maskeleme.
 *
 * Kural:
 *  - ADMIN: tüm finans verisini görür
 *  - PARENT: kendi çocuğunun finans verisini görür (öğrenci üstündeki paket fiyatı dahil)
 *  - TEACHER: paket fiyatı GÖRMEZ — sadece kendi maaş kayıtlarını görür
 *  - STUDENT: paket fiyatı GÖRMEZ; satın alma akışında pazaryeri (paketler sayfası) hâlâ
 *             fiyat gösterir, ama "aktif paketim" / "ödemelerim" sayfalarında gizlidir.
 *
 * Aktif paket / mevcut üyelik fiyatı:
 *   canSeeOwnedPackagePrice(role)  → admin & parent true, student & teacher false
 * Pazaryerindeki listeleme fiyatı (satın alma için):
 *   canSeeMarketplacePrice(role)   → herkes true (öğrenci satın alabilmeli)
 * Muhasebe / gelir-gider:
 *   canSeeAccounting(role)         → sadece admin
 */

export function canSeeOwnedPackagePrice(role: UserRole | null | undefined): boolean {
  return role === "ADMIN" || role === "PARENT";
}

export function canSeeMarketplacePrice(_role: UserRole | null | undefined): boolean {
  return true;
}

export function canSeeAccounting(role: UserRole | null | undefined): boolean {
  return role === "ADMIN";
}

export function canSeeTeacherPayroll(role: UserRole | null | undefined, isOwn: boolean): boolean {
  if (role === "ADMIN") return true;
  if (role === "TEACHER" && isOwn) return true;
  return false;
}

/**
 * Format a kuruş amount as TRY, or return a masked string when not allowed.
 * UI components should always pass a role and use this helper instead of
 * raw `Intl.NumberFormat` to enforce permission rules at the leaf.
 */
export function formatPriceMasked(
  kurus: number | null | undefined,
  allowed: boolean,
  fallback = "Gizli"
): string {
  if (!allowed) return fallback;
  if (kurus == null) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(kurus / 100);
}

/**
 * Strip price-related fields from a Prisma payload before sending to a
 * lower-privileged client. Mutates a *copy* of the input.
 */
export function stripPriceFields<T extends Record<string, unknown>>(
  obj: T,
  fields: ReadonlyArray<keyof T> = ["price", "listPrice", "discountAmount"] as ReadonlyArray<keyof T>
): T {
  const out = { ...obj };
  for (const f of fields) {
    if (f in out) {
      (out as Record<string, unknown>)[f as string] = null;
    }
  }
  return out;
}
