/**
 * KPSS "sınava kadar erişim" satır sözleşmesi — GEÇİCİ model (KPSS Görev 5).
 *
 * KPSS abonelik değil, belirli bir sınav dönemine kadar erişim satar. ODK'nın
 * pencere modeli buna en yakın olandır, ama `OdkEntitlement` NOT NULL `OdkPackage`
 * FK'sı taşıdığı için KPSS'ye uymaz. Bu yüzden pencere satırın değişmez
 * `productSnapshot`'ında taşınır ve erişim `ProductMembership.expiresAt` ile açılır.
 *
 * Eksik olan (sonraki görev adayı — KPSS'ye özgü hak modeli): sınav dönemi kaydı,
 * iade/erteleme istisnaları, sınav tarihi değişince toplu pencere güncellemesi.
 *
 * Saf modül: veritabanı ve `server-only` bağımlılığı yoktur.
 */

export type ExamAccessWindow = { startsAt: Date; expiresAt: Date };

export type ExamAccessWindowResult =
  | { ok: true; window: ExamAccessWindow }
  | { ok: false; reason: "SNAPSHOT_INVALID" | "ACCESS_END_MISSING" | "ACCESS_END_INVALID" | "ACCESS_END_NOT_AFTER_PAYMENT" };

/**
 * Satır snapshot'ından erişim penceresini okur: ödeme anından `accessEndsAt`'e kadar.
 * Tarih yoksa/bozuksa ya da ödemeden sonra değilse süresiz üyeliğe DÜŞMEZ, hata döner.
 */
export function parseExamAccessWindow(snapshot: unknown, paidAt: Date): ExamAccessWindowResult {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return { ok: false, reason: "SNAPSHOT_INVALID" };
  const raw = (snapshot as Record<string, unknown>).accessEndsAt;
  if (raw === undefined || raw === null || raw === "") return { ok: false, reason: "ACCESS_END_MISSING" };
  if (typeof raw !== "string") return { ok: false, reason: "ACCESS_END_INVALID" };
  const expiresAt = new Date(raw);
  if (Number.isNaN(expiresAt.getTime())) return { ok: false, reason: "ACCESS_END_INVALID" };
  if (expiresAt.getTime() <= paidAt.getTime()) return { ok: false, reason: "ACCESS_END_NOT_AFTER_PAYMENT" };
  return { ok: true, window: { startsAt: paidAt, expiresAt } };
}

/**
 * Aynı ürünün ikinci satın alması pencereyi daraltmaz: en erken başlangıç, en geç
 * bitiş. Mevcut üyelik süresizse (`expiresAt` NULL) süresiz kalır — ODK
 * provizyonundaki birleştirme kuralıyla aynı.
 */
export function mergeAccessWindow(
  existing: { startsAt: Date; expiresAt: Date | null } | null,
  next: ExamAccessWindow,
): { startsAt: Date; expiresAt: Date | null } {
  if (!existing) return next;
  return {
    startsAt: existing.startsAt < next.startsAt ? existing.startsAt : next.startsAt,
    expiresAt: existing.expiresAt === null ? null : new Date(Math.max(existing.expiresAt.getTime(), next.expiresAt.getTime())),
  };
}
