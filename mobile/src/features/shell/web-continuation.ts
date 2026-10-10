import * as WebBrowser from 'expo-web-browser';

import { WEB_BASE_URL } from '@/config/app-info';

/**
 * Mobilde henüz olmayan akışlar için açık "web'de devam et" yolu. Yalnız
 * aynı kökendeki `/panel` veya `/giris` yolları açılır; token URL'e KONMAZ —
 * tarayıcıda kullanıcı web oturumuyla (gerekirse yeniden) giriş yapar.
 */
export function webUrlFor(path: string | null | undefined): string | null {
  if (!WEB_BASE_URL || !path) return null;
  if (!/^\/(panel|giris)(\/[\w\-./]*)?$/.test(path) || path.includes('..')) return null;
  if (/(?:^|\/)(?:checkout|paytr|odeme|odemeler|siparis|siparisler|paket|paketler|satin-al|abonelik|billing|payments?|orders?|subscriptions?)(?:\/|$)/i.test(path)) return null;
  return `${WEB_BASE_URL}${path}`;
}

export async function openOnWeb(path: string | null | undefined): Promise<boolean> {
  const url = webUrlFor(path);
  if (!url) return false;
  try {
    await WebBrowser.openBrowserAsync(url);
    return true;
  } catch {
    return false;
  }
}
