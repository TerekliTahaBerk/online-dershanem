import {
  parseDeviceRegisterResult,
  parseDeviceUnregisterResult,
  parseNotificationPreferences,
  parseSingleNotification,
  type MobileNotificationPreferences,
} from '@contracts/push';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * M5 push uçları. Kullanıcı / oturum kimliği hiçbir istekte gönderilmez
 * (sunucu oturumdan çözer). Push token'ı yalnız kayıt / silme gövdesinde,
 * HTTPS üzerinden gider; loglanmaz, URL'e konmaz.
 */
function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

export async function fetchNotificationPreferences(api: ApiClient, signal?: AbortSignal) {
  return validated(parseNotificationPreferences(await api.request<unknown>('/api/panel/notifications/preferences', { signal }))).preferences;
}

/** Kısmi güncelleme: yalnız verilen alanlar; sunucu mevcut kayıtla birleştirir (web alanlarının üzerine yazılmaz). */
export async function patchNotificationPreferences(api: ApiClient, patch: Partial<MobileNotificationPreferences>) {
  return api.request<unknown>('/api/panel/notifications/preferences', { method: 'PATCH', body: patch });
}

export async function fetchSingleNotification(api: ApiClient, id: string, signal?: AbortSignal) {
  return validated(parseSingleNotification(await api.request<unknown>(`/api/panel/notifications/${encodeURIComponent(id)}`, { signal })));
}

export type DeviceRegistration = {
  token: string;
  platform: 'IOS' | 'ANDROID';
  appVersion: string;
  projectId: string | null;
  appEnvironment: 'development' | 'preview' | 'production' | null;
  permissionStatus: 'granted' | 'provisional' | 'ephemeral' | null;
};

export async function registerPushDevice(api: ApiClient, input: DeviceRegistration) {
  return validated(parseDeviceRegisterResult(await api.request<unknown>('/api/panel/push-devices', { method: 'POST', body: input })));
}

export async function unregisterPushDevice(api: ApiClient, token: string | null) {
  return validated(parseDeviceUnregisterResult(await api.request<unknown>('/api/panel/push-devices', { method: 'DELETE', body: token ? { token } : {} })));
}
