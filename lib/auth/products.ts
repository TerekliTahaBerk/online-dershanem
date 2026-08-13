import "server-only";

import type { ProductCode, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PASSWORD_CHANGE_PATH, PRODUCT_SELECTOR_PATH, productRolePath } from "@/lib/auth/roles";

const STAFF_PRODUCTS: ProductCode[] = ["OD", "ODK"];

export async function getAccessibleProducts(userId: string, role: UserRole, now = new Date()): Promise<ProductCode[]> {
  // Personel görev gereği iki üründe de çalışır. DB satırları kaynak/audit için
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
  return (await getAccessibleProducts(userId, role)).includes(product);
}

export async function postAuthenticationPath(input: { userId: string; role: UserRole; mustChangePassword: boolean; mfaVerifiedAt?: Date | null }): Promise<string> {
  if (input.mustChangePassword) return PASSWORD_CHANGE_PATH;
  if (input.role === "ADMIN" && !input.mfaVerifiedAt) return "/giris/mfa";
  const products = await getAccessibleProducts(input.userId, input.role);
  if (products.length === 1) return productRolePath(products[0], input.role);
  return PRODUCT_SELECTOR_PATH;
}
