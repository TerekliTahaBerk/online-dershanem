import type { ProductCode } from "@prisma/client";
import { asLegacyProductCode } from "./codes";

/**
 * VELİ AKIŞLARININ AÇIK OLDUĞU ÜRÜN BAĞLAMLARI.
 *
 * Veli paneli, veli bildirimleri ve veli–öğrenci bağlantısı K-12 ürünleri
 * (OD, OK, ODK) içindir. Registry'den gelen yetişkin ürünler (KPSS) veli-free'dir:
 * varsayılan KAPALI, bir ürünü veliye açmak buraya bilinçli bir satır eklemeyi
 * gerektirir.
 *
 * Kural "kullanıcı tipi KPSS" DEĞİL, "istek hangi ürün bağlamında"dır: KPSS + OD
 * üyeliği olan bir öğrencinin velisi OD bağlamında görmeye devam eder, KPSS
 * bağlamı veliye hiçbir zaman yansımaz.
 *
 * UI'da gizlemek güvenlik sınırı değildir; bu politika sunucu kapılarında
 * (`parent-scope`, `viewer-scope`, bağlantı oluşturma, takvim) uygulanır.
 */
const PARENT_VISIBLE_LEGACY_PRODUCTS: Record<ProductCode, boolean> = {
  OD: true,
  OK: true,
  ODK: true,
};

export function isParentVisibleProduct(code: string): boolean {
  const legacy = asLegacyProductCode(code);
  return legacy ? PARENT_VISIBLE_LEGACY_PRODUCTS[legacy] : false;
}

export function parentVisibleProducts(codes: readonly string[]): ProductCode[] {
  return codes.filter(isParentVisibleProduct) as ProductCode[];
}

/**
 * Öğrenci veli akışlarına dahil edilebilir mi?
 *
 * - Hiç aktif ürünü yoksa (henüz provizyon yok, süresi dolmuş) mevcut davranış
 *   korunur: veli bağlı öğrenciyi boş ekranlarla görür.
 * - En az bir veli-görünür ürünü varsa: evet (yalnız o ürünlerin bağlamında).
 * - Aktif ürünlerinin TAMAMI veli-free ise (yalnızca KPSS): hayır.
 */
export function isStudentParentVisible(activeProductCodes: readonly string[]): boolean {
  return activeProductCodes.length === 0 || activeProductCodes.some(isParentVisibleProduct);
}
