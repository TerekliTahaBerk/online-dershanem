/**
 * P0-5 SALT-OKUNUR DENETİM — OK-only / ODK-only siparişten yanlışlıkla açılmış
 * olabilecek OD üyelikleri (saf sınıflandırma; DB'ye dokunmaz).
 *
 * `ORDER_GRANTS_BUYER_OD_MEMBERSHIP` eskiden OK/ODK satırlarında da `true`
 * idi: yalnız Yön Koçluk ya da yalnız Deneme Ligi alan öğrenciye `source:
 * PURCHASE` bir OD üyeliği açılıyordu. Bu modül YALNIZ kanıtı güçlü satırları
 * aday sayar; belirsiz (satırsız eski sipariş, başka OD kanıtı) satırları ayrı
 * etiketler. Hiçbir sonuç otomatik geri alma için kullanılmaz — yönetim inceler.
 */

export type OdMembershipAuditClassification =
  /** Kaynak sipariş satırlı, OD satırı yok ve başka OD satın alma kanıtı yok. */
  | "CANDIDATE"
  /** Kaynak siparişte OD satırı var — üyelik meşru. */
  | "HAS_OD_LINE"
  /** Satırsız (satır tablosu öncesi) sipariş — tarihsel davranış; belirsiz, işaretlenmez. */
  | "LEGACY_LINELESS_ORDER"
  /** Kullanıcının başka bir siparişinde OD satırı / satırsız ödenmiş sipariş var. */
  | "OD_EVIDENCE_ELSEWHERE"
  /** Üyelik satın alma kaynaklı değil (manuel, promosyon…). */
  | "NOT_PURCHASE"
  /** `sourceOdOrderId` boş ya da sipariş bulunamadı — kanıt yok, işaretlenmez. */
  | "SOURCE_ORDER_UNKNOWN";

export type OdMembershipAuditInput = {
  membership: { source: string; sourceOdOrderId: string | null };
  sourceOrder: { lineProducts: readonly string[] } | null;
  /** Kullanıcının OD üyeliğini meşru kılabilecek başka sipariş kimlikleri. */
  otherOdEvidenceOrderIds: readonly string[];
};

export function classifyOdMembership(input: OdMembershipAuditInput): OdMembershipAuditClassification {
  if (input.membership.source !== "PURCHASE") return "NOT_PURCHASE";
  if (!input.membership.sourceOdOrderId || !input.sourceOrder) return "SOURCE_ORDER_UNKNOWN";
  const lines = input.sourceOrder.lineProducts;
  if (lines.length === 0) return "LEGACY_LINELESS_ORDER";
  if (lines.includes("OD")) return "HAS_OD_LINE";
  if (input.otherOdEvidenceOrderIds.length > 0) return "OD_EVIDENCE_ELSEWHERE";
  return "CANDIDATE";
}
