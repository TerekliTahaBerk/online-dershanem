import type { MobileBootstrap, MobileProductCode } from '@contracts/bootstrap';
import { QueryClientProvider, useQuery, type QueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { API_BASE_URL, APP_USER_AGENT, APP_VERSION } from '@/config/app-info';
import { createApiClient, type ApiClient } from '@/lib/api/client';
import * as endpoints from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { deriveAppState, type AppState } from '@/lib/auth/app-state';
import { createGateRefreshPolicy } from '@/lib/auth/gate-refresh';
import { tokenStore } from '@/lib/auth/token-store';
import { clearMaterialFiles } from '@/lib/files/material-files';
import { resetLocalPushState } from '@/lib/push/native-push';
import { forgetPushRegistration, unregisterCurrentDevice } from '@/lib/push/registration';
import { queryKeys, sessionKeyFor } from '@/lib/query/keys';
import { createQueryClient, wireQueryEnvironment } from '@/lib/query/query-client';

type SessionContextValue = {
  state: AppState;
  api: ApiClient;
  /** Yalnız kimlikli dosya indirme gibi fetch dışı araçlar için. */
  token: string | null;
  bootstrap: MobileBootstrap | undefined;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (notice?: 'SIGNED_OUT' | 'SESSION_EXPIRED') => Promise<void>;
  /** Sunucudan güncel kapı / çalışma alanı durumunu çeker. */
  refreshBootstrap: () => Promise<void>;
  selectWorkspace: (product: MobileProductCode) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Oturum + sunucu durumu sağlayıcısı.
 *
 * Önbellek izolasyonu: giriş öncesinde ve çıkıştan sonra `queryClient.clear()`
 * çalışır; sorgu anahtarları kullanıcı kimliğiyle başlar. Hassas yanıtlar
 * cihaz depolamasına yazılmaz.
 */
export function SessionProvider({ children, queryClient: injectedClient }: PropsWithChildren<{ queryClient?: QueryClient }>) {
  const tokenRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signOutNotice, setSignOutNotice] = useState<'SESSION_EXPIRED' | 'SIGNED_OUT' | null>(null);
  const gatePolicy = useRef(createGateRefreshPolicy());
  const expireRef = useRef<(() => void) | null>(null);
  const refreshRef = useRef<(() => void) | null>(null);

  const [queryClient] = useState(
    () =>
      injectedClient ??
      createQueryClient((error) => {
        if (error instanceof ApiError && error.kind === 'unauthenticated') expireRef.current?.();
        else if (gatePolicy.current.shouldRefresh(error)) refreshRef.current?.();
      }),
  );

  const [api] = useState(() =>
    createApiClient({
      baseUrl: API_BASE_URL,
      appVersion: APP_VERSION,
      userAgent: APP_USER_AGENT,
      getToken: () => tokenRef.current,
      onUnauthenticated: () => expireRef.current?.(),
    }),
  );

  useEffect(() => wireQueryEnvironment(), []);

  useEffect(() => {
    let cancelled = false;
    tokenStore.read().then((stored) => {
      if (cancelled) return;
      tokenRef.current = stored;
      setToken(stored);
      setTokenLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sessionKey = sessionKeyFor(token);
  const bootstrapQuery = useQuery(
    {
      queryKey: queryKeys.bootstrap(sessionKey),
      queryFn: ({ signal }) => endpoints.fetchBootstrap(api, signal),
      enabled: Boolean(token),
      staleTime: 60_000,
      refetchInterval: 5 * 60_000,
      // Kapı / sürüm / doğrulama hataları tekrarla düzelmez.
      retry: (count, error) => count < 2 && error instanceof ApiError && error.transient,
    },
    queryClient,
  );

  // React Compiler bu bileşeni memoize eder; elle useCallback/useMemo yok.
  async function clearLocalSession(notice: 'SESSION_EXPIRED' | 'SIGNED_OUT') {
    tokenRef.current = null;
    setToken(null);
    setSignOutNotice(notice);
    gatePolicy.current.reset();
    await tokenStore.clear();
    queryClient.clear();
    // Kimlikli indirilmiş materyaller önbellekten silinir (sonraki hesaba kalmaz).
    clearMaterialFiles();
    // M5: rozet, sistemdeki bildirimler ve bellekteki kayıt bilgisi sonraki hesaba kalmaz.
    forgetPushRegistration();
    void resetLocalPushState();
  }

  expireRef.current = () => {
    if (!tokenRef.current) return;
    void clearLocalSession('SESSION_EXPIRED');
  };
  refreshRef.current = () => {
    void bootstrapQuery.refetch();
  };

  async function signIn(email: string, password: string) {
    setSigningIn(true);
    try {
      // Önceki hesaptan kalabilecek her şey yeni kimlik açılmadan silinir.
      queryClient.clear();
      clearMaterialFiles();
      const { token: newToken } = await endpoints.login(api, email, password);
      await tokenStore.write(newToken);
      tokenRef.current = newToken;
      setSignOutNotice(null);
      setToken(newToken);
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut(notice: 'SIGNED_OUT' | 'SESSION_EXPIRED' = 'SIGNED_OUT') {
    // Oturum zaten kapandıysa (ör. merkezi 401 işleyicisi önce çalıştı) tekrar
    // kapatma; aksi halde "oturum sona erdi" bildirimi ezilirdi.
    if (!tokenRef.current) return;
    try {
      // M5: push cihaz kaydı, Bearer hâlâ geçerliyken silinir (en iyi çaba).
      // Çevrimdışıysa sunucu, oturum iptal / süre bitimiyle cihazı yine devre dışı bırakır.
      await unregisterCurrentDevice(api);
    } catch {
      // Yok sayılır; aşağıdaki oturum iptali cihaz kaydını da geçersiz kılar.
    }
    try {
      // Sunucu iptali önce: yerel token silinmeden önce Bearer gerekiyor.
      await endpoints.logout(api);
    } catch {
      // Ağ hatası kullanıcıyı çıkış yapamaz durumda bırakmaz; yerel kimlik
      // yine silinir. Sunucu oturumu süre politikasıyla kapanır ve
      // "Oturumlar" ekranından uzaktan kapatılabilir.
    }
    await clearLocalSession(notice);
  }

  async function refreshBootstrap() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap(sessionKeyFor(tokenRef.current)) });
  }

  async function selectWorkspace(product: MobileProductCode) {
    await endpoints.selectWorkspace(api, product);
    const userId = bootstrapQuery.data?.user.id;
    // Ürün kapsamlı veriler eski çalışma alanına aittir.
    if (userId) queryClient.removeQueries({ queryKey: [...queryKeys.user(userId), 'workspace'] });
    await refreshBootstrap();
  }

  const bootstrapError = bootstrapQuery.error instanceof ApiError ? bootstrapQuery.error : bootstrapQuery.error ? new ApiError({ kind: 'invalid_response' }) : null;
  const state = deriveAppState({
    tokenLoaded,
    token,
    signingIn,
    signOutNotice,
    // Hata sonrası eski veriyle devam edilmez: kapı/kimlik hatası verinin yerini alır.
    bootstrap: bootstrapError && !bootstrapError.transient ? undefined : bootstrapQuery.data,
    bootstrapError,
    appVersion: APP_VERSION,
  });

  const value: SessionContextValue = { state, api, token, bootstrap: bootstrapQuery.data, signIn, signOut, refreshBootstrap, selectWorkspace };

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
    </QueryClientProvider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession, SessionProvider içinde kullanılmalı.');
  return context;
}

/** Hazır (READY) oturumun bootstrap'ı; kapı ekranlarında kullanılmaz. */
export function useReadyBootstrap(): MobileBootstrap {
  const { state } = useSession();
  if (state.status !== 'WORKSPACE_READY') throw new Error('Bu ekran yalnız hazır çalışma alanında açılır.');
  return state.bootstrap;
}
