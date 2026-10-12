import { parseAdminOrder, parseAdminOrders } from '@contracts/admin-orders';
import type { ApiClient } from './client';
import { ApiError } from './errors';
function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}
export async function fetchAdminOrders(api: ApiClient, query: { filtre: string; sayfa: number; q: string }, signal?: AbortSignal) {
  const params = new URLSearchParams({ filtre: query.filtre, sayfa: String(query.sayfa), q: query.q });
  return validated(parseAdminOrders(await api.request(`/api/panel/admin/orders?${params}`, { signal })));
}
export async function fetchAdminOrder(api: ApiClient, id: string, signal?: AbortSignal) {
  return validated(parseAdminOrder(await api.request(`/api/panel/admin/orders/${encodeURIComponent(id)}`, { signal })));
}
