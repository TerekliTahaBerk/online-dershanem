import {
  parseAccountSettings,
  parseAccountSettingsWrite,
  parseDeletionRequestStatus,
  parseDeletionRequestWrite,
  parsePreferenceWrite,
  type AccessibilityPreferences,
  type AccountSettingsCommand,
  type NetworkPreferences,
} from '@contracts/account-settings';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * P5.2 hesap ayarları. Yazmalar web Server Action'larıyla AYNI servisten
 * geçer; her çağrı işlem anahtarı, formu yeniden yazan komut ayrıca okunan
 * `revision` taşır. Tercihler mevcut PATCH uçlarıyla `expectedVersion` yazar.
 */
function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

export const fetchAccountSettings = async (api: ApiClient, signal?: AbortSignal) =>
  validated(parseAccountSettings(await api.request<unknown>('/api/panel/me/settings', { signal })));

export const runAccountSettings = async (api: ApiClient, command: AccountSettingsCommand, idempotencyKey: string, expectedRevision?: string) =>
  validated(parseAccountSettingsWrite(await api.request<unknown>('/api/panel/me/settings', { method: 'POST', body: { command, idempotencyKey, ...(expectedRevision ? { expectedRevision } : {}) } })));

export const saveAccessibilityPreferences = async (api: ApiClient, preference: AccessibilityPreferences) => {
  const { version, ...body } = preference;
  return validated(parsePreferenceWrite(await api.request<unknown>('/api/panel/accessibility/preferences', { method: 'PATCH', body: { expectedVersion: version, ...body } })));
};

export const saveNetworkPreferences = async (api: ApiClient, preference: NetworkPreferences) => {
  const { version, ...body } = preference;
  return validated(parsePreferenceWrite(await api.request<unknown>('/api/panel/network/preferences', { method: 'PATCH', body: { expectedVersion: version, ...body } })));
};

export const fetchDeletionRequest = async (api: ApiClient, signal?: AbortSignal) =>
  validated(parseDeletionRequestStatus(await api.request<unknown>('/api/panel/me/deletion-request', { signal })));

/** Parola her denemede gönderilir; istemcide saklanmaz. */
export const requestAccountDeletion = async (api: ApiClient, password: string, idempotencyKey: string) =>
  validated(parseDeletionRequestWrite(await api.request<unknown>('/api/panel/me/deletion-request', { method: 'POST', body: { password, idempotencyKey } })));
