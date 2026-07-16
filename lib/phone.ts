/**
 * Telefon numarasını WhatsApp (wa.me) biçimine çevirir.
 *
 * NEDEN GEREKLİ: `wa.me` ULUSLARARASI biçim ister — ülke kodu var, baştaki 0
 * ve + yok. Türkiye'de insanlar numarayı doğal olarak "0537 795 44 34" diye
 * yazar. Bu haliyle `wa.me/05377954434` linki WhatsApp'ta "geçersiz numara"
 * hatası verir ve mesaj hiç gönderilemez.
 *
 * Saf modül — client component'ler de kullanabilir.
 */

/**
 * Türkiye biçimlerini 90XXXXXXXXXX'e çevirir.
 *
 * Tanınan girdiler:
 *   "0537 795 44 34"    → "905377954434"
 *   "537 795 44 34"     → "905377954434"
 *   "+90 537 795 44 34" → "905377954434"
 *   "0090 537..."       → "905377954434"
 *
 * Başında "+" olan yabancı numaralar olduğu gibi kabul edilir.
 * Tanınmayan biçimde `null` döner — çağıran taraf numarasız linke düşmeli;
 * yanlış numaraya mesaj açmaktansa admin'in kişiyi seçmesi iyidir.
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return null;

  // Kullanıcı "+" yazdıysa ülke kodunu bilerek vermiştir; dokunma.
  if (trimmed.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }

  // 00 uluslararası çıkış öneki
  if (digits.startsWith("00")) {
    const rest = digits.slice(2);
    return rest.length >= 8 && rest.length <= 15 ? rest : null;
  }

  // 90 5xx xxx xx xx
  if (digits.length === 12 && digits.startsWith("905")) return digits;

  // 0 5xx xxx xx xx
  if (digits.length === 11 && digits.startsWith("05")) return `90${digits.slice(1)}`;

  // 5xx xxx xx xx
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;

  return null;
}

/** Hazır mesajlı WhatsApp linki. Numara tanınmazsa kişi seçtiren genel linke düşer. */
export function whatsAppLink(phone: string | null | undefined, message: string): string {
  const number = toWhatsAppNumber(phone);
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
