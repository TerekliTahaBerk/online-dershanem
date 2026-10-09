import type { QueryKey } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import type { ApiClient } from '@/lib/api/client';

import { useInvalidateWorkspace, useWorkspaceFlag, useWorkspaceKey, useWorkspaceNavigation, useWorkspaceQuery, WorkspaceRouteGate } from '../shared/workspace-data';

export { QueryView, useOnline, usePullToRefresh } from '../shared/workspace-data';

/**
 * OD ekranlarının ortak veri katmanı — ürün bağımsız
 * `features/shared/workspace-data.tsx`'in OD kapsamlı karşılıkları.
 * Anahtarlar `['user', userId, 'workspace', 'OD', kaynak, parametreler]`;
 * OD verisi yalnız OD çalışma alanında istenir (Yön / Deneme Ligi'nde asla).
 */
export function useOdKey(resource: string, params?: Record<string, string | number | null>): QueryKey {
  return useWorkspaceKey('OD', resource, params);
}

export function useOdQuery<T>(resource: string, fetcher: (api: ApiClient, signal: AbortSignal) => Promise<T>, options: { params?: Record<string, string | number | null>; enabled?: boolean } = {}) {
  return useWorkspaceQuery('OD', resource, fetcher, options);
}

/** Başarılı yazmadan SONRA bu kullanıcının OD kapsamındaki tüm görünümleri yenilenir. */
export function useInvalidateOd() {
  return useInvalidateWorkspace('OD');
}

export const useOdNavigation = useWorkspaceNavigation;
export const useOdFlag = useWorkspaceFlag;

/** `/od/...` detay rotalarının kapısı (bkz. `WorkspaceRouteGate`). */
export function OdRouteGate({ navId, children }: { navId: string; children: ReactNode }) {
  return (
    <WorkspaceRouteGate product="OD" navId={navId}>
      {children}
    </WorkspaceRouteGate>
  );
}
