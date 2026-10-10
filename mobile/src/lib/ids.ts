import { uuid } from 'expo-modules-core';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Gerçek (rastgele) UUID v4 — Expo'nun native üreticisi (iOS `NSUUID`,
 * Android `java.util.UUID.randomUUID`, ikisi de kriptografik rastgele).
 * Sunucunun `mutationKey: z.string().uuid()` ve idempotency anahtarı
 * (`[a-zA-Z0-9_-]{12,80}`) biçimlerinin ikisine de uyar.
 *
 * `Math.random` ile yedek ÜRETİLMEZ: anahtar çakışması, farklı iki yazmanın
 * sunucuda "tekrar" sayılması demektir. Üretici yoksa hata fırlatılır ve
 * yazma gönderilmez.
 */
export function newUuid(): string {
  const value = uuid.v4();
  if (!UUID_V4.test(value)) throw new Error('Geçerli bir UUID üretilemedi.');
  return value.toLowerCase();
}
