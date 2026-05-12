/**
 * Auth store — Zustand. Hidrasyon `AuthProvider` içinde yapılır.
 *
 * Kural:
 *  - Token persistans katmanı SecureStore (lib/storage).
 *  - Bu store sadece bellek-içi state + setter'lar tutar.
 *  - API client'ı `bindTokenAccessor` ile bu store'a bağlanır.
 */
import { create } from "zustand";
import type { AuthTokens, AuthUser } from "@/types/user";
import { tokenStorage } from "@/lib/storage";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  setSession: (user: AuthUser, tokens: AuthTokens) => Promise<void>;
  setTokens: (tokens: AuthTokens | null) => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,
  tokens: null,

  setSession: async (user, tokens) => {
    await tokenStorage.set(tokens);
    set({ user, tokens, status: "authenticated" });
  },

  setTokens: async (tokens) => {
    if (tokens) await tokenStorage.set(tokens);
    else await tokenStorage.clear();
    set((s) => ({ tokens, status: tokens ? s.status : "unauthenticated" }));
  },

  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),

  clear: async () => {
    await tokenStorage.clear();
    set({ user: null, tokens: null, status: "unauthenticated" });
  },
}));
