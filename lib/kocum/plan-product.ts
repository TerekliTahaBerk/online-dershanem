import "server-only";

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PlanApprovalPolicy } from "./plan-approval";

/**
 * Haftalık planın ürün kimliği (`WeeklyPlan.productRefId`) için tek çözüm noktası.
 *
 * `weekly_plans` satırı KPSS Görev 6'ya kadar hangi ürüne ait olduğunu hiç
 * tutmuyordu; ürün bilgisi yalnız API katmanındaki sabit `"OK"` kontrollerinden
 * geliyordu. Artık zorunlu bir FK: plan yazan HER yol ürününü açıkça söylemek
 * zorunda (Prisma tipi bunu derleme zamanında dayatır).
 */

/** Online Koçum — koç/öğretmen onayı zorunlu, öğretmenli K-12 ürünü. */
export const OK_PRODUCT_CODE = "OK";
/** KPSS — çoğunlukla öğretmensiz, otonom kullanılan yetişkin ürünü. */
export const KPSS_PRODUCT_CODE = "KPSS";

export type PlanProduct = PlanApprovalPolicy & {
  id: string;
  code: string;
};

/**
 * Ürün satırını koda göre okur. Ürün yoksa `findUniqueOrThrow` gürültülü hata
 * verir — sessizce "onay gerekmiyor"a düşmek, onay akışını kazara kapatırdı.
 */
export async function getPlanProductByCode(code: string, db: PrismaClient = prisma): Promise<PlanProduct> {
  const product = await db.product.findUniqueOrThrow({
    where: { code },
    select: { id: true, code: true, requiresPlanApproval: true },
  });
  return product;
}

/**
 * Online Koçum plan yazma yolları için kısayol. Koçluk akışları (şablon uygula,
 * plan kopyala, koç görevi ekle, öneri onayla) tanımı gereği OK planı üretir.
 */
export async function getOkPlanProductId(db: PrismaClient = prisma): Promise<string> {
  return (await getPlanProductByCode(OK_PRODUCT_CODE, db)).id;
}
