/**
 * M5 push teslim yapılandırması — GÜVENLİ VARSAYILAN.
 *
 * `PUSH_DELIVERY_MODE`:
 *  - `DISABLED` (varsayılan): dağıtıcı hiçbir şey yapmaz (yalnız kalp atışı).
 *  - `DRY_RUN`: aday seçimi, uygunluk ve yük üretilir; Expo'ya İSTEK GİTMEZ,
 *    teslimler `CANCELED / DRY_RUN` ile kapanır (metrik doğrulaması için).
 *  - `ENABLED`: gerçek gönderim. Üretimde yalnız rollout onayıyla açılır.
 * Bilinmeyen değer DISABLED sayılır (kapalı tarafta başarısızlık).
 */
export type PushDeliveryMode = "DISABLED" | "DRY_RUN" | "ENABLED";

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name]);
  return Number.isInteger(raw) && raw >= min && raw <= max ? raw : fallback;
}

export function pushDeliveryMode(): PushDeliveryMode {
  const value = (process.env.PUSH_DELIVERY_MODE ?? "").trim().toUpperCase();
  return value === "ENABLED" || value === "DRY_RUN" ? value : "DISABLED";
}

export function pushLimits() {
  return {
    /** Tek koşuda en fazla işlenecek teslim (kiralanan). */
    maxPerRun: intEnv("PUSH_MAX_PER_RUN", 300, 1, 2000),
    /** Expo tek istekte en fazla 100 mesaj kabul eder. */
    batchSize: 100,
    /** Tek koşuda en fazla açılacak (fan-out) bildirim. */
    maxFanOutPerRun: intEnv("PUSH_MAX_FANOUT_PER_RUN", 300, 1, 2000),
    /** Geçici hata yeniden deneme üst sınırı. */
    maxAttempts: intEnv("PUSH_MAX_ATTEMPTS", 5, 1, 10),
    /** Bu yaştan eski bildirim için push açılmaz (geçmiş birikimi). */
    backlogMaxAgeMs: intEnv("PUSH_BACKLOG_MAX_AGE_MINUTES", 24 * 60, 5, 7 * 24 * 60) * 60_000,
    /** Kira süresi: işçi çökerse satır bu süreden sonra yeniden alınabilir. */
    leaseMs: 2 * 60_000,
    /** Expo önerisi: makbuzlar ~15 dk sonra sorgulanır. */
    receiptDelayMs: 15 * 60_000,
    /** Bu süre sonunda makbuz hâlâ yoksa sorgulama bırakılır. */
    receiptGiveUpMs: 24 * 60 * 60_000,
    receiptBatch: 300,
    httpTimeoutMs: 10_000,
    /** Saklama: teslim kayıtları ve hareketsiz cihazlar (KVKK veri en aza indirme). */
    deliveryRetentionDays: intEnv("PUSH_DELIVERY_RETENTION_DAYS", 30, 1, 365),
    deviceIdleRevokeDays: intEnv("PUSH_DEVICE_IDLE_DAYS", 60, 7, 365),
  };
}
