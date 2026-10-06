import type { ProductAccessSource } from "@prisma/client";

/**
 * Yönetim ürün erişimi formunun karar mantığı (saf, sunucudan bağımsız).
 *
 * Girdi: kullanıcının mevcut legacy üyelik satırları + yöneticinin seçtiği ürünler.
 * Çıktı: hangi ürünün AÇILACAĞI, hangisinin İPTAL EDİLECEĞİ, hangisine
 * DOKUNULMAYACAĞI. Mevcut bir üyelik asla yeniden yazılmaz: satın alma kaynağı,
 * pencere ve sipariş bağı korunur (bkz. `app/api/panel/users/[id]/products/route.ts`).
 */

export type AdminAccessProduct = "OD" | "OK" | "ODK";

const PRODUCTS: readonly AdminAccessProduct[] = ["OD", "OK", "ODK"];

export type AdminAccessMembershipRow = {
  id: string;
  product: string | null;
  source: ProductAccessSource;
  startsAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  sourceOdOrderId: string | null;
};

export type AdminProductAccessPlan = {
  /** Önce erişimi olan ürünler (iptal edilmemiş + süresi dolmamış). */
  before: AdminAccessProduct[];
  after: AdminAccessProduct[];
  grant: AdminAccessProduct[];
  revoke: AdminAccessProduct[];
  preserved: Array<{ product: AdminAccessProduct; membershipId: string; source: ProductAccessSource; sourceOdOrderId: string | null }>;
  replacedRows: Array<{ product: AdminAccessProduct; membershipId: string; source: ProductAccessSource; startsAt: string; expiresAt: string | null; revokedAt: string | null; sourceOdOrderId: string | null }>;
  changed: boolean;
};

/**
 * Üyelik "mevcut" sayılır: iptal edilmemiş ve süresi dolmamış. Başlangıcı
 * gelecekteki (planlanmış) bir satın alma da mevcuttur ve korunur.
 */
export function isMembershipPresent(row: Pick<AdminAccessMembershipRow, "revokedAt" | "expiresAt">, now: Date): boolean {
  return row.revokedAt === null && (row.expiresAt === null || row.expiresAt > now);
}

export function planAdminProductAccessChange(input: {
  memberships: readonly AdminAccessMembershipRow[];
  requested: readonly AdminAccessProduct[];
  now: Date;
}): AdminProductAccessPlan {
  const requested = new Set(input.requested);
  const rowFor = (product: AdminAccessProduct) => input.memberships.find((row) => row.product === product) ?? null;

  const before: AdminAccessProduct[] = [];
  const grant: AdminAccessProduct[] = [];
  const revoke: AdminAccessProduct[] = [];
  const preserved: AdminProductAccessPlan["preserved"] = [];
  const replacedRows: AdminProductAccessPlan["replacedRows"] = [];

  for (const product of PRODUCTS) {
    const row = rowFor(product);
    const present = row !== null && isMembershipPresent(row, input.now);
    if (present) before.push(product);

    if (requested.has(product)) {
      if (present) {
        preserved.push({ product, membershipId: row.id, source: row.source, sourceOdOrderId: row.sourceOdOrderId });
      } else {
        grant.push(product);
        if (row) {
          replacedRows.push({
            product,
            membershipId: row.id,
            source: row.source,
            startsAt: row.startsAt.toISOString(),
            expiresAt: row.expiresAt?.toISOString() ?? null,
            revokedAt: row.revokedAt?.toISOString() ?? null,
            sourceOdOrderId: row.sourceOdOrderId,
          });
        }
      }
    } else if (row && row.revokedAt === null) {
      // Süresi dolmuş ama iptal edilmemiş satır da iptal işaretlenir (önceki
      // davranışla aynı); satır silinmez, satın alma alanları korunur.
      revoke.push(product);
    }
  }

  const after = PRODUCTS.filter((product) => requested.has(product));
  return {
    before,
    after,
    grant,
    revoke,
    preserved,
    replacedRows,
    changed: before.join(",") !== after.join(","),
  };
}
