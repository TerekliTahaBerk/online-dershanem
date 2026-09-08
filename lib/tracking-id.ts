import { createHash, randomUUID } from "node:crypto";

/**
 * Anonim izleme kimliği — SUNUCU tarafı.
 *
 * `node:crypto`'ya dayandığı için `lib/tracking.ts`'ten AYRILDI: o modül
 * istemci bileşenlerinden (satın alma CTA'sı, sepet, paket kurgulayıcı)
 * içe aktarılıyor ve `node:crypto` tarayıcı paketine girdiğinde
 * `randomUUID` var olmayan bir alan hâline geliyor.
 *
 * `server-only` işaretlenmedi çünkü birim test koşucusu `react-server`
 * koşulu olmadan çalışıyor ve o paket orada fırlıyor. Sınırı `lint:hygiene`
 * koruyor: istemci bileşenlerinin içe aktardığı hiçbir modül `node:` ile
 * başlayan bir şey içe aktaramaz.
 */
export function createAnonymousTrackingId(seed?: string): string {
  const value = seed?.trim() || randomUUID();
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
