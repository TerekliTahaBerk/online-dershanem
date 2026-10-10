import type { ApiClient } from '@/lib/api/client';
import { fetchNotificationPreferences, registerPushDevice, unregisterPushDevice } from '@/lib/api/push';

import { currentRegistration, getPermission, pushSupport } from './native-push';

/**
 * Cihaz kaydını sunucuyla eşitler. Kayıt yalnız ÜÇ koşul birlikteyken yapılır:
 * (1) sunucuda kullanıcı push'u açmış (`pushEnabled`), (2) işletim sistemi izni
 * verilmiş, (3) ortam push'u destekliyor (gerçek cihaz, EAS proje kimliği).
 * Gereksiz tekrarı önlemek için aynı kullanıcı + token bu uygulama oturumunda
 * bir kez kaydedilir (yalnız bellekte; cihaz depolamasına yazılmaz).
 */
let lastRegistered: { userId: string; token: string } | null = null;

export type SyncResult = 'REGISTERED' | 'ALREADY' | 'PUSH_OFF' | 'NO_PERMISSION' | 'UNSUPPORTED';

export async function syncPushRegistration(api: ApiClient, userId: string, options: { force?: boolean } = {}): Promise<SyncResult> {
  if (!pushSupport().supported) return 'UNSUPPORTED';
  const permission = await getPermission();
  if (permission.status !== 'granted') return 'NO_PERMISSION';
  const preferences = await fetchNotificationPreferences(api);
  if (!preferences.pushEnabled) return 'PUSH_OFF';
  const registration = await currentRegistration(permission);
  if (!registration) return 'UNSUPPORTED';
  if (!options.force && lastRegistered?.userId === userId && lastRegistered.token === registration.token) return 'ALREADY';
  await registerPushDevice(api, registration);
  lastRegistered = { userId, token: registration.token };
  return 'REGISTERED';
}

/** Bu oturumun cihaz kaydını sunucudan siler (çıkış / push kapatma). En iyi çaba; idempotent. */
export async function unregisterCurrentDevice(api: ApiClient): Promise<void> {
  const token = lastRegistered?.token ?? null;
  lastRegistered = null;
  await unregisterPushDevice(api, token);
}

export function forgetPushRegistration(): void {
  lastRegistered = null;
}
