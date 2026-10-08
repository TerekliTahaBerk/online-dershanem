import type { MobileNavItem } from '@contracts/bootstrap';

/**
 * Merkezi rota eşlemesi: bildirim `href`'leri (web yolu) ve gelen derin
 * bağlantılar → native rota.
 *
 * Güvenlik:
 * - Hedef yalnız SUNUCUNUN bu kullanıcı + bu çalışma alanı için verdiği
 *   menüde varsa açılır ("yetkili hedef kontrolü"). Başka çalışma alanına
 *   veya role ait yol eşlenmez; kullanıcı bildirim listesinde kalır.
 * - Token / kimlik bilgisi taşıyan URL kabul edilmez; sorgu dizesi atılır.
 */

export type NativeTarget =
  | { kind: 'tab'; slot: 0 | 1 | 2 | 3; navId: string }
  | { kind: 'screen'; navId: string }
  | { kind: 'notifications' }
  | { kind: 'none' };

type Navigation = { primary: MobileNavItem[]; sections: { items: MobileNavItem[] }[] };

/** `/panel/...` web yolunu sorgu/parça olmadan normalize eder; panel dışı veya bozuk yol null. */
export function normalizeWebPath(href: string | null | undefined): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed.startsWith('/panel') || trimmed.startsWith('//')) return null;
  const base = trimmed.split(/[?#]/)[0].replace(/\/+$/, '');
  if (!/^\/panel(\/[\w\-./]*)?$/.test(base) || base.includes('..')) return null;
  return base;
}

export function targetForNavId(navigation: Navigation, navId: string): NativeTarget {
  const slot = navigation.primary.slice(0, 4).findIndex((item) => item.id === navId);
  if (slot >= 0) return { kind: 'tab', slot: slot as 0 | 1 | 2 | 3, navId };
  const exists = navigation.sections.some((section) => section.items.some((item) => item.id === navId));
  return exists ? { kind: 'screen', navId } : { kind: 'none' };
}

/** Bildirim href'i → yetkili native hedef. Eşleşme yoksa `none` (liste ekranında kalınır). */
export function mapNotificationHref(href: string | null | undefined, navigation: Navigation | null): NativeTarget {
  const path = normalizeWebPath(href);
  if (!path) return { kind: 'none' };
  if (path === '/panel/bildirimler' || path === '/panel/veli/bildirimler') return { kind: 'notifications' };
  if (!navigation) return { kind: 'none' };
  const items = [...navigation.primary, ...navigation.sections.flatMap((section) => section.items)];
  const exact = items.find((item) => normalizeWebPath(item.webPath) === path);
  return exact ? targetForNavId(navigation, exact.id) : { kind: 'none' };
}

export function expoHrefFor(target: NativeTarget): string | null {
  switch (target.kind) {
    case 'tab':
      return target.slot === 0 ? '/' : `/slot-${target.slot}`;
    case 'screen':
      return `/screen/${encodeURIComponent(target.navId)}`;
    case 'notifications':
      return '/notifications';
    case 'none':
      return null;
  }
}

/** İzinli native rota önekleri (derin bağlantılar). Diğer her şey ana ekrana düşer. */
const ALLOWED_DEEP_LINK = /^\/(?:$|slot-[1-3]$|menu$|notifications$|account(?:\/(?:sessions|password))?$|screen\/[\w-]{1,64}$|forgot-password$)/;

/**
 * Sistemden gelen yol (`onlinedershanem://...`) → güvenli uygulama yolu.
 * Sorgu dizesi tamamen atılır (token, kod vb. URL'le TAŞINMAZ). Kimlik ve
 * kapı kontrolleri yine kök navigatördeki korumalarla yapılır.
 */
export function sanitizeIncomingPath(path: string): string {
  // `https://alan/yol` → `/yol`; özel şemada (`onlinedershanem://screen/x`)
  // ilk segment host gibi ayrışır, yolun parçasıdır.
  const scheme = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i.exec(path);
  const withoutScheme = scheme ? (/^https?$/i.test(scheme[1]) ? scheme[2].replace(/^[^/]*/, '') : `/${scheme[2]}`) : path;
  const base = (withoutScheme.split(/[?#]/)[0] || '/').replace(/\/{2,}/g, '/');
  const normalized = base.startsWith('/') ? base : `/${base}`;
  return ALLOWED_DEEP_LINK.test(normalized) ? normalized : '/';
}
