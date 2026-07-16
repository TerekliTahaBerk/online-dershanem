/**
 * Parola politikası — SAF, bağımlılıksız.
 *
 * `password.ts`'ten AYRI durmasının sebebi teknik ve zorunlu: o dosya
 * `node:crypto` kullanıyor ve bir client component ondan tek bir sabit bile
 * import ederse webpack `node:crypto`'yu tarayıcıya paketlemeye çalışıp
 * "UnhandledSchemeError" ile patlıyor.
 *
 * Buradaki her şey hem sunucuda hem tarayıcıda çalışabilir; böylece form,
 * sunucuya gitmeden aynı kuralları uygulayabilir. Kural TEK yerde tanımlı —
 * sunucu yine de kendi tarafında doğrular, client kontrolü sadece kolaylık.
 */

export const PASSWORD_MIN_LENGTH = 10;
/** scrypt pahalıdır; sınırsız uzunluk bir DoS yüzeyidir. */
export const PASSWORD_MAX_LENGTH = 200;

/*
 * Küçük ve gömülü liste. Amaç kapsamlı bir sözlük değil; "parola politikası
 * var" diye insanların yazdığı en bariz şeyleri elemek. Uzunluk kuralı asıl
 * korumayı zaten sağlıyor.
 */
const COMMON_PASSWORDS = new Set([
  "1234567890", "0123456789", "1234512345", "qwertyuiop", "qwerty123", "password", "password1",
  "password123", "parola123", "sifre1234", "sifre12345", "sifrem123", "123456789", "12345678",
  "iloveyou", "admin123", "administrator", "letmein123", "welcome123", "abcd1234", "aaaaaaaaaa",
  "1111111111", "onlinedershanem", "dershanem123", "matematik123", "ogrenci123", "ogretmen123",
]);

export type PasswordCheck = { ok: true } | { ok: false; error: string };

/**
 * Kullanıcının SEÇTİĞİ parolayı denetler (üretilen geçici parolalar buradan geçmez).
 *
 * Karmaşıklık kuralı (büyük/küçük/rakam/sembol) BİLEREK yok: insanı `Parola1!`
 * yazmaya iter ve gerçek gücü artırmaz. Uzunluk daha etkilidir.
 */
export function validatePasswordStrength(
  password: string,
  context: { email?: string; fullName?: string | null } = {},
): PasswordCheck {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Parola en az ${PASSWORD_MIN_LENGTH} karakter olmalı.` };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, error: `Parola en fazla ${PASSWORD_MAX_LENGTH} karakter olabilir.` };
  }
  if (password.trim().length === 0) {
    return { ok: false, error: "Parola yalnızca boşluktan oluşamaz." };
  }

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return { ok: false, error: "Bu parola çok yaygın. Başka bir parola seçin." };
  }

  const email = context.email?.trim().toLowerCase();
  if (email) {
    if (lower === email) return { ok: false, error: "Parola e-posta adresinizle aynı olamaz." };
    const localPart = email.split("@")[0];
    if (localPart.length >= 4 && lower === localPart) {
      return { ok: false, error: "Parola e-posta adresinizden türetilmiş olamaz." };
    }
  }

  const name = context.fullName?.trim().toLowerCase();
  if (name && name.length >= 4 && lower === name) {
    return { ok: false, error: "Parola adınızla aynı olamaz." };
  }

  return { ok: true };
}
