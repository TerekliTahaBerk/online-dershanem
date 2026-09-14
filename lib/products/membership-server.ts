import "server-only";

import type { Prisma, PrismaClient, ProductAccessSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asLegacyProductCode, membershipBridgeValues } from "@/lib/products/codes";

type MembershipClient = Prisma.TransactionClient | PrismaClient;

export type GrantProductMembershipInput = {
  userId: string;
  /** Registry kodu: "OD" | "OK" | "ODK" | "KPSS" | … */
  productCode: string;
  source: ProductAccessSource;
  grantedById?: string | null;
  startsAt?: Date;
  expiresAt?: Date | null;
  /** Satın alma kaynaklı üyelikte siparişin kimliği; verilmezse dokunulmaz. */
  sourceOdOrderId?: string | null;
};

/**
 * `ProductMembership` yazımı için registry köprüsü adapter'ı.
 *
 * - Legacy ürün: `(userId, product)` üzerinden upsert, `productRefId` de yazılır.
 * - Registry ürünü (KPSS): `(userId, productRefId)` üzerinden upsert. KPSS Görev 5'ten
 *   beri enum üyesi olduğu için `product` de birlikte yazılır
 *   (`membershipBridgeValues`); enum dışı bir registry kodu için `product` NULL kalır.
 * - Legacy olmayan ürün registry'de pasifse (`is_active=false`) üyelik AÇILMAZ.
 *
 * Mevcut legacy yazma yolları (`provisioning`, admin ürün formu) enum ile yazmaya
 * devam eder; migration 0106 trigger'ı `product_ref_id`'yi onlar için doldurur.
 */
export async function grantProductMembership(input: GrantProductMembershipInput, client: MembershipClient = prisma) {
  const product = await client.product.findUnique({
    where: { code: input.productCode },
    select: { id: true, code: true, isActive: true },
  });
  if (!product) throw new Error(`PRODUCT_NOT_FOUND:${input.productCode}`);

  const legacy = asLegacyProductCode(input.productCode);
  if (!legacy && !product.isActive) throw new Error(`PRODUCT_INACTIVE:${input.productCode}`);

  const bridge = membershipBridgeValues(product);
  const data = {
    source: input.source,
    grantedById: input.grantedById ?? null,
    startsAt: input.startsAt ?? new Date(),
    expiresAt: input.expiresAt ?? null,
    revokedAt: null,
    ...(input.sourceOdOrderId !== undefined ? { sourceOdOrderId: input.sourceOdOrderId } : {}),
  };

  if (legacy) {
    return client.productMembership.upsert({
      where: { userId_product: { userId: input.userId, product: legacy } },
      create: { userId: input.userId, ...bridge, ...data },
      update: { productRefId: bridge.productRefId, ...data },
    });
  }

  return client.productMembership.upsert({
    where: { userId_productRefId: { userId: input.userId, productRefId: bridge.productRefId } },
    create: { userId: input.userId, ...bridge, ...data },
    update: { product: bridge.product, ...data },
  });
}

export async function revokeProductMembership(
  input: { userId: string; productCode: string },
  client: MembershipClient = prisma,
) {
  return client.productMembership.updateMany({
    where: { userId: input.userId, productRef: { code: input.productCode }, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
