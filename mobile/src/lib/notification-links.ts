/**
 * Web `Notification.href` → mobil route eşlemesi (mobil inşa promptu §6.1:
 * "web path'i, uygulama içi route'a çeviren tek bir eşleme tablosu").
 * Mobilde HENÜZ karşılığı olmayan hedefler (check-in, haftalık özet, telafi,
 * erişilebilirlik…) bilerek eşlenmedi — dokunma yalnız okundu işaretler,
 * var olmayan bir ekrana gitmiş gibi YAPILMAZ.
 */
const EXACT_MAP: Record<string, string> = {
  '/panel/ogrenci': '/',
  '/panel/ogrenci/takvim': '/dersler',
  '/panel/ogrenci/odevler': '/odevler',
  '/panel/ogrenci/denemeler': '/denemeler',
  '/panel/ogrenci/hedefler': '/hedefler',
  '/panel/ogrenci/gelisim': '/gelisim',
  '/panel/ogrenci/materyaller': '/materyaller',
};

export function mapNotificationHref(href: string | null): string | null {
  if (!href) return null;
  if (EXACT_MAP[href]) return EXACT_MAP[href];
  // /panel/ogrenci/denemeler?deneme=xyz gibi sorgulu hedefler — tabanı eşle.
  const base = href.split('?')[0];
  return EXACT_MAP[base] ?? null;
}
