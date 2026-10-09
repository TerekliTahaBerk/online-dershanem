import type { QueryKey } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import type { ApiClient } from '@/lib/api/client';

import { useInvalidateWorkspace, useWorkspaceKey, useWorkspaceQuery, WorkspaceRouteGate } from '../shared/workspace-data';

export { QueryView, useOnline, usePullToRefresh, useWorkspaceFlag as useYonFlag, useWorkspaceNavigation as useYonNavigation } from '../shared/workspace-data';

/**
 * Yön (OK) ekranlarının veri katmanı. Anahtarlar
 * `['user', userId, 'workspace', 'OK', kaynak, parametreler]`; Yön verisi yalnız
 * Yön çalışma alanında istenir (OD / Deneme Ligi'nde asla). Önbellek yalnız
 * bellektedir.
 */
export function useYonKey(resource: string, params?: Record<string, string | number | null>): QueryKey {
  return useWorkspaceKey('OK', resource, params);
}

export function useYonQuery<T>(resource: string, fetcher: (api: ApiClient, signal: AbortSignal) => Promise<T>, options: { params?: Record<string, string | number | null>; enabled?: boolean } = {}) {
  return useWorkspaceQuery('OK', resource, fetcher, options);
}

/**
 * Sunucu onayından SONRA Yön kapsamındaki tüm görünümler (Bugün, Planım,
 * Koçum, Hedefler) yenilenir. `alsoOd`: görev bir OD ödevine bağlıysa sunucu
 * ödev ilerlemesini de aynı işlemde günceller; OD görünümleri de bayat
 * işaretlenir (istemci ayrıca OD'ye yazmaz).
 */
export function useInvalidateYon() {
  const invalidateOk = useInvalidateWorkspace('OK');
  const invalidateOd = useInvalidateWorkspace('OD');
  return async (options: { alsoOd?: boolean } = {}) => {
    await Promise.all([invalidateOk(), options.alsoOd ? invalidateOd() : Promise.resolve()]);
  };
}

/** `/yon/...` detay rotalarının kapısı: yalnız Yön çalışma alanında ve yetkili menü öğesi varken. */
export function YonRouteGate({ navId, children }: { navId: string; children: ReactNode }) {
  return (
    <WorkspaceRouteGate product="OK" navId={navId}>
      {children}
    </WorkspaceRouteGate>
  );
}
