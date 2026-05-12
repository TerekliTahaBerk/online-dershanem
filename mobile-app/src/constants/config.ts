/**
 * Uygulama yapılandırması — Expo Constants + .env üzerinden.
 * Tek yerden okunmalı; başka hiçbir dosya process.env'e dokunmaz.
 */
import Constants from "expo-constants";

type AppEnv = "development" | "staging" | "production";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

const fromEnv = (key: string, fallback: string) =>
  process.env[key] ?? (extra[key] as string | undefined) ?? fallback;

export const config = {
  apiUrl: fromEnv(
    "EXPO_PUBLIC_API_URL",
    (extra.apiUrl as string | undefined) ?? "https://onlinedershanem.com",
  ),
  appEnv: fromEnv("EXPO_PUBLIC_APP_ENV", "development") as AppEnv,
  isProd: fromEnv("EXPO_PUBLIC_APP_ENV", "development") === "production",
  /** Mobil API root: /api/v1/mobile altında konumlanır. */
  apiBase(): string {
    return `${this.apiUrl.replace(/\/$/, "")}/api/v1/mobile`;
  },
} as const;
