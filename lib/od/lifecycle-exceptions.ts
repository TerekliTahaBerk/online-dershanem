import type { OdOnboardingStateValue } from "@/lib/od/onboarding-state";

/**
 * OPERASYON İSTİSNA SINIFLANDIRMASI — saf kurallar.
 *
 * Ödeme sonrası akış artık kendi kendine ilerliyor: hesap açılır, davet gider,
 * veli bağı kurulur, tercihler alınır, durum `PLACEMENT_PENDING`'e taşınır.
 * Bu yüzden operasyon ekranının varsayılan görünümü ARTIK "tüm siparişler"
 * değildir — 100 müşteride sürdürülebilen o liste 10.000'de SLA üretir.
 *
 * Üç kova vardır ve karışmazlar:
 *   · `EXCEPTION` — otomasyon ilerleyemiyor. İnsan bakışı ŞART.
 *   · `HUMAN_DECISION` — otomasyonun karar VERMEMESİ gereken iş: kapasiteye
 *     göre grup atama ve ilk dersin takvime girmesi. Bu bir arıza değildir.
 *   · `AUTOMATED` — akış kendi kendine ilerliyor; ekranda tek sayı olarak
 *     görünür, satır olarak değil.
 */

export type OdLifecycleBucket = "EXCEPTION" | "HUMAN_DECISION" | "AUTOMATED";

export type OdLifecycleExceptionCode =
  | "PROVISIONING_FAILED"
  | "IDENTITY_REVIEW"
  | "BLOCKED"
  | "REFUND_PENDING"
  | "CLAIM_EXPIRED"
  | "CLAIM_STALLED"
  | "RELATIONSHIP_REJECTED"
  | "RELATIONSHIP_UNCONFIRMED"
  | "SLA_BREACHED";

export const OD_LIFECYCLE_EXCEPTION_LABELS: Record<OdLifecycleExceptionCode, string> = {
  PROVISIONING_FAILED: "Otomatik hesap açma başarısız",
  IDENTITY_REVIEW: "Kimlik çakışması incelenmeli",
  BLOCKED: "Bloke",
  REFUND_PENDING: "İade bekliyor",
  CLAIM_EXPIRED: "Davetin süresi doldu",
  CLAIM_STALLED: "Davet açılmadı",
  RELATIONSHIP_REJECTED: "Veli bağlantısını reddetti",
  RELATIONSHIP_UNCONFIRMED: "Veli bağlantısı onaylanmadı",
  SLA_BREACHED: "SLA aşıldı",
};

export const OD_LIFECYCLE_EXCEPTION_ACTIONS: Record<OdLifecycleExceptionCode, string> = {
  PROVISIONING_FAILED: "Hata nedenini açıp siparişi yeniden provision edin veya hesabı elle bağlayın.",
  IDENTITY_REVIEW: "Çakışan e-posta/kimlik kaydını inceleyip doğru öğrenci hesabını seçin.",
  BLOCKED: "Blokeri çözüp önceki adıma döndürün.",
  REFUND_PENDING: "Ödeme iadesini tamamlayıp onboarding'i kapatın.",
  CLAIM_EXPIRED: "Yeni bir hesap daveti gönderin veya müşteriye ulaşın.",
  CLAIM_STALLED: "Hatırlatmalar sonuçsuz kaldı; telefonla teyit edip yeni davet gönderin.",
  RELATIONSHIP_REJECTED: "Doğru veli hesabını bulup bağlantıyı yeniden kurun.",
  RELATIONSHIP_UNCONFIRMED: "Veliyi arayıp bağlantıyı teyit edin; yanlışsa kaldırın.",
  SLA_BREACHED: "Gecikmenin nedenini yazıp sıradaki adımı tamamlayın.",
};

/** Onaylanmamış veli bağı bu süreden sonra istisnadır. */
export const RELATIONSHIP_CONFIRMATION_GRACE_MS = 7 * 24 * 60 * 60_000;

/**
 * Davet açılmadan bu kadar beklerse istisna. Hatırlatma basamaklarının
 * (3. ve 8. gün) SONRASINA konur; hatırlatmalar daha işini yaparken kuyruğa
 * satır düşürmenin anlamı yok.
 */
export const CLAIM_STALLED_AFTER_MS = 10 * 24 * 60 * 60_000;

export type OdLifecycleFacts = {
  state: OdOnboardingStateValue;
  /** `OdOrder.provisioningStatus` */
  provisioningStatus: "PENDING" | "RUNNING" | "SUCCEEDED" | "RETRY_PENDING" | "MANUAL_REVIEW";
  dueAt: Date | null;
  /** Bekleyen/dolan davetin durumu; hiç davet yoksa `null`. */
  claim: { status: "PENDING" | "CLAIMED" | "EXPIRED" | "SUPERSEDED"; createdAt: Date } | null;
  /** Veli bağı: yoksa `null`, reddedildiyse `REJECTED`. */
  relationship: { status: "CONFIRMED" | "UNCONFIRMED" | "REJECTED"; createdAt: Date } | null;
};

export type OdLifecycleClassification = {
  bucket: OdLifecycleBucket;
  codes: OdLifecycleExceptionCode[];
};

const HUMAN_DECISION_STATES = new Set<OdOnboardingStateValue>([
  "PLACEMENT_PENDING",
  "ALTERNATE_SLOT_OFFERED",
  "ALTERNATE_SLOT_ACCEPTED",
  "WAITLISTED",
  "GROUP_ASSIGNED",
  "FIRST_LESSON_SCHEDULED",
]);

/**
 * Bir onboarding kaydının hangi kovaya düştüğü ve nedenleri.
 *
 * Kodlar CİDDİYET SIRASINDA döner; ekran ilkini rozet olarak basar. Bir kayıt
 * birden çok nedenle istisna olabilir (süresi dolmuş davet + aşılmış SLA) ve
 * ikisini de görmek gerekir — tek nedene indirgemek operasyonu yanıltır.
 */
export function classifyOdLifecycle(facts: OdLifecycleFacts, now = new Date()): OdLifecycleClassification {
  const codes: OdLifecycleExceptionCode[] = [];

  if (facts.provisioningStatus === "RETRY_PENDING" || facts.provisioningStatus === "MANUAL_REVIEW") codes.push("PROVISIONING_FAILED");
  if (facts.state === "MANUAL_REVIEW") codes.push("IDENTITY_REVIEW");
  if (facts.state === "BLOCKED") codes.push("BLOCKED");
  if (facts.state === "REFUND_PENDING" || facts.state === "NO_SLOT_REFUND_PENDING") codes.push("REFUND_PENDING");

  if (facts.claim?.status === "EXPIRED") codes.push("CLAIM_EXPIRED");
  else if (facts.claim?.status === "PENDING" && now.getTime() - facts.claim.createdAt.getTime() >= CLAIM_STALLED_AFTER_MS) {
    codes.push("CLAIM_STALLED");
  }

  if (facts.relationship?.status === "REJECTED") codes.push("RELATIONSHIP_REJECTED");
  else if (
    facts.relationship?.status === "UNCONFIRMED" &&
    now.getTime() - facts.relationship.createdAt.getTime() >= RELATIONSHIP_CONFIRMATION_GRACE_MS
  ) {
    codes.push("RELATIONSHIP_UNCONFIRMED");
  }

  if (facts.dueAt && facts.dueAt < now) codes.push("SLA_BREACHED");

  if (codes.length) return { bucket: "EXCEPTION", codes };
  if (HUMAN_DECISION_STATES.has(facts.state)) return { bucket: "HUMAN_DECISION", codes: [] };
  return { bucket: "AUTOMATED", codes: [] };
}
