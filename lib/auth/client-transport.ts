/**
 * Native mobil istemci taşıma kuralları — saf mantık (`server-only` değil).
 *
 * `X-Od-Client: mobile` KİMLİK veya YETKİ KANITI DEĞİLDİR. Herhangi bir
 * istemci gönderebilir. Yalnız şu iki TAŞIMA kararını etkiler:
 *   1. Giriş yanıtında oturum token'ı gövdede döner (çerez yerine).
 *   2. Yanıt httpOnly oturum çerezi YAZMAZ.
 * Bir saldırgan başlığı taklit ederse kendi parolasıyla açtığı kendi
 * oturumunun token'ını görür — tarayıcı akışından fazlasını değil.
 */

export const MOBILE_CLIENT_HEADER = "x-od-client";
export const MOBILE_CLIENT_VERSION_HEADER = "x-od-client-version";
export const MOBILE_CLIENT_VALUE = "mobile";

type HeaderReader = { get(name: string): string | null };

export function isNativeMobileClient(headers: HeaderReader): boolean {
  return headers.get(MOBILE_CLIENT_HEADER)?.trim().toLowerCase() === MOBILE_CLIENT_VALUE;
}

/** Giriş yanıtının taşıma biçimi. Tarayıcı: çerez, token yok. Mobil: token, çerez yok. */
export function loginTransport(headers: HeaderReader): { setCookie: boolean; returnToken: boolean } {
  const mobile = isNativeMobileClient(headers);
  return { setCookie: !mobile, returnToken: mobile };
}

export type SemVer = readonly [number, number, number];

/** Yalnız `MAJOR.MINOR.PATCH` (isteğe bağlı `-etiket`/`+meta` atılır). Geçersizse null. */
export function parseSemVer(value: string | null | undefined): SemVer | null {
  if (!value) return null;
  const match = /^\s*(\d{1,4})\.(\d{1,4})\.(\d{1,6})(?:[-+][0-9A-Za-z.-]*)?\s*$/.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareSemVer(a: SemVer, b: SemVer): number {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

export type ClientVersionDecision =
  | { ok: true; minSupportedVersion: string | null }
  | { ok: false; code: "CLIENT_UPGRADE_REQUIRED"; minSupportedVersion: string };

/**
 * Minimum mobil sürüm kapısı.
 *
 * - Mobil olmayan istekler (web) hiç etkilenmez.
 * - `MOBILE_MIN_SUPPORTED_VERSION` tanımsız/geçersizse kapı kapalıdır
 *   (yerel geliştirme derlemeleri engellenmez).
 * - Kapı açıkken sürüm başlığı eksik veya geçersiz olan mobil istek
 *   desteklenmeyen sürüm sayılır (güvenli varsayılan).
 *
 * Bu bir GÜVENLİK kontrolü değildir; güvenlik kapıları (parola, MFA, yetki)
 * her istekte sunucuda ayrıca çalışır. Amaç sözleşmesi uyumsuz eski
 * istemcilere açık bir "güncelle" ekranı göstermektir.
 */
export function evaluateClientVersion(headers: HeaderReader, minSupported: string | null | undefined): ClientVersionDecision {
  const minimum = parseSemVer(minSupported);
  if (!minimum || !minSupported) return { ok: true, minSupportedVersion: null };
  const normalizedMinimum = minimum.join(".");
  if (!isNativeMobileClient(headers)) return { ok: true, minSupportedVersion: normalizedMinimum };
  const version = parseSemVer(headers.get(MOBILE_CLIENT_VERSION_HEADER));
  if (!version || compareSemVer(version, minimum) < 0) {
    return { ok: false, code: "CLIENT_UPGRADE_REQUIRED", minSupportedVersion: normalizedMinimum };
  }
  return { ok: true, minSupportedVersion: normalizedMinimum };
}
