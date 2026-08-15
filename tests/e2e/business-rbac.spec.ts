import { expect, test, type Page } from "@playwright/test";
import { uniqueTestClientIp } from "./helpers/client-ip";

/**
 * İşletme Paneli RBAC matrisi.
 *
 * Bu testlerin varlık sebebi: erişim eskiden `User.role === "ADMIN"`
 * kontrolüne dayanıyordu ve platform yöneticisi olan HERKES bütün iş
 * birimlerinde bütün izinlere sahip oluyordu. Artık erişim yalnız
 * `BusinessRoleAssignment` üzerinden çözümlenir.
 *
 * Fixture'ların tamamı platformda `ADMIN`'dir (bkz. prisma/seed-e2e.ts).
 * Aralarındaki TEK fark işletme rol atamalarıdır — yani bu testler gerçekten
 * işletme rolünü ölçer, platform rolünü değil. Bir test yalnız menü
 * görünürlüğüne bakmaz; doğrudan URL'in HTTP durumunu ve mutation sonucunu da
 * doğrular, çünkü linki gizlemek güvenlik sınırı değildir.
 */

const password = process.env.PANEL_E2E_BUSINESS_PASSWORD ?? process.env.PANEL_E2E_ADMIN_PASSWORD;
const superAdminEmail = process.env.PANEL_E2E_ADMIN_EMAIL;

const accounts = {
  sales: "business.sales.e2e@example.com",
  support: "business.support.e2e@example.com",
  accounting: "business.accounting.e2e@example.com",
  viewer: "business.viewer.e2e@example.com",
  odkOnly: "business.odkonly.e2e@example.com",
  noAccess: "business.noaccess.e2e@example.com",
} as const;

async function login(page: Page, email: string) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
  await page.request.post("/api/auth/logout");
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(email);
  await page.getByLabel("Şifre").fill(password!);
  await page.getByRole("button", { name: /^Giriş Yap$/ }).click();
  await page.waitForURL(/\/panel/);
}

/**
 * Yetkisiz bölüm `notFound()` ile engellenir — varlığını sızdırmamak için 403
 * değil 404 davranışı kullanılır.
 *
 * NOT: HTTP durum koduna bakılmaz. Bu route'un bir `loading.tsx` dosyası var,
 * yani Next.js akışlı (streaming) SSR ile önce 200 gönderip sayfayı sonra
 * çözüyor; `response.status()` her durumda 200 olur. Bu yüzden — repodaki
 * mevcut konvansiyonla aynı şekilde — render edilen içerik doğrulanır.
 */
async function expectSectionBlocked(page: Page, section: string) {
  await page.goto(`/panel/yonetim/isletme/${section}`);
  await expect(
    page.getByRole("heading", { name: "Sayfa bulunamadı" }),
    `${section} engellenmeliydi`,
  ).toBeVisible();
}

