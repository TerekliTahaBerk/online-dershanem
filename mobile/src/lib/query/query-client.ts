import NetInfo from '@react-native-community/netinfo';
import { focusManager, MutationCache, onlineManager, QueryCache, QueryClient } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { ApiError } from '@/lib/api/errors';

/**
 * Yeniden deneme politikası — yalnız OKUMA sorguları için:
 * ağ / zaman aşımı / 5xx / 503 en fazla iki kez; 4xx asla (yetki, kapı,
 * doğrulama hatası tekrarla düzelmez). Mutasyonlar HİÇ otomatik
 * tekrarlanmaz (`mutations.retry = 0`): idempotent tekrar yalnız sunucunun
 * açıkça desteklediği uçlarda, aynı idempotency anahtarıyla, kullanıcı
 * eylemiyle yapılır.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  return error instanceof ApiError && error.transient;
}

export function retryDelay(attempt: number, error: unknown): number {
  if (error instanceof ApiError && error.retryAfterMs) return Math.min(error.retryAfterMs, 30_000);
  return Math.min(1000 * 2 ** attempt, 8_000);
}

/** Sorgu / mutasyon hatası merkezi dinleyicisi (oturum sağlayıcısı bağlar). */
export type QueryErrorListener = (error: unknown) => void;

export function createQueryClient(onError?: QueryErrorListener): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: (error) => onError?.(error) }),
    mutationCache: new MutationCache({ onError: (error) => onError?.(error) }),
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        retryDelay,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        // Çevrimdışıyken sorgu ağ beklemeye alınır; önbellekteki son veri gösterilir.
        networkMode: 'online',
      },
      mutations: { retry: 0, networkMode: 'online' },
    },
  });
}

let wired = false;

/**
 * Ağ ve ön plan farkındalığı: NetInfo → `onlineManager`, AppState →
 * `focusManager` (uygulama ön plana dönünce bayat sorgular yenilenir).
 * Önbellek yalnız bellektedir; cihaz depolamasına yazılmaz.
 */
export function wireQueryEnvironment(): () => void {
  if (wired) return () => undefined;
  wired = true;
  const unsubscribeNet = NetInfo.addEventListener((state) => {
    onlineManager.setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  });
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  });
  return () => {
    wired = false;
    unsubscribeNet();
    subscription.remove();
  };
}
