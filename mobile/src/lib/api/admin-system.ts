import { parseAdminAnalytics, parseAdminAudit, parseAdminFeatures, parseAdminQuality } from '@contracts/admin-system';
import type { ApiClient } from './client';
import { ApiError } from './errors';
export type AnalyticsFilters = { from: string; to: string; examType: string; product: string; classLevel: string; groupId: string; teacherId: string };
function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}
export async function fetchAdminAnalytics(api: ApiClient, filters: AnalyticsFilters, signal?: AbortSignal) {
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
  return validated(parseAdminAnalytics(await api.request(`/api/panel/admin/analytics?${params}`, { signal })));
}
export async function fetchAdminAudit(api: ApiClient, tur: string, signal?: AbortSignal) { return validated(parseAdminAudit(await api.request(`/api/panel/admin/audit?${new URLSearchParams({ tur })}`, { signal }))); }
export async function fetchAdminFeatures(api: ApiClient, signal?: AbortSignal) { return validated(parseAdminFeatures(await api.request('/api/panel/admin/features', { signal }))); }
export async function fetchAdminQuality(api: ApiClient, signal?: AbortSignal) { return validated(parseAdminQuality(await api.request('/api/panel/admin/quality', { signal }))); }
