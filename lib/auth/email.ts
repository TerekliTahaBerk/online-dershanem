/**
 * E-posta normalizasyonu.
 *
 * Kendi modülü olmasının sebebi tek bir tuzak:
 *
 *   "IEVE@ornek.com".toLocaleLowerCase("tr")  →  "ıeve@ornek.com"
 *
 * Türkçe locale'de "I" harfi NOKTASIZ "ı"ya döner. Bu bir e-postaya uygulanırsa
 * adres sessizce bozulur; kullanıcı hesabına BİR DAHA ASLA giremez ve hata
 * hiçbir yerde görünmez. Bu projede Türkçe locale'li `toLocaleLowerCase("tr-TR")`
 * kullanımı ZATEN VAR (`lib/pricing-content.ts`) — yani refleks mevcut ve
 * tehlikeli.
 *
 * E-postada her zaman locale'siz `.toLowerCase()` kullanılır. Bu fonksiyon,
 * o kuralın tek uygulama noktasıdır: kullanıcı e-postası her yerde buradan geçer.
 */

/** Depolama ve arama için tekil biçim. Locale'siz — asla `toLocaleLowerCase` kullanma. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Kaba biçim kontrolü. Amaç RFC 5321 uyumu değil; açıkça bozuk girdiyi
 * veritabanına sokmamak. Gerçek doğrulama zaten "parolayı biliyor mu"dur.
 */
export function isPlausibleEmail(value: string): boolean {
  if (value.length < 3 || value.length > 254) return false;
  if (/\s/.test(value)) return false;
  const at = value.indexOf("@");
  if (at <= 0 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  if (domain.length < 3 || !domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  return true;
}
