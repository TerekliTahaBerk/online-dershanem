/**
 * Auth & form yardımcıları.
 * Eski `lib/admin.normalizePhone` ve `lib/form-utils.readString`'in
 * minimal yerine geçen küçük utiller.
 */

/**
 * Türkiye telefon numaralarını dedup için normalize edilmiş hale getirir.
 * Örn: "+90 (532) 111 22 33" → "905321112233"
 */
export function normalizePhone(input: string): string {
  if (!input) return "";
  const digitsOnly = input.replace(/\D/g, "");
  if (!digitsOnly) return "";
  // Yurtiçi 10 haneli numarayı +90 ile birleştir.
  if (digitsOnly.length === 10) return `90${digitsOnly}`;
  // 0 ile başlayan 11 haneliyi 0'sız +90 yap.
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return `90${digitsOnly.slice(1)}`;
  }
  return digitsOnly;
}

/**
 * FormData içinden trim edilmiş string değer okur.
 */
export function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}
