/**
 * Log satırının kendi alanları (ts/level/event/runtime/vercelEnv) bağlamla
 * ezilemez: önceden `{ event: alert.event }` bağlamı olay adını değiştiriyor ve
 * "alarm gönderilemedi" satırı asıl alarm gibi görünüyordu. Çakışan anahtar
 * `context_` önekiyle korunur.
 */
const RESERVED_KEYS = new Set(["ts", "level", "event", "runtime", "vercelEnv"]);

export function protectReservedLogKeys(context: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(context).map(([key, value]) => [RESERVED_KEYS.has(key) ? `context_${key}` : key, value]));
}
