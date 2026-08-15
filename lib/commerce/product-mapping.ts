import type { CommerceProduct, ProductCode } from "@prisma/client";

/**
 * TİCARET ÜRÜNÜ → YETKİ ÜRÜNÜ ve SİPARİŞ TABLOSU eşlemesi.
 *
 * NEDEN TEK YERDE: bu eşleme daha önce kod içine dağılmış ikili
 * `product === "OD" ? … : …` dalları olarak duruyordu. Üçüncü ürün (Koçum)
 * eklendiğinde o dalların hepsi Koçum'u sessizce ODK sayardı — ödeme,
 * mutabakat ve iade kodunda sessiz yanlış kategorileme en pahalı hata türü.
 *
 * Buradaki `Record<CommerceProduct, …>` bilinçli: enum'a yeni ürün
 * eklendiğinde bu dosya DERLEME HATASI verir ve geliştirici her akış için
 * kararı açıkça vermek zorunda kalır.
 */

/** Satın alma başarılı olduğunda açılacak yetki ürünü. */
export const COMMERCE_TO_PRODUCT_CODE: Record<CommerceProduct, ProductCode> = {
  OD: "OD",
  OK: "OK",
  ODK: "ODK",
};

/**
 * Ürünün siparişi hangi tabloda yaşar?
 *
 * Online Koçum, Online Dershanem ile aynı faturalama ritmine (aylık) ve aynı
 * PayTR merchant prefix'ine sahip olduğu için `OdOrder` üzerinden yürür;
 * böylece "ders + koçluk" tek sipariş olabilir. Deneme Kulübü dönemsel
 * faturalandığı ve kendi hak/sözleşme modeli olduğu için ayrı tablodadır.
 */
export const COMMERCE_ORDER_TABLE: Record<CommerceProduct, "od" | "odk"> = {
  OD: "od",
  OK: "od",
  ODK: "odk",
};

/**
 * Aynı eşlemenin YETKİ ürünü (`ProductCode`) ile anahtarlanmış hâli.
 *
 * `BusinessUnit.product` bu tipte olduğu için mutabakat tarafı bunu kullanır.
 * İki enum bilerek ayrı; ikisi de burada tanımlı olduğu için biri değişip
 * diğeri unutulduğunda derleme hatası çıkar.
 */
export const PRODUCT_ORDER_TABLE: Record<ProductCode, "od" | "odk"> = {
  OD: "od",
  OK: "od",
  ODK: "odk",
};

/**
 * Yetkisi doğrudan `ProductMembership` ile açılan/kapatılan ürünler.
 *
 * ODK bunun dışındadır: erişimi `OdkEntitlement` sözleşmesiyle ve dönem
 * penceresiyle yönetilir, bu yüzden iade akışında farklı davranır.
 */
export const MEMBERSHIP_BACKED_PRODUCTS: Record<CommerceProduct, boolean> = {
  OD: true,
  OK: true,
  ODK: false,
};
