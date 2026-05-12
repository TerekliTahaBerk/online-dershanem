/**
 * Token persistans katmanı — Expo SecureStore (Keychain/Keystore) ile.
 * Token'lar **asla** AsyncStorage/MMKV'a yazılmaz.
 */
import * as SecureStore from "expo-secure-store";
import type { AuthTokens } from "@/types/user";

const KEY = "od_auth_tokens_v1";

export const tokenStorage = {
  async get(): Promise<AuthTokens | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthTokens;
    } catch {
      return null;
    }
  },
  async set(tokens: AuthTokens): Promise<void> {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
  },
};
