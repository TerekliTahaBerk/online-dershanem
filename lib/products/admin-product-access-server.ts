import "server-only";

import { prisma } from "@/lib/prisma";
import { grantProductMembership, revokeProductMembership } from "@/lib/products/membership-server";
import { planAdminProductAccessChange, type AdminAccessProduct, type AdminProductAccessPlan } from "@/lib/products/admin-product-access";

/**
 * Yönetim ürün erişimi formunu uygular — mevcut üyeliği ASLA yeniden yazmaz.
 *
 * - seçili + mevcut (iptal edilmemiş, süresi dolmamış) → dokunulmaz
 *   (satın alma kaynağı, pencere, `sourceOdOrderId` korunur)
 * - seçili + eksik → kanonik `grantProductMembership` ile MANUAL üyelik
 * - seçilmemiş + iptal edilmemiş → kanonik `revokeProductMembership`
 *   (`revokedAt` işaretlenir, satır ve satın alma alanları korunur)
 *
 * Oturum kapatma ve audit kaydı çağıranın (route) sorumluluğundadır; plan
 * döndürülür ki audit yükü korunan / yeniden açılan satırları içerebilsin.
 */
export async function applyAdminProductAccessChange(input: {
  userId: string;
  actorUserId: string;
  requested: readonly AdminAccessProduct[];
  now?: Date;
}): Promise<AdminProductAccessPlan> {
  const now = input.now ?? new Date();
  const memberships = await prisma.productMembership.findMany({
    where: { userId: input.userId, product: { in: ["OD", "OK", "ODK"] } },
    select: { id: true, product: true, source: true, startsAt: true, expiresAt: true, revokedAt: true, sourceOdOrderId: true },
  });
  const plan = planAdminProductAccessChange({ memberships, requested: input.requested, now });

  await prisma.$transaction(async (tx) => {
    for (const product of plan.grant) {
      await grantProductMembership({ userId: input.userId, productCode: product, source: "MANUAL", grantedById: input.actorUserId, startsAt: now }, tx);
    }
    for (const product of plan.revoke) {
      await revokeProductMembership({ userId: input.userId, productCode: product }, tx);
    }
  });

  return plan;
}
