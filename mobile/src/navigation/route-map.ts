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
  /** OD detay rotası (`/od/...`); yalnız yetkili menü öğesi varken üretilir. */
  | { kind: 'detail'; href: string }
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

const navHas = (navigation: Navigation, navId: string) => [...navigation.primary, ...navigation.sections.flatMap((section) => section.items)].some((item) => item.id === navId);

/**
 * Öğrenci OD detay yolları (web) → native detay. Ders detayı yalnız "Dersler",
 * tekrar/telafi yalnız "Tekrar ve telafi" menüde varken açılır. Sorgu dizesi
 * (ör. `?lessonId=`) zaten atılmıştır; telafi sekmesi yine doğru açılır.
 */
function mapOdDetailPath(path: string, navigation: Navigation): NativeTarget | null {
  const lesson = /^\/panel\/ogrenci\/takvim\/([\w-]{1,64})$/.exec(path);
  if (lesson) return navHas(navigation, 'lessons') ? { kind: 'detail', href: `/od/lesson/${lesson[1]}` } : { kind: 'none' };
  if (path === '/panel/ogrenci/tekrar' || path === '/panel/ogrenci/telafi') {
    if (!navHas(navigation, 'review-recovery')) return { kind: 'none' };
    return { kind: 'detail', href: `/od/review-recovery?tab=${path.endsWith('telafi') ? 'telafi' : 'tekrar'}` };
  }
  return null;
}

/**
 * Deneme Ligi web yolları → native detay. Yalnız Deneme Ligi çalışma
 * alanında "Denemeler" yetkili menüdeyken; sınav ekranı (`/coz`) native
 * değildir → ayrıntıya düşer (oradan güvenli web devamı).
 */
function mapOdkDetailPath(path: string, navigation: Navigation): NativeTarget | null {
  const match = /^\/panel\/odk\/ogrenci\/denemeler\/([\w-]{1,64})(\/sonuc|\/coz)?$/.exec(path);
  if (!match) return null;
  if (!navHas(navigation, 'odk-exams')) return { kind: 'none' };
  return { kind: 'detail', href: match[2] === '/sonuc' ? `/odk/exam/${match[1]}/result` : `/odk/exam/${match[1]}` };
}

/** Bildirim href'i → yetkili native hedef. Eşleşme yoksa `none` (liste ekranında kalınır). */
export function mapNotificationHref(href: string | null | undefined, navigation: Navigation | null): NativeTarget {
  const path = normalizeWebPath(href);
  if (!path) return { kind: 'none' };
  if (path === '/panel/bildirimler' || path === '/panel/veli/bildirimler') return { kind: 'notifications' };
  if (!navigation) return { kind: 'none' };
  const items = [...navigation.primary, ...navigation.sections.flatMap((section) => section.items)];
  const exact = items.find((item) => normalizeWebPath(item.webPath) === path);
  if (exact) return targetForNavId(navigation, exact.id);
  return mapOdDetailPath(path, navigation) ?? mapOdkDetailPath(path, navigation) ?? { kind: 'none' };
}

/**
 * Bildirim web yolunun AİT OLDUĞU çalışma alanı (çapraz çalışma alanı
 * yönlendirmesi için). Yalnız ürüne özgü yollar eşlenir; ortak / belirsiz
 * yollar (ayarlar, bildirimler, check-in, haftalık özet) null — mevcut
 * çalışma alanında kalınır. Yetki kararı DEĞİLDİR: geçişten sonra hedef yeni
 * menüde yeniden doğrulanır.
 */
export function workspaceForWebPath(href: string | null | undefined): 'OD' | 'OK' | 'ODK' | null {
  const path = normalizeWebPath(href);
  if (!path) return null;
  if (/^\/panel\/odk\/ogrenci(?:\/|$)/.test(path)) return 'ODK';
  if (/^\/panel\/ogrenci\/(?:yon|plan|kocluk|hedefler)(?:\/|$)/.test(path)) return 'OK';
  if (/^\/panel\/ogrenci\/(?:takvim|odevler|materyaller|tekrar|telafi|analiz)(?:\/|$)/.test(path)) return 'OD';
  return null;
}

export function expoHrefFor(target: NativeTarget): string | null {
  switch (target.kind) {
    case 'tab':
      return target.slot === 0 ? '/' : `/slot-${target.slot}`;
    case 'screen':
      return `/screen/${encodeURIComponent(target.navId)}`;
    case 'detail':
      return target.href;
    case 'notifications':
      return '/notifications';
    case 'none':
      return null;
  }
}

/** İzinli native rota önekleri (derin bağlantılar). Diğer her şey ana ekrana düşer. */
const ALLOWED_DEEP_LINK = /^\/(?:$|slot-[1-3]$|menu$|notifications$|account(?:\/(?:sessions|password))?$|screen\/[\w-]{1,64}$|od\/(?:lesson|assignment)\/[\w-]{1,64}$|od\/review-recovery$|yon\/task\/[\w-]{1,64}$|odk\/exam\/[\w-]{1,64}(?:\/result)?$|forgot-password$)/;

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
