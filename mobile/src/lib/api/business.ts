import { parseBusinessSection, type MobileBusinessSection } from '@contracts/business';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * İşletme (P2.7) okumaları — web `isletme/[section]` ile AYNI yükleyici ve
 * sorgu parametreleri. Yetki her istekte sunucuda (`BusinessRoleAssignment`);
 * yetkisiz bölüm 404 döner.
 */
export type BusinessQuery = Record<string, string | undefined>;

export async function fetchBusinessSection(api: ApiClient, slug: string, query: BusinessQuery, signal?: AbortSignal): Promise<MobileBusinessSection> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '' && value !== 'ALL') params.set(key, value);
  const suffix = params.toString();
  const result = parseBusinessSection(await api.request<unknown>(`/api/panel/business/sections/${encodeURIComponent(slug)}${suffix ? `?${suffix}` : ''}`, { signal }));
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}
