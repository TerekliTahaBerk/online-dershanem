import { parseMobileLoginResponse, parseNotificationPage, parseSessionList, type MobileNotificationPage, type MobileSessionList } from '@contracts/api';
import { parseMobileBootstrap, type MobileBootstrap, type MobileProductCode } from '@contracts/bootstrap';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * M1'in kullandığı uçlar. Güven sınırında (sunucu yanıtı → uygulama durumu)
 * paylaşılan sözleşme doğrulayıcıları çalışır; uymayan yanıt
 * `invalid_response` olur ve UI'a "başarılı" diye geçmez.
 */

function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

export async function login(api: ApiClient, email: string, password: string) {
  const body = await api.request<unknown>('/api/auth/login', { method: 'POST', body: { email, password }, authenticated: false });
  return validated(parseMobileLoginResponse(body));
}

/** Sunucu oturumunu iptal eder. Çağıran, yerel kimliği sonuçtan bağımsız siler. */
export async function logout(api: ApiClient): Promise<void> {
  await api.request('/api/auth/logout', { method: 'POST', body: {} });
}

export async function requestPasswordReset(api: ApiClient, email: string): Promise<string> {
  const body = await api.request<{ message?: string }>('/api/auth/forgot-password', { method: 'POST', body: { email }, authenticated: false });
  return body?.message ?? 'Bu adrese ait bir hesap varsa sıfırlama bağlantısını gönderdik. Gelen kutunu (ve gereksiz klasörünü) kontrol etmeyi unutma.';
}

export async function fetchBootstrap(api: ApiClient, signal?: AbortSignal): Promise<MobileBootstrap> {
  return validated(parseMobileBootstrap(await api.request<unknown>('/api/panel/me', { signal })));
}

export async function changePassword(api: ApiClient, currentPassword: string, newPassword: string): Promise<void> {
  await api.request('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
}

export async function verifyMfaCode(api: ApiClient, code: string, method: 'TOTP' | 'RECOVERY'): Promise<void> {
  const body = await api.request<{ verified?: unknown }>('/api/auth/mfa/code/verify', {
    method: 'POST',
    body: { code, method, purpose: 'AUTHENTICATE' },
  });
  // Sunucu açıkça doğrulamadıysa başarı sayılmaz.
  if (body?.verified !== true) throw new ApiError({ kind: 'invalid_response' });
}

export async function selectWorkspace(api: ApiClient, product: MobileProductCode): Promise<void> {
  await api.request('/api/panel/active-product', { method: 'POST', body: { product } });
}

export async function fetchNotifications(api: ApiClient, page: number, filter: 'all' | 'unread', signal?: AbortSignal): Promise<MobileNotificationPage> {
  const query = new URLSearchParams({ page: String(page), status: filter });
  return validated(parseNotificationPage(await api.request<unknown>(`/api/panel/notifications?${query.toString()}`, { signal })));
}

/** `id` verilmezse kullanıcının tüm okunmamış bildirimleri okundu sayılır. */
export async function markNotificationsRead(api: ApiClient, id?: string): Promise<number> {
  const body = await api.request<{ ok?: boolean; count?: number }>('/api/panel/notifications/read', { method: 'POST', body: id ? { id } : {} });
  if (body?.ok !== true) throw new ApiError({ kind: 'invalid_response' });
  return typeof body.count === 'number' ? body.count : 0;
}

export async function fetchSessions(api: ApiClient, signal?: AbortSignal): Promise<MobileSessionList> {
  return validated(parseSessionList(await api.request<unknown>('/api/auth/sessions', { signal })));
}

export async function revokeSessionById(api: ApiClient, id: string): Promise<void> {
  await api.request(`/api/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function revokeOtherSessions(api: ApiClient): Promise<void> {
  await api.request('/api/auth/sessions/others', { method: 'POST', body: {} });
}