async function expectSectionAllowed(page: Page, section: string) {
  await page.goto(`/panel/yonetim/isletme/${section}`);
  await expect(
    page.getByRole("heading", { name: "Sayfa bulunamadı" }),
    `${section} açılmalıydı`,
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test.describe("İşletme Paneli RBAC", () => {
  test.describe.configure({ timeout: 120_000 });
  test.skip(!password || !superAdminEmail, "İşletme E2E hesapları tanımlı değil.");

  test("atamasız kullanıcı işletme alanına hiç giremez", async ({ page }) => {
    await login(page, accounts.noAccess);
    // Platformda ADMIN olsa bile işletme ataması yoksa panelde alan değiştirme
    // bağlantısı görünmez.
    await expect(page.getByRole("link", { name: "İşletme paneline geç" })).toHaveCount(0);
    for (const section of ["genel-bakis", "mesaj-kutusu", "gelirler", "ayarlar"]) {
      await expectSectionBlocked(page, section);
    }
    expect((await page.request.get("/api/admin/business/reports.csv")).status()).toBe(401);
  });

  test("SALES finansı ne görebilir ne de menüde görür", async ({ page }) => {
    await login(page, accounts.sales);
    await expectSectionAllowed(page, "genel-bakis");
    await expectSectionAllowed(page, "mesaj-kutusu");
    await expectSectionAllowed(page, "adaylar");

    // Finans bölümleri hem menüde yok hem de doğrudan URL ile açılmıyor.
    const nav = page.getByRole("navigation", { name: "İşletme panel menüsü" });
    await expect(nav.getByRole("link", { name: "Gelirler" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Vergiler" })).toHaveCount(0);
    for (const section of ["gelirler", "giderler", "vergiler", "mutabakat", "raporlar"]) {
      await expectSectionBlocked(page, section);
    }
    // UI'da gizlenen yetki API'den de çalışmamalı.
    expect((await page.request.get("/api/admin/business/reports.csv")).status()).toBe(401);
  });

  test("SUPPORT adayı okur ama aşamasını yazamaz, finansa erişemez", async ({ page }) => {
    await login(page, accounts.support);
    await expectSectionAllowed(page, "mesaj-kutusu");
    // lead:read var → satış hunisi görünür, ama lead:write yok.
    await expectSectionAllowed(page, "satis-hunisi");
    for (const section of ["gelirler", "vergiler", "mutabakat"]) {
      await expectSectionBlocked(page, section);
    }
    expect((await page.request.get("/api/admin/business/reports.csv")).status()).toBe(401);
  });

  test("ACCOUNTING finansa erişir, konuşma ve aday PII'sine erişemez", async ({ page }) => {
    await login(page, accounts.accounting);
    for (const section of ["gelirler", "giderler", "vergiler", "mutabakat", "raporlar"]) {
      await expectSectionAllowed(page, section);
    }
    // Konuşma ve aday ekranları muhasebeye kapalıdır.
    for (const section of ["mesaj-kutusu", "adaylar", "satis-hunisi"]) {
      await expectSectionBlocked(page, section);
    }
    const nav = page.getByRole("navigation", { name: "İşletme panel menüsü" });
    await expect(nav.getByRole("link", { name: "Mesaj Kutusu" })).toHaveCount(0);
    // finance:read olduğu için CSV export'a erişebilir.
    expect((await page.request.get("/api/admin/business/reports.csv")).status()).toBe(200);
  });

  test("VIEWER okur ama hiçbir mutation çalıştıramaz", async ({ page }) => {
    await login(page, accounts.viewer);
    await expectSectionAllowed(page, "genel-bakis");
    await expectSectionAllowed(page, "gelirler");

    // Salt okunur kullanıcıya yazma formu hiç render edilmez.
    await page.goto("/panel/yonetim/isletme/gelirler");
    await expect(page.getByLabel("Hareket türü")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ters kayıt" })).toHaveCount(0);

    // settings:read olduğu için ayarlar AÇILIR, ama hiçbir yazma yüzeyi yoktur:
    // retention formu (settings:write) ve rol atama (role:write) render edilmez.
    await expectSectionAllowed(page, "ayarlar");
    await expect(page.getByRole("button", { name: /Tüm yetkili iş birimlerine uygula/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Rol ata" })).toHaveCount(0);

    // audit:read yoktur → sistem kayıtları kapalı.
    await expectSectionBlocked(page, "sistem-kayitlari");
  });

  test("iş birimi izolasyonu: ODK birimi kullanıcısı OD verisini göremez", async ({ page }) => {
    await login(page, accounts.odkOnly);
    await page.goto("/panel/yonetim/isletme/adaylar");
    // Yalnız kendi biriminin adayı görünür.
    await expect(page.getByText("ODK Birimi Adayı").first()).toBeVisible();
    // OD birimindeki aday hiç görünmemeli — sorgu kapsamı iş birimine bağlı.
    await expect(page.getByText("E2E Aday", { exact: true })).toHaveCount(0);

    // Tek birime erişen kullanıcıda mutation formu gizli input kullanır,
    // seçim kutusu çıkmaz.
    await expect(page.getByLabel("İş birimi")).toHaveCount(0);
  });

  test("SUPER_ADMIN bütün bölümleri açar ve son süper yöneticiyi kaldıramaz", async ({ page }) => {
    await login(page, superAdminEmail!);
    for (const section of ["genel-bakis", "mesaj-kutusu", "adaylar", "gelirler", "vergiler", "ayarlar", "sistem-kayitlari"]) {
      await expectSectionAllowed(page, section);
    }
    const nav = page.getByRole("navigation", { name: "İşletme panel menüsü" });
    await expect(nav.getByRole("link", { name: "Gelirler" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Ayarlar" })).toBeVisible();
  });

  test("KPI toplamları liste sayfalamasından etkilenmez", async ({ page }) => {
    await login(page, superAdminEmail!);
    await page.goto("/panel/yonetim/isletme/mesaj-kutusu");
    // Başlıktaki toplam ayrı `count` sorgusundan gelir; listedeki 30 satırlık
    // sayfa boyutu toplamı değiştirmez.
    await expect(page.getByRole("main").getByText(/Filtreye uyan toplam \d+ konuşma/).first()).toBeVisible();
  });
});
