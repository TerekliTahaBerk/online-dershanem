import type { MobileProductCode } from '@contracts/bootstrap';
import { onlineManager, useQuery, useQueryClient, type QueryKey, type UseQueryResult } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState, useSyncExternalStore, type ReactNode } from 'react';

import { Banner, EmptyState, ErrorState, Skeleton } from '@/design/primitives';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { queryKeys } from '@/lib/query/keys';
import { hasNavItem } from '@/navigation/od-targets';

/**
 * Çalışma alanı ekranlarının (OD, Yön) ortak veri katmanı — ürün bağımsız.
 *
 * - Anahtarlar `['user', userId, 'workspace', ürün, kaynak, parametreler]`:
 *   başka hesabın / çalışma alanının önbelleği asla eşleşmez; çalışma alanı
 *   değişince `selectWorkspace` bu kapsamı siler, çıkışta önbellek temizlenir.
 * - Önbellek yalnız bellektedir (cihaz depolamasına yazılmaz).
 * - Bir ürünün verisi yalnız o ürünün çalışma alanı etkinken istenir.
 */
export type WorkspaceProduct = Extract<MobileProductCode, 'OD' | 'OK' | 'ODK'>;

export function useWorkspaceKey(product: WorkspaceProduct, resource: string, params?: Record<string, string | number | null>): QueryKey {
  const bootstrap = useReadyBootstrap();
  return queryKeys.workspaceResource(bootstrap.user.id, product, resource, params);
}

export function useWorkspaceQuery<T>(
  product: WorkspaceProduct,
  resource: string,
  fetcher: (api: ApiClient, signal: AbortSignal) => Promise<T>,
  options: { params?: Record<string, string | number | null>; enabled?: boolean; gcTime?: number } = {},
) {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const active = bootstrap.workspace?.activeProduct === product;
  return useQuery({
    queryKey: queryKeys.workspaceResource(bootstrap.user.id, product, resource, options.params),
    queryFn: ({ signal }) => fetcher(api, signal),
    enabled: active && (options.enabled ?? true),
    // Hassas kaynaklar (ör. sınav sonucu) kullanılmadığında bellekte daha kısa tutulabilir.
    ...(options.gcTime !== undefined ? { gcTime: options.gcTime } : {}),
  });
}

/**
 * Başarılı bir yazmadan SONRA (sunucu onayı geldikten sonra) bu kullanıcının
 * verilen ürün kapsamındaki tüm görünümleri yenilenir. Başka kullanıcının
 * anahtarına dokunulmaz.
 */
export function useInvalidateWorkspace(product: WorkspaceProduct) {
  const client = useQueryClient();
  const bootstrap = useReadyBootstrap();
  return () => client.invalidateQueries({ queryKey: queryKeys.workspace(bootstrap.user.id, product) });
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/** Çekip yenileme: arka plan yenilemesinde döner simge gösterilmez, yalnız kullanıcı çekince. */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  return {
    refreshing,
    onRefresh: () => {
      setRefreshing(true);
      void refetch().finally(() => setRefreshing(false));
    },
  };
}

/** Kullanıcının bu çalışma alanındaki yetkili menüsünden hedef açma. */
export function useWorkspaceNavigation() {
  const router = useRouter();
  const bootstrap = useReadyBootstrap();
  const navigation = bootstrap.workspace?.navigation ?? null;
  return {
    navigation,
    has: (navId: string) => hasNavItem(navigation, navId),
    push: (href: string | null) => {
      if (!href) return false;
      router.push(href as Href);
      return true;
    },
  };
}

/** Panel bayrağı (bootstrap `workspace.flags`, sunucu `PanelFeatureFlags` adları). */
export function useWorkspaceFlag(flag: string): boolean {
  const bootstrap = useReadyBootstrap();
  return bootstrap.workspace?.flags[flag] === true;
}

type QueryViewProps<T> = {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  rows?: number;
  /** Özellik bayrağı sunucuda kapalıysa gösterilecek metin. */
  disabledTitle?: string;
};

/**
 * Sorgu durumu → ekran durumu. Kapsanan durumlar: yükleniyor (iskelet),
 * çevrimdışı ve önbellek yok, çevrimdışı ama önbellekte veri var (bayat
 * uyarısı), yenileme başarısız (son veri + uyarı), özellik kapalı,
 * erişim yok, bilinmeyen sunucu / sözleşme hatası (tekrar dene).
 * Oturum süresi dolması (401) merkezi olarak oturumu kapatır.
 */
export function QueryView<T>({ query, children, rows = 5, disabledTitle = 'Bu bölüm şimdilik kapalı.' }: QueryViewProps<T>) {
  const online = useOnline();
  const error = query.error;
  if (query.data !== undefined) {
    return (
      <>
        {!online ? (
          <Banner tone="warning" title="İnternet bağlantın yok gibi">
            Gördüklerin son bağlantındaki hâli. Bağlantın gelince kendiliğinden yenilenecek.
          </Banner>
        ) : error ? (
          <Banner tone="warning" title="Son bilgileri getiremedik">
            {error instanceof ApiError ? error.message : 'Şimdilik en son kaydedilen hâlini görüyorsun.'}
          </Banner>
        ) : null}
        {children(query.data)}
      </>
    );
  }
  if (error instanceof ApiError && error.kind === 'feature_disabled') return <EmptyState title={disabledTitle} />;
  if (error instanceof ApiError && (error.kind === 'product_access' || error.kind === 'forbidden')) {
    return <EmptyState title="Bu bölüm sana açık değil" body={error.message} />;
  }
  if (error) return <ErrorState error={error} onRetry={() => void query.refetch()} />;
  if (!online && query.fetchStatus === 'paused') {
    return <EmptyState title="İnternet bağlantın yok gibi" body="Bağlantın gelir gelmez burayı kendiliğinden yükleyeceğiz." />;
  }
  return <Skeleton rows={rows} />;
}

/**
 * Detay rotalarının (`/od/...`, `/yon/...`) kapısı. Derin bağlantı /
 * bildirimle gelinse bile ekran yalnız ilgili çalışma alanında ve öğe
 * kullanıcının YETKİLİ menüsündeyse açılır; aksi halde güvenli boş durum.
 * Sunucu her istekte ayrıca kimlik + ürün + kaynak sahipliğini doğrular.
 */
export function WorkspaceRouteGate({ product, navId, children }: { product: WorkspaceProduct; navId: string; children: ReactNode }) {
  const bootstrap = useReadyBootstrap();
  const allowed = bootstrap.workspace?.activeProduct === product && hasNavItem(bootstrap.workspace.navigation, navId);
  if (!allowed) {
    return <EmptyState title="Bu bölümü burada bulamadık" body="Bağlantı başka bir alana ait olabilir ya da erişimin değişmiş olabilir." />;
  }
  return <>{children}</>;
}
