/**
 * In-process presence registry — backed by SSE connection lifecycle.
 *
 * Bir kullanıcının açık SSE bağlantısı varsa "online" sayılır.
 * Her keepalive (25s) `touch` çağrısı yapılır.
 * `STALE_MS` (60s) içinde touch görmemiş kayıtlar offline kabul edilir.
 *
 * NOTE: Single-process only. Multi-instance için Redis presence + TTL'a geçilir.
 * Stored on `globalThis` to survive HMR.
 */

const STALE_MS = 60_000; // 60 saniye

type PresenceMap = Map<string, number>;

declare global {
  // eslint-disable-next-line no-var
  var __OD_PRESENCE__: PresenceMap | undefined;
}

const presence: PresenceMap = globalThis.__OD_PRESENCE__ ?? new Map();
globalThis.__OD_PRESENCE__ = presence;

/** Kullanıcıyı şu an aktif olarak işaretle */
export function touch(userId: string): void {
  presence.set(userId, Date.now());
}

/** Kullanıcıyı manuel olarak presence kaydından sil (logout vb) */
export function clear(userId: string): void {
  presence.delete(userId);
}

/** Kullanıcı son STALE_MS içinde touch gördü mü? */
export function isOnline(userId: string): boolean {
  const t = presence.get(userId);
  if (!t) return false;
  if (Date.now() - t > STALE_MS) {
    presence.delete(userId);
    return false;
  }
  return true;
}

/** Çoklu kullanıcı için online haritası döner */
export function getOnlineMap(userIds: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const now = Date.now();
  for (const id of userIds) {
    const t = presence.get(id);
    if (!t) {
      out[id] = false;
    } else if (now - t > STALE_MS) {
      presence.delete(id);
      out[id] = false;
    } else {
      out[id] = true;
    }
  }
  return out;
}

/** Şu an online olan tüm kullanıcı id'leri */
export function getOnlineIds(): string[] {
  const now = Date.now();
  const out: string[] = [];
  for (const [id, t] of presence) {
    if (now - t <= STALE_MS) out.push(id);
    else presence.delete(id);
  }
  return out;
}

/** Toplam online kullanıcı sayısı */
export function onlineCount(): number {
  return getOnlineIds().length;
}

/** Kullanıcının son aktif zamanı (ms epoch) — yoksa null */
export function lastSeenAt(userId: string): number | null {
  return presence.get(userId) ?? null;
}
