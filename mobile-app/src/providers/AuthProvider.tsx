/**
 * AuthProvider:
 *  - Mount'ta SecureStore'dan token yükler.
 *  - Geçerli token varsa /me ile doğrular ve store'u doldurur.
 *  - API client'ı store'a bağlar (bindTokenAccessor).
 *  - login/logout helper'larını expose eder.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/auth.store";
import { tokenStorage } from "@/lib/storage";
import { authApi } from "@/api/auth";
import { bindTokenAccessor } from "@/api/client";
import type { AuthTokens, AuthUser, UserRole } from "@/types/user";
import { logger } from "@/lib/logger";

interface AuthContextValue {
  status: ReturnType<typeof useAuthStore>["status"];
  user: AuthUser | null;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { status, user, setSession, clear, setUser, setStatus, setTokens } = useAuthStore();

  // API client → store bağlantısı (modül-level singleton).
  useEffect(() => {
    bindTokenAccessor({
      get: () => useAuthStore.getState().tokens,
      set: async (tokens: AuthTokens | null) => {
        await setTokens(tokens);
        if (!tokens) {
          setUser(null);
          setStatus("unauthenticated");
        }
      },
    });
  }, [setTokens, setUser, setStatus]);

  const refreshMe = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
      setStatus("authenticated");
    } catch (err) {
      logger.warn("me failed", err);
      await clear();
    }
  }, [setUser, setStatus, clear]);

  // Cold-start hidrasyonu.
  useEffect(() => {
    (async () => {
      const tokens = await tokenStorage.get();
      if (!tokens) {
        setStatus("unauthenticated");
        return;
      }
      await setTokens(tokens);
      await refreshMe();
    })();
  }, [refreshMe, setTokens, setStatus]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login({ email: email.trim().toLowerCase(), password });
      await setSession(result.user, result.tokens);
      return result.user;
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    } finally {
      await clear();
    }
  }, [clear]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, role: user?.role ?? null, login, logout, refreshMe }),
    [status, user, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
