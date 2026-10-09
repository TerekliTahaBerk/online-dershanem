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
 * OD ekranlarının ortak veri katmanı.
 *
 * - Anahtarlar `['user', userId, 'workspace', 'OD', kaynak, parametreler]`:
 *   başka hesabın / çalışma alanının önbelleği asla eşleşmez; çalışma alanı
 *   değişince `selectWorkspace` bu kapsamı siler, çıkışta önbellek temizlenir.
 * - Önbellek yalnız bellektedir (cihaz depolamasına yazılmaz).
 */
export function useOdKey(resource: string, params?: Record<string, string | number | null>): QueryKey {
  const bootstrap = useReadyBootstrap();
  return queryKeys.workspaceResource(bootstrap.user.id, 'OD', resource, params);
}

export function useOdQuery<T>(resource: string, fetcher: (api: ApiClient, signal: AbortSignal) => Promise<T>, options: { params?: Record<string, string | number | null>; enabled?: boolean } = {}) {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const isOd = bootstrap.workspace?.activeProduct === 'OD';
  return useQuery({
    queryKey: queryKeys.workspaceResource(bootstrap.user.id, 'OD', resource, options.params),
    queryFn: ({ signal }) => fetcher(api, signal),
    // OD verisi yalnız OD çalışma alanında istenir (Yön / Deneme Ligi'nde asla).
    enabled: isOd && (options.enabled ?? true),
  });
}

/**
 * Başarılı bir yazmadan SONRA (sunucu onayı geldikten sonra) bu kullanıcının
 * OD kapsamındaki tüm görünümleri yenilenir: Bugün, Çalışmalar, Gidişat,
 * detaylar tutarlı kalır. Başka kullanıcının anahtarına dokunulmaz.
 */
export function useInvalidateOd() {
  const client = useQueryClient();
  const bootstrap = useReadyBootstrap();
  return () => client.invalidateQueries({ queryKey: queryKeys.workspace(bootstrap.user.id, 'OD') });
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
export function useOdNavigation() {
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

/** OD bayrağı (bootstrap `workspace.flags`, sunucu `PanelFeatureFlags` adları). */
export function useOdFlag(flag: string): boolean {
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
export function QueryView<T>({ query, children, rows = 5, disabledTitle = 'Bu bölüm şu anda kullanıma açık değil.' }: QueryViewProps<T>) {
  const online = useOnline();
  const error = query.error;
  if (query.data !== undefined) {
    return (
      <>
        {!online ? (
          <Banner tone="warning" title="Çevrimdışısın">
            Gösterilen bilgiler son bağlantıdaki hâli. Bağlantı gelince yenilenir.
          </Banner>
        ) : error ? (
          <Banner tone="warning" title="Güncellenemedi">
            {error instanceof ApiError ? error.message : 'Son bilgiler gösteriliyor.'}
          </Banner>
        ) : null}
        {children(query.data)}
      </>
    );
  }
  if (error instanceof ApiError && error.kind === 'feature_disabled') return <EmptyState title={disabledTitle} />;
  if (error instanceof ApiError && (error.kind === 'product_access' || error.kind === 'forbidden')) {
    return <EmptyState title="Bu bölüme erişimin yok" body={error.message} />;
  }
  if (error) return <ErrorState error={error} onRetry={() => void query.refetch()} />;
  if (!online && query.fetchStatus === 'paused') {
    return <EmptyState title="Çevrimdışısın" body="Bağlantı geldiğinde bu bölüm otomatik yüklenecek." />;
  }
  return <Skeleton rows={rows} />;
}

/**
 * OD detay rotalarının (`/od/...`) kapısı. Derin bağlantı / bildirimle
 * gelinse bile ekran yalnız OD çalışma alanında ve ilgili öğe kullanıcının
 * YETKİLİ menüsündeyse açılır; aksi halde güvenli boş durum. Sunucu her
 * istekte ayrıca kimlik + ürün + kaynak sahipliğini doğrular.
 */
export function OdRouteGate({ navId, children }: { navId: string; children: ReactNode }) {
  const bootstrap = useReadyBootstrap();
  const allowed = bootstrap.workspace?.activeProduct === 'OD' && hasNavItem(bootstrap.workspace.navigation, navId);
  if (!allowed) {
    return <EmptyState title="Bu bölüm bu çalışma alanında yok" body="Bağlantı başka bir çalışma alanına ait olabilir veya erişimin değişmiş olabilir." />;
  }
  return <>{children}</>;
}
