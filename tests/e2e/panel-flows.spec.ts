import { test, expect, TEST_USERS } from "../fixtures/auth";

/**
 * Login sonrası panel smoke testleri.
 * Her rol için ana panel sayfasına gidip layout/nav öğelerini doğrular.
 *
 * NOT: Bu testler `prisma/seed-e2e.ts` ile test kullanıcılarının
 * DB'de mevcut olmasını gerektirir.
 */

test("admin → /panel/admin yükleniyor", async ({ adminPage }) => {
  await adminPage.goto("/panel/admin");
  await expect(adminPage).toHaveURL(/\/panel\/admin/);
  // Admin nav öğelerinden birinin görünür olması yeter
  await expect(adminPage.locator("body")).toContainText(/admin|öğrenci|öğretmen|paket/i);
});

test("öğrenci → /panel/ogrenci yükleniyor", async ({ ogrenciPage }) => {
  await ogrenciPage.goto("/panel/ogrenci");
  await expect(ogrenciPage).toHaveURL(/\/panel\/ogrenci/);
  await expect(ogrenciPage.locator("body")).toContainText(/profil|ödev|ders|deneme/i);
});

test("öğretmen → /panel/ogretmen yükleniyor", async ({ ogretmenPage }) => {
  await ogretmenPage.goto("/panel/ogretmen");
  await expect(ogretmenPage).toHaveURL(/\/panel\/ogretmen/);
  await expect(ogretmenPage.locator("body")).toContainText(/profil|ödev|ders|öğrenci/i);
});

test("veli → /panel/veli yükleniyor", async ({ veliPage }) => {
  await veliPage.goto("/panel/veli");
  await expect(veliPage).toHaveURL(/\/panel\/veli/);
  await expect(veliPage.locator("body")).toContainText(/çocuk|profil|veli|ödeme/i);
});

test("öğrenci profil edit sayfası açılıyor", async ({ ogrenciPage }) => {
  await ogrenciPage.goto("/panel/ogrenci/profilim/duzenle");
  await expect(ogrenciPage.locator('input[name="email"]')).toBeVisible();
  await expect(ogrenciPage.locator('button[type="submit"]')).toBeVisible();
});

test("öğrenci ODK paketim sayfası açılıyor", async ({ ogrenciPage }) => {
  await ogrenciPage.goto("/panel/ogrenci/odk/paketim");
  // Paket yoksa EmptyState CTA görünür
  await expect(ogrenciPage.locator("body")).toContainText(/paket|deneme/i);
});

test("admin hesap-silme talepleri sayfası açılıyor", async ({ adminPage }) => {
  await adminPage.goto("/panel/admin/hesap-silme-talepleri");
  await expect(adminPage).toHaveURL(/hesap-silme-talepleri/);
});

test("admin'in öğrenci paneline erişimi yok (role gate)", async ({ ogrenciPage }) => {
  // Öğrenci hesabıyla admin'e gitmeye çalış
  await ogrenciPage.goto("/panel/admin");
  // 403/yönlendirme — URL admin'de kalmamalı
  await expect(ogrenciPage).not.toHaveURL(/\/panel\/admin\/?$/);
});

test("logout flow", async ({ adminPage }) => {
  await adminPage.goto("/panel/admin");
  // logout butonu varsa kullan, yoksa /api/auth/signout
  const logoutBtn = adminPage.getByRole("button", { name: /çıkış|logout/i });
  if (await logoutBtn.count()) {
    await logoutBtn.first().click();
  } else {
    await adminPage.goto("/api/auth/signout");
    const signOutBtn = adminPage.locator('button[type="submit"]');
    if (await signOutBtn.count()) await signOutBtn.first().click();
  }
  // Yönlendirme sonrası /panel'de olmamalı (auth düşmüş)
  await adminPage.goto("/panel/admin");
  await expect(adminPage).toHaveURL(/\/giris/);
});

// Test kullanıcı email constants smoke
test("test kullanıcı listesi tutarlı", () => {
  expect(Object.keys(TEST_USERS)).toEqual(["admin", "ogrenci", "ogretmen", "veli"]);
});
