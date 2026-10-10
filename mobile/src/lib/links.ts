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
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false;
    if (/(^|\.)paytr\.com$/i.test(parsed.hostname)) return false;
    if (/(?:^|\/)(?:checkout|paytr|odeme|odemeler|siparis|siparisler|paketler|satin-al|billing|payments?|orders?|subscriptions?)(?:\/|$)/i.test(decodeURIComponent(parsed.pathname))) return false;
    return true;
  } catch {
    return false;
  }
}
