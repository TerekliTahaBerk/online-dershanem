import { parseGlobalSearch, parseOperationsCenter, parseStepUpResult, type MobileGlobalSearch, type MobileOperationsCenter, type MobileOpsGroupFilter, type MobileStepUpResult } from '@contracts/admin';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * Faz 1 yönetim uçları. Okumalar `/api/panel/admin/*` ve mevcut
 * `/api/panel/admin-search`; yetki her istekte sunucuda (gerçek ADMIN oturumu,
 * hassas yazmalarda taze step-up). Yanıtlar güven sınırında doğrulanır.
 */

function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

export async function fetchOperationsCenter(api: ApiClient, group: MobileOpsGroupFilter, signal?: AbortSignal): Promise<MobileOperationsCenter> {
  const query = group === 'tumu' ? '' : `?grup=${encodeURIComponent(group)}`;
  return validated(parseOperationsCenter(await api.request<unknown>(`/api/panel/admin/operations-center${query}`, { signal })));
}

export async function searchGlobal(api: ApiClient, query: string, signal?: AbortSignal): Promise<MobileGlobalSearch> {
  return validated(parseGlobalSearch(await api.request<unknown>(`/api/panel/admin-search?q=${encodeURIComponent(query.trim().slice(0, 80))}`, { signal })));
}

/**
 * Hassas işlem öncesi ikinci faktör (yalnız doğrulayıcı kodu; sunucu
 * kurtarma kodunu step-up için kabul etmez). Başarı yalnız sunucu
 * `verified: true` dediğinde sayılır.
 */
export async function verifyStepUp(api: ApiClient, code: string): Promise<MobileStepUpResult> {
  return validated(parseStepUpResult(await api.request<unknown>('/api/auth/mfa/code/verify', { method: 'POST', body: { code, method: 'TOTP', purpose: 'STEP_UP' } })));
}
