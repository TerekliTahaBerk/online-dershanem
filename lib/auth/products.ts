import "server-only";

import type { ProductCode, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PASSWORD_CHANGE_PATH, rolePath } from "@/lib/auth/roles";
import { hasProductEntitlement } from "@/lib/auth/product-entitlements";

const STAFF_PRODUCTS: ProductCode[] = ["OD", "OK", "ODK"];

export async function getAccessibleProducts(userId: string, role: UserRole, now = new Date()): Promise<ProductCode[]> {
  // Personel görev gereği üç üründe de çalışır. DB satırları kaynak/audit için
  // tutulur; yanlışlıkla silinmeleri personelin operasyon erişimini kesmez.
  if (role === "ADMIN" || role === "TEACHER") return STAFF_PRODUCTS;

  const memberships = await prisma.productMembership.findMany({
    where: {
      userId,
      startsAt: { lte: now },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { product: true },
    orderBy: { product: "asc" },
  });
  return memberships.map((membership) => membership.product);
}

export async function hasProductAccess(userId: string, role: UserRole, product: ProductCode): Promise<boolean> {
  return hasProductEntitlement(await getAccessibleProducts(userId, role), product);
}

/**
 * Girişten sonra gidilecek yer.
 *
 * TEK PANEL: kullanıcı hangi ürünleri aldıysa alsın, aynı panele girer.
 * Ürün seçme adımı YOKTUR — satın alınan ürünler panelin İÇİNDE bölüm olarak
 * açılır ve menü yetkiye göre daralır (bkz. `PanelNav`).
 *
 * Eskiden burada `PRODUCT_SELECTOR_PATH` vardı ve birden çok ürünü olan kullanıcı
 * her girişte "hangi panele gireceksin?" sorusuyla karşılaşıyordu; ürün
 * mimarisi tek panele geçtiği için bu adım kaldırıldı.
 */
export async function postAuthenticationPath(input: { userId: string; role: UserRole; mustChangePassword: boolean; mfaVerifiedAt?: Date | null }): Promise<string> {
  if (input.mustChangePassword) return PASSWORD_CHANGE_PATH;
  if (input.role === "ADMIN" && !input.mfaVerifiedAt) return "/giris/mfa";
  return rolePath(input.role);
}
