/**
 * Dış bağlantı güvenliği: yalnız http/https açılır. `javascript:`, `intent:`,
 * `file:` gibi şemalar (sunucu verisi kötüye kullanılırsa) asla açılmaz.
 * Kimlikli panel uçları (`/api/panel/...`) bu yolla AÇILMAZ; onlar Bearer
 * başlığıyla indirilir.
 */
export function isSafeExternalUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
