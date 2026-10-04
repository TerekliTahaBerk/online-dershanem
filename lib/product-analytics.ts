import { application } from "./application";

/** Yalnız üç ürünün tanıtım sayfaları; ortak paket sayfasına ürün atfedilmez. */
const productPages: Record<string, "OD" | "ODK" | "OK"> = {
  "/urunler/online-dershanem": "OD",
  "/urunler/online-deneme-kulubum": "ODK",
  "/urunler/online-kocum": "OK",
};

export function analyticsProduct(pathname: string) {
  return productPages[pathname];
}

/** Hedefi doğrula; sorgu parametreleri ve serbest metin analitiğe taşınmaz. */
export function productCta(href: string, origin: string) {
  if (!href) return undefined;
  try {
    const url = new URL(href, origin);
    const form = new URL(application.href);
    if (url.origin === form.origin && url.pathname === form.pathname) return { cta_kind: "application" };
    if (url.origin !== origin) return undefined;
    if (url.pathname === "/iletisim" && url.hash === "#on-gorusme") return { cta_kind: "pre_meeting" };
    if (["/paketler", "/ders-paketleri", "/kocluk-paketleri", "/odk-paketleri"].includes(url.pathname)) return { cta_kind: "packages" };
    const target = analyticsProduct(url.pathname);
    if (target && !url.hash) return { cta_kind: "product_navigation", target_product: target };
    if (url.hash === "#nasil-isler") return { cta_kind: "how_it_works" };
  } catch {
    return undefined;
  }
}

/** Her eşik bir sayfa ziyaretinde bir kez ölçülür. */
export function reachedScrollDepths(scrollTop: number, scrollHeight: number, viewportHeight: number) {
  const distance = scrollHeight - viewportHeight;
  if (distance <= 0 || scrollTop <= 0) return [];
  const progress = Math.min(100, (scrollTop / distance) * 100);
  return [25, 50, 75, 100].filter((depth) => progress >= depth - 0.5);
}
