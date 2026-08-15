import { expect, test, type Page } from "@playwright/test";

/**
 * Public bilgi mimarisi (P0-01) — üç ana ürünün her yüzeyden ulaşılabilir
 * olduğunu ve eski public adreslerin sessizce 404'e dönmediğini doğrular.
 */

/**
 * Menü etkileşimleri React hydration'ından önce tıklanırsa sessizce kaybolur;
 * Playwright sayfayı bir kullanıcıdan çok daha hızlı tıklıyor. Etkileşimli
 * testler bu yardımcı ile sayfayı açar: React bir düğüme hydration sırasında
 * `__reactFiber$…` anahtarını iliştirir.
 */
async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => {
    const button = document.querySelector("header button");
    return !!button && Object.keys(button).some((key) => key.startsWith("__reactFiber$"));
  });
}

const PRODUCTS = [
  { name: "Online Dershanem", path: "/urunler/online-dershanem" },
  { name: "Online Koçum", path: "/urunler/online-kocum" },
  { name: "Online Deneme Kulübüm", path: "/urunler/online-deneme-kulubum" },
] as const;

test.describe("masaüstü navigasyon", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  /*
   * Onaylı tasarımda (Site Nav.dc.html) üç ürün doğrudan header'da DEĞİL,
   * "Ürünler" açılır menüsündedir. İddia zayıflatılmadı: üç ürünün de
   * görünür ve tıklanabilir olduğu hâlâ doğrulanıyor, yalnızca menünün
   * açılması adımı eklendi.
   */
  test("header üç ürünü de gösterir ve ürün sayfasına götürür", async ({ page }) => {
    await gotoHydrated(page, "/");
    const nav = page.getByRole("navigation", { name: "Ana menü" });

    const trigger = nav.getByRole("button", { name: "Ürünler menüsü" });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    for (const product of PRODUCTS) {
      await expect(nav.getByRole("link", { name: product.name, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: /Tüm ürünleri karşılaştır/ })).toBeVisible();

    await nav.getByRole("link", { name: "Online Koçum", exact: true }).click();
    await expect(page).toHaveURL(/\/urunler\/online-kocum\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("giriş ve birincil CTA masaüstünde erişilebilir", async ({ page }) => {
    await gotoHydrated(page, "/");
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Giriş Yap" })).toBeVisible();
    const cta = header.getByRole("link", { name: "Paketini Oluştur" });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/paketler\/?$/);
  });
});

test.describe("mobil navigasyon", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("menü ürünleri gösterir, gezindikten sonra kapanır", async ({ page }) => {
    await gotoHydrated(page, "/");
    await page.getByRole("button", { name: "Menüyü aç" }).click();

    const dialog = page.getByRole("dialog", { name: "Mobil menü" });
    const menu = dialog.getByRole("navigation", { name: "Mobil menü" });
    for (const product of PRODUCTS) {
      await expect(menu.getByRole("link", { name: product.name, exact: true })).toBeVisible();
    }
    await expect(dialog.getByRole("link", { name: "Giriş Yap", exact: true })).toBeVisible();

    await menu.getByRole("link", { name: "Online Deneme Kulübüm", exact: true }).click();
    await expect(page).toHaveURL(/\/urunler\/online-deneme-kulubum\/?$/);
    await expect(page.getByRole("dialog", { name: "Mobil menü" })).toHaveCount(0);
  });

  test("ürün sayfaları 390px'te yatay taşma yapmaz", async ({ page }) => {
    for (const path of [...PRODUCTS.map((p) => p.path), "/urunler", "/dino-ai"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} yatay taşma`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("ürün sayfaları ve footer", () => {
  test("ürün yüzeyleri yayında ve H1'leri var", async ({ page }) => {
    for (const path of [...PRODUCTS.map((p) => p.path), "/urunler", "/dino-ai"]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${path} durum kodu`).toBeLessThan(400);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("footer üç ürünü, Dino AI'ı ve uyum bağlantılarını listeler", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("#site-footer");
    for (const product of PRODUCTS) {
      await expect(footer.getByRole("link", { name: product.name, exact: true })).toBeVisible();
    }
    await expect(footer.getByRole("link", { name: "Dino AI", exact: true })).toBeVisible();
    await expect(footer.getByRole("link", { name: "KVKK" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Gizlilik", exact: true })).toBeVisible();
  });

  test("Dino AI yayında olmayan bir yeteneği çalışıyormuş gibi anlatmaz", async ({ page }) => {
    await page.goto("/dino-ai", { waitUntil: "domcontentloaded" });
    // H1 metni onaylı tasarımla değişti; doğruluk iddiaları AYNEN korunuyor.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Dino AI");
    await expect(page.getByText("ayrı satılan bir ürün değildir", { exact: false })).toBeVisible();
    await expect(page.getByText("Geliştirme aşamasında")).toBeVisible();
    // Sayfa, canlı Dino çıktısının HENÜZ OLMADIĞINI açıkça söylemek zorunda.
    // Önceden burada "Planlanıyor" durum sözcüğü aranıyordu; metin cümleye
    // çevrildi, iddia aynı kaldı — zayıflatılmadı, açıkça yazıldı.
    await expect(page.getByText("henüz yayında değil", { exact: false })).toBeVisible();
  });

  test("Online Koçum kayıt durumunu açıkça söyler", async ({ page }) => {
    await page.goto("/urunler/online-kocum", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Online Koçum için kayıtlar hazırlanıyor.")).toBeVisible();
  });
});

test.describe("eski public adresler", () => {
  const legacyRedirects: Array<[string, RegExp]> = [
    ["/deneme-kulubu", /\/urunler\/online-deneme-kulubum\/?$/],
    ["/odk", /\/urunler\/online-deneme-kulubum\/?$/],
    ["/odk-paketleri", /\/urunler\/online-deneme-kulubum\/?$/],
    ["/online-deneme-kulubu", /\/urunler\/online-deneme-kulubum\/?$/],
    ["/deneme-paketleri", /\/urunler\/online-deneme-kulubum\/?$/],
    ["/tyt-deneme-kulubu", /\/urunler\/online-deneme-kulubum\/?$/],
    ["/lgs-deneme-kulubu", /\/urunler\/online-deneme-kulubum\/?$/],
    ["/online-dershane", /\/urunler\/online-dershanem\/?$/],
    ["/tyt", /\/yks\/?$/],
    ["/ayt", /\/yks\/?$/],
  ];

  for (const [route, expected] of legacyRedirects) {
    test(`${route} kanonik adrese yönlenir`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(400);
      await expect(page).toHaveURL(expected);
    });
  }

  const preservedRoutes = [
    "/ders-paketleri",
    "/matematik",
    "/online-ozel-ders",
    "/lgs",
    "/yks",
    "/kamplar",
    "/sss",
    "/iletisim",
    "/giris",
    "/sepet",
  ];

  for (const route of preservedRoutes) {
    test(`${route} hâlâ çalışıyor`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route} durum kodu`).toBeLessThan(400);
    });
  }
});
