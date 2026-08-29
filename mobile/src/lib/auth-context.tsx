import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import { ApiError, login as apiLogin, logout as apiLogout } from '@/lib/api';

const TOKEN_KEY = 'od_session_token';

/**
 * Token'ı DÜZ METİN olarak `AsyncStorage`'da SAKLAMA yasağı (mobil inşa
 * promptu §6.6, §9) — native'de `expo-secure-store` (Keychain/Keystore)
 * kullanılır. Web önizlemesinde SecureStore native modülü yok; orada kasıtlı
 * olarak kalıcı saklama YAPILMAZ (oturum sekme kapanınca biter) — web hiçbir
 * zaman v1 hedefi değil, yalnız geliştirme sırasında tarayıcıda önizleme
 * çökmesin diye.
 */
const tokenStore = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

type AuthState = {
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tokenStore.get().then((stored) => {
      setToken(stored);
      setIsLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      isLoading,
      async signIn(email: string, password: string) {
        const { token: newToken } = await apiLogin(email, password);
        await tokenStore.set(newToken);
        setToken(newToken);
      },
      async signOut() {
        const current = token;
        setToken(null);
        await tokenStore.clear();
        if (current) {
          // Sunucu tarafı iptal en iyi çaba — yerel token zaten silindi,
          // ağ hatası kullanıcıyı çıkış yapamaz durumda BIRAKMAMALI.
          try {
            await apiLogout(current);
          } catch (error) {
            if (!(error instanceof ApiError)) throw error;
          }
        }
      },
    }),
    [token, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useSession, SessionProvider içinde kullanılmalı.');
  return ctx;
}
