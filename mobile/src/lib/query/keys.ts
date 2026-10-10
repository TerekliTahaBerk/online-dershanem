import type { MobileProductCode } from '@contracts/bootstrap';

/**
 * Sorgu anahtarları — hepsi KULLANICI kimliğiyle başlar; ürün verisi ayrıca
 * çalışma alanıyla kapsamlanır. Böylece:
 *  - hesap değişince bir kullanıcının önbelleği diğerine asla eşleşmez
 *    (çıkışta ayrıca `queryClient.clear()` çalışır),
 *  - çalışma alanı değişince yalnız o kapsamın sorguları geçersizlenir.
 *
 * Bootstrap anahtarı token parmak izine bağlıdır: yeni giriş, eski
 * kullanıcının bootstrap'ını göremez (token kendisi anahtara GİRMEZ).
 */
export const queryKeys = {
  bootstrap: (sessionKey: string) => ['bootstrap', sessionKey] as const,
  user: (userId: string) => ['user', userId] as const,
  notifications: (userId: string, filter: 'all' | 'unread') => ['user', userId, 'notifications', filter] as const,
  sessions: (userId: string) => ['user', userId, 'sessions'] as const,
  workspace: (userId: string, workspace: MobileProductCode | null) => ['user', userId, 'workspace', workspace ?? 'none'] as const,
  workspaceResource: (userId: string, workspace: MobileProductCode | null, resource: string, params?: Record<string, string | number | null>) =>
    [...queryKeys.workspace(userId, workspace), resource, params ?? {}] as const,
  /**
   * M6 veli: ÇOCUK kapsamlı. `['user', veliId, 'parent', 'PARENT', studentId, kaynak]`
   * — çocuk değişince eski çocuğun anahtarı asla eşleşmez; çalışma alanı
   * değişimi bu kapsamı silmez (veri çalışma alanına değil çocuğa aittir).
   */
  parent: (userId: string) => ['user', userId, 'parent', 'PARENT'] as const,
  parentChildren: (userId: string) => [...queryKeys.parent(userId), 'children'] as const,
  parentAccount: (userId: string) => [...queryKeys.parent(userId), 'account'] as const,
  parentChild: (userId: string, studentId: string) => [...queryKeys.parent(userId), 'child', studentId] as const,
  /**
   * M7 personel: `['user', personelId, 'workspace', ürün, 'staff', 'TEACHER', kaynak, parametreler]`.
   * Çalışma alanı önekiyle başlar: çalışma alanı değişince `selectWorkspace`
   * bu kapsamı da siler; çıkışta önbellek temizlenir.
   */
  staff: (userId: string, workspace: MobileProductCode) => [...queryKeys.workspace(userId, workspace), 'staff', 'TEACHER'] as const,
  staffResource: (userId: string, workspace: MobileProductCode, resource: string, params?: Record<string, string | number | null>) =>
    [...queryKeys.staff(userId, workspace), resource, params ?? {}] as const,
  parentResource: (userId: string, studentId: string, resource: string) => [...queryKeys.parentChild(userId, studentId), resource] as const,
};

/** Token'dan geri döndürülemez kısa bir anahtar (FNV-1a). Token önbellek anahtarına girmez. */
export function sessionKeyFor(token: string | null): string {
  if (!token) return 'anonymous';
  let hash = 0x811c9dc5;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}
