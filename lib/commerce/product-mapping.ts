import type { CommerceProduct, FinancialSource, ProductCode } from "@prisma/client";

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
  KPSS: "KPSS",
};

/**
 * Ürünün siparişi hangi tabloda yaşar?
 *
 * Online Koçum, Online Dershanem ile aynı faturalama ritmine (aylık) ve aynı
 * PayTR merchant prefix'ine sahip olduğu için `OdOrder` üzerinden yürür;
 * böylece "ders + koçluk" tek sipariş olabilir. Deneme Kulübü dönemsel
 * faturalandığı ve kendi hak/sözleşme modeli olduğu için ayrı tablodadır.
 *
 * KPSS "sınava kadar erişim" satar — ritmi ODK'ya benzer ama `OdkOrder` ve
 * `OdkEntitlement` NOT NULL `OdkPackage` FK'sı taşır; KPSS'yi oraya yazmak sahte
 * bir ODK paketi gerektirirdi. `OdOrder` ise birleşik sepettir (paket FK'sı
 * opsiyonel) ve pencereli ODK satırlarını zaten taşır. Bu yüzden KPSS "od"
 * tablosunda, "OD" merchant prefix'iyle yürür; pencere satır snapshot'ından
 * gelir (bkz. `COMMERCE_FULFILLMENT`). KPSS'ye özgü sipariş/hak modeli ayrı bir
 * görev adayıdır.
 */
export const COMMERCE_ORDER_TABLE: Record<CommerceProduct, "od" | "odk"> = {
  OD: "od",
  OK: "od",
  ODK: "odk",
  KPSS: "od",
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
  KPSS: "od",
};

/**
 * Yetkisi doğrudan `ProductMembership` ile açılan/kapatılan ürünler.
 *
 * ODK bunun dışındadır: erişimi `OdkEntitlement` sözleşmesiyle ve dönem
 * penceresiyle yönetilir, bu yüzden iade akışında farklı davranır.
 * KPSS üyelik temellidir (pencereli üyelik); tam iadede üyelik kapanır.
 */
export const MEMBERSHIP_BACKED_PRODUCTS: Record<CommerceProduct, boolean> = {
  OD: true,
  OK: true,
  ODK: false,
  KPSS: true,
};

/**
 * Ödenmiş bir sipariş SATIRI hangi mantıkla yerine getirilir?
 *
 * `lib/od/provisioning.ts` eskiden `MEMBERSHIP_BACKED ? üyelik : ODK` ikili
 * dalıydı; KPSS "üyelik değil" işaretlenseydi sessizce ODK yetkisi açardı.
 *
 * - `open_membership`: süresiz üyelik (aylık ürünler).
 * - `odk_contract`: ODK paket sözleşmesi + `OdkEntitlement` penceresi.
 * - `exam_window_membership`: satır snapshot'ındaki `accessEndsAt`'e kadar
 *   üyelik; registry ürünü pasifse (`is_active=false`) açılmaz.
 */
export type CommerceFulfillment = "open_membership" | "odk_contract" | "exam_window_membership";

export const COMMERCE_FULFILLMENT: Record<CommerceProduct, CommerceFulfillment> = {
  OD: "open_membership",
  OK: "open_membership",
  ODK: "odk_contract",
  KPSS: "exam_window_membership",
};

/**
 * `OdOrder` provizyonu siparişin alıcısına OD üyeliği açar mı?
 *
 * Tarihsel olarak `provisionOdOrder` satırlara bakmadan HER OD siparişine OD
 * üyeliği açıyordu. OK/ODK için bu davranış bu görevde DEĞİŞTİRİLMEDİ (true);
 * KPSS-only siparişin alıcısı K-12 ders erişimi almamalıdır (false).
 */
export const ORDER_GRANTS_BUYER_OD_MEMBERSHIP: Record<CommerceProduct, boolean> = {
  OD: true,
  OK: true,
  ODK: true,
  KPSS: false,
};

/** Satırsız (satır tablosu öncesi) siparişler tarihsel davranışı korur. */
export function orderGrantsBuyerOdMembership(lineProducts: readonly CommerceProduct[]): boolean {
  return lineProducts.length === 0 || lineProducts.some((product) => ORDER_GRANTS_BUYER_OD_MEMBERSHIP[product]);
}

/**
 * Sipariş defteri kaynağı → iş birimi.
 *
 * `upsertOrderLedger` eskiden `source === "ONLINE_DERSHANEM" ? "OD" : "ODK"`
 * kullanıyordu: tanımsız bir kaynak (ör. ileride KPSS satışı) sessizce ODK
 * defterine yazılırdı. Tip `Extract<…>` ile daraltılmış olsa da çağıranlar
 * JSON/iş kuyruğu yükünden geldiği için çalışma zamanında da reddedilir.
 */
export type OrderLedgerSource = Extract<FinancialSource, "ONLINE_DERSHANEM" | "ONLINE_DENEME_KULUBU">;

export const ORDER_LEDGER_UNITS: Record<OrderLedgerSource, { product: ProductCode; unitName: string }> = {
  ONLINE_DERSHANEM: { product: "OD", unitName: "OnlineDershanem" },
  ONLINE_DENEME_KULUBU: { product: "ODK", unitName: "OnlineDenemeKulübü" },
};

export function orderLedgerUnitForSource(source: string): { product: ProductCode; unitName: string } {
  if (!Object.hasOwn(ORDER_LEDGER_UNITS, source)) {
    throw new Error(`UNSUPPORTED_ORDER_LEDGER_SOURCE:${source}`);
  }
  return ORDER_LEDGER_UNITS[source as OrderLedgerSource];
}

/**
 * Sipariş-seviyesi analitik filtresi bu ürünü ayırt edebilir mi?
 *
 * KPSS `OdOrder` içinde OD/OK satırlarıyla aynı siparişte yaşayabilir;
 * sipariş-seviyesi sayım KPSS filtresinde bütün OD siparişlerini sayardı.
 * Satır-seviyesi analitik gelene kadar reddedilir.
 */
const ANALYTICS_ORDER_FILTERABLE: Record<ProductCode, boolean> = {
  OD: true,
  OK: true,
  ODK: true,
  KPSS: false,
};

/**
 * Analitik ürün filtresi → sayılacak sipariş tabloları.
 *
 * `lib/analytics/server.ts` eskiden `product === "ODK" ? odk : product === "OD" || "OK" ? od : ikisi`
 * zinciri kullanıyordu; filtreye eklenecek dördüncü bir değer (KPSS) "ALL" gibi
 * iki tabloyu birden sayardı. Tanımsız değer artık hata verir.
 */
export function orderScopeForProductFilter(filter: string): { od: boolean; odk: boolean } {
  if (filter === "ALL") return { od: true, odk: true };
  if (!Object.hasOwn(PRODUCT_ORDER_TABLE, filter) || !ANALYTICS_ORDER_FILTERABLE[filter as ProductCode]) {
    throw new Error(`UNSUPPORTED_ANALYTICS_PRODUCT_FILTER:${filter}`);
  }
  const table = PRODUCT_ORDER_TABLE[filter as ProductCode];
  return { od: table === "od", odk: table === "odk" };
}
