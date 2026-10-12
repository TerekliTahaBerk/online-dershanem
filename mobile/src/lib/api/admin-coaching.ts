import { parseAdminCoaching, parseAdminCoachingSession } from '@contracts/admin-coaching';
import type { ApiClient } from './client';
import { ApiError } from './errors';
function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}
export async function fetchAdminCoaching(api: ApiClient, signal?: AbortSignal) {
  return validated(parseAdminCoaching(await api.request('/api/panel/admin/coaching', { signal })));
}
export async function fetchAdminCoachingSession(api: ApiClient, id: string, signal?: AbortSignal) {
  return validated(parseAdminCoachingSession(await api.request(`/api/panel/admin/coaching/sessions/${encodeURIComponent(id)}`, { signal })));
}
