/**
 * ÜRÜN-BAZLI PLAN ONAY POLİTİKASI — saf karar mantığı (DB/IO yok).
 *
 * Haftalık plan onayı eskiden ürüne değil, KODA gömülüydü: onay ucu
 * `requireApiProductRole("OK", "TEACHER")` ile sabitti ve her plan koç onayı
 * beklemek zorundaydı. Bu, öğretmenli K-12 bağlamında (Online Koçum) DOĞRU
 * tasarımdır; KPSS gibi çoğunlukla öğretmensiz, otonom kullanılan bir üründe
 * ise öğrenciyi hiç gelmeyecek bir onayı beklemeye mahkûm eder.
 *
 * Karar artık verinin kendisinde: `Product.requiresPlanApproval`. Yeni bir
 * "öğretmensiz" ürün eklendiğinde burada kod değişmez, ürün satırı değişir.
 */

/** Planın ürününden okunan onay politikası. */
export type PlanApprovalPolicy = {
  requiresPlanApproval: boolean;
};

/** Yeni üretilen bir planın doğacağı onay durumu. */
export type InitialPlanApprovalState = {
  status: "DRAFT" | "APPROVED";
  /**
   * Otomatik onayda NULL kalır. Sistem onayını gerçek bir kullanıcı kimliğine
   * bağlamak denetim kaydını yalan söyletirdi: kimse o planı onaylamadı.
   * "Kim onayladı?" sorusunun cevabı `autoApproved` bayrağıdır.
   */
  approvedById: null;
  approvedAt: Date | null;
  autoApproved: boolean;
};

/**
 * Onay gerektiren üründe plan TASLAK doğar (mevcut OK davranışı, birebir).
 * Gerektirmeyen üründe üretildiği anda onaylı doğar ve onay ucuna hiç uğramaz.
 */
export function initialPlanApprovalState(
  policy: PlanApprovalPolicy,
  now: Date,
): InitialPlanApprovalState {
  if (policy.requiresPlanApproval) {
    return { status: "DRAFT", approvedById: null, approvedAt: null, autoApproved: false };
  }
  return { status: "APPROVED", approvedById: null, approvedAt: now, autoApproved: true };
}

/**
 * Onaylı plan yeniden üretilebilir mi?
 *
 * OK'ta HAYIR: koç onayladıysa plan kilitlenir, öğrenci önce değişiklik ister
 * (mevcut davranış korunur). Otomatik onaylı planda kilitleyecek bir insan
 * kararı yoktur — aksi halde KPSS öğrencisi ilk plandan sonra haftasını bir
 * daha asla dengeleyemezdi.
 */
export function canRegeneratePlan(plan: {
  status: string;
  autoApproved: boolean;
}): boolean {
  return plan.status !== "APPROVED" || plan.autoApproved;
}

/**
 * Bu plan onay ucundan (`/api/panel/adaptive-plan/[id]/approve`) geçebilir mi?
 * Otomatik onaylı ürünlerde uç anlamsızdır: onaylanacak bir şey yoktur.
 */
export function planAcceptsManualApproval(policy: PlanApprovalPolicy): boolean {
  return policy.requiresPlanApproval;
}
