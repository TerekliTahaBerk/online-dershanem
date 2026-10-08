import { useCallback } from 'react';

import type { HttpMethod } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session-provider';

/**
 * M2–M4'te yeniden yazılacak, M1'de korunarak taşınan eski ekranlar için
 * köprü: eski `apiFetch(path, { token })` imzası yerine yeni API istemcisi
 * (Bearer, zaman aşımı, sözleşme hataları, merkezi 401) kullanılır. Yeni
 * ekranlar bu kancayı DEĞİL, TanStack Query + `lib/api/endpoints` kullanır.
 */
export function useLegacySession() {
  const { api, token, signOut } = useSession();
  const apiFetch = useCallback(
    <T,>(path: string, options: { method?: HttpMethod; body?: unknown } = {}) => api.request<T>(path, { method: options.method, body: options.body }),
    [api],
  );
  return { token, signOut, apiFetch, authHeaders: api.authHeaders, baseUrl: api.baseUrl };
}
