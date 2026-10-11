import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { EmptyState } from '@/design/primitives';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { newUuid } from '@/lib/ids';
import { queryKeys } from '@/lib/query/keys';

import { useStepUp } from '../auth/step-up';
import { runWithStepUp, StepUpCancelledError } from './step-up-retry';

export { QueryView, usePullToRefresh } from '../shared/workspace-data';
export { StepUpCancelledError };

/**
 * YÖNETİM (Faz 1) ortak katmanı.
 *
 *  - Rol / menü YETKİ DEĞİLDİR: her istek sunucuda gerçek ADMIN oturumu ve
 *    hassas yazmalarda taze step-up ile doğrulanır. Burada yalnız görünürlük.
 *  - Anahtarlar `['user', id, 'admin', kaynak, parametreler]`.
 *  - Yazmalar yalnız çevrimiçi; başarı yalnız sunucu onayıyla gösterilir.
 */
export function useAdminQuery<T>(resource: string, fetcher: (api: ApiClient, signal: AbortSignal) => Promise<T>, options: { params?: Record<string, string | number | null>; enabled?: boolean } = {}) {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  return useQuery({
    queryKey: queryKeys.adminResource(bootstrap.user.id, resource, options.params),
    queryFn: ({ signal }) => fetcher(api, signal),
    enabled: bootstrap.user.role === 'ADMIN' && (options.enabled ?? true),
  });
}

/**
 * Yönetim yazması. Her `mutateAsync` çağrısı YENİ bir idempotency anahtarı
 * üretir; 428 → native step-up → aynı anahtarla tek tekrar
 * (`runWithStepUp`). 409 (sürüm çakışması) → yönetim görünümleri yenilenir ve
 * hata ekrana iletilir (sessiz üzerine yazma yok). Başarıda yönetim
 * önbelleği sunucu onayından SONRA geçersizlenir.
 */
export function useAdminMutation<V, R>(mutate: (api: ApiClient, variables: V, context: { idempotencyKey: string }) => Promise<R>) {
  const { api } = useSession();
  const { requestStepUp } = useStepUp();
  const client = useQueryClient();
  const bootstrap = useReadyBootstrap();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.admin(bootstrap.user.id) });
  return useMutation({
    mutationFn: (variables: V) => {
      const idempotencyKey = newUuid();
      return runWithStepUp(() => mutate(api, variables, { idempotencyKey }), requestStepUp);
    },
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.kind === 'conflict') void invalidate();
    },
  });
}

/** Yönetim rotalarının kapısı: yalnız ADMIN. Derin bağlantıyla gelinse de güvenli boş durum; sunucu ayrıca doğrular. */
export function AdminRouteGate({ children }: { children: ReactNode }) {
  const bootstrap = useReadyBootstrap();
  if (bootstrap.user.role !== 'ADMIN') return <EmptyState title="Bu bölüm hesabında yok" body="Bu ekran yalnız yönetim hesaplarında açılır." />;
  return <>{children}</>;
}

/**
 * Yönetim yazma hatasının kullanıcı metni. Sunucunun açıklaması (ör. "devir
 * tamamlanmalı") olduğu gibi gösterilir; 409'da görünümlerin yenilendiği
 * ayrıca söylenir. Vazgeçilen step-up açıkça belirtilir.
 */
export function adminErrorText(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof StepUpCancelledError) return error.message;
  if (error instanceof ApiError) return error.kind === 'conflict' ? `${error.message} Görünüm yenilendi; kontrol edip tekrar dene.` : error.message;
  return 'İşlem kaydedilemedi.';
}
