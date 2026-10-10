import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Çalışan istemcinin kimliği. Sürüm SABİT YAZILMAZ: native derlemede
 * kurulu uygulamanın gerçek sürümü (`nativeApplicationVersion`), Expo Go /
 * geliştirme ortamında `app.json` sürümü okunur. İkisi de yoksa sürüm
 * bilinmiyor sayılır ve başlık gönderilmez — sunucu minimum sürüm kapısı
 * açıksa bunu desteklenmeyen sürüm sayar (bkz. docs/mobile/m1-api-contracts.md).
 */
export function readAppVersion(): string | null {
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;
  return version && /^\d+\.\d+\.\d+/.test(version) ? version : null;
}

export const APP_VERSION = readAppVersion();
export const APP_PLATFORM: 'ios' | 'android' | 'web' = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

/** Sunucunun oturum listesinde tanıdığı biçim (`lib/auth/session-device.ts`). */
export const APP_USER_AGENT = `OnlineDershanemMobile/${APP_VERSION ?? '0.0.0'} (${APP_PLATFORM})`;

/**
 * API kökü. Yerel geliştirmede `.env` ile verilir (`.env.example`). Üretim
 * derlemesinde `EXPO_PUBLIC_API_URL` HTTPS olmalıdır; değer yoksa açıkça
 * yapılandırma hatası gösterilir (sessizce localhost'a gidilmez).
 */
export function resolveApiBaseUrl(value: string | undefined = process.env.EXPO_PUBLIC_API_URL, isDev: boolean = __DEV__): string | null {
  const trimmed = value?.trim().replace(/\/+$/, '');
  if (!trimmed) return isDev ? 'http://localhost:3000' : null;
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    if (!isDev && (url.protocol !== 'https:' || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[|.*\.local$)/i.test(url.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname))) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Web paneli (desteklenmeyen akışlar için "web'de devam et"). API ile aynı köken. */
export const WEB_BASE_URL = API_BASE_URL;
