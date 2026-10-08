import { ApiError, type ApiErrorKind } from '@/lib/api/errors';

/**
 * Hangi hatalar bootstrap'ın yeniden çekilmesini gerektirir? SAF karar.
 *
 * - Kapı kodları (parola / MFA): sunucu oturumun kapıya döndüğünü söylüyor.
 * - Ürün erişimi / pilot: kullanıcının ürün durumu değişmiş olabilir.
 * Düz `404` (kaynak yok, flag kapalı) yenileme TETİKLEMEZ — her 404'te
 * bootstrap çekmek döngüye ve gereksiz yüke yol açar.
 *
 * Aynı nedenle art arda yenilemeyi önlemek için en az `cooldownMs` beklenir.
 */
const REFRESH_KINDS: ReadonlySet<ApiErrorKind> = new Set(['password_change_required', 'mfa_required', 'product_access', 'pilot_unavailable']);

export function createGateRefreshPolicy(cooldownMs = 15_000, now: () => number = Date.now) {
  let lastRefreshAt = Number.NEGATIVE_INFINITY;
  return {
    shouldRefresh(error: unknown): boolean {
      if (!(error instanceof ApiError) || !REFRESH_KINDS.has(error.kind)) return false;
      const current = now();
      if (current - lastRefreshAt < cooldownMs) return false;
      lastRefreshAt = current;
      return true;
    },
    reset() {
      lastRefreshAt = Number.NEGATIVE_INFINITY;
    },
  };
}
