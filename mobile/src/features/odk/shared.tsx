import type { ReactNode } from 'react';

import type { ApiClient } from '@/lib/api/client';

import { useInvalidateWorkspace, useWorkspaceQuery, WorkspaceRouteGate } from '../shared/workspace-data';

export { QueryView, useOnline, usePullToRefresh, useWorkspaceNavigation as useOdkNavigation } from '../shared/workspace-data';

/**
 * Deneme Ligi (ODK) veri katmanı. Anahtarlar
 * `['user', userId, 'workspace', 'ODK', kaynak, {examId, görünüm}]`; veri yalnız
 * Deneme Ligi çalışma alanında istenir. Önbellek yalnız bellektedir; çıkış ve
 * çalışma alanı değişiminde silinir. Uygulama ön plana dönünce bayat
 * sorgular yenilenir (M1 `focusManager`); ek yoklama (polling) yoktur.
 */
export function useOdkQuery<T>(resource: string, fetcher: (api: ApiClient, signal: AbortSignal) => Promise<T>, options: { params?: Record<string, string | number | null>; enabled?: boolean; gcTime?: number } = {}) {
  return useWorkspaceQuery('ODK', resource, fetcher, options);
}

/** Sonuç ve cevap anahtarı gibi hassas yanıtlar ekrandan çıkınca 1 dk sonra bellekten atılır. */
export const SENSITIVE_GC_MS = 60_000;

export function useInvalidateOdk() {
  return useInvalidateWorkspace('ODK');
}

/**
 * `/odk/...` detay rotalarının kapısı: yalnız Deneme Ligi çalışma alanında ve
 * "Denemeler" (`odk-exams`) yetkili menüdeyken. Asıl yetki (aktif sözleşme
 * hakkı, yayın) sunucuda her istekte yeniden doğrulanır.
 */
export function OdkRouteGate({ children }: { children: ReactNode }) {
  return (
    <WorkspaceRouteGate product="ODK" navId="odk-exams">
      {children}
    </WorkspaceRouteGate>
  );
}
