import { expect, test, type Page } from "@playwright/test";
import { uniqueTestClientIp } from "./helpers/client-ip";

const admin = {
  email: process.env.PANEL_E2E_ADMIN_EMAIL,
  password: process.env.PANEL_E2E_ADMIN_PASSWORD,
};

async function login(page: Page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
  await page.request.post("/api/auth/logout");
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(admin.email!);
  await page.getByLabel("Şifre").fill(admin.password!);
  await page.getByRole("button", { name: /^Giriş Yap$/ }).click();
  await page.waitForURL(/\/panel\//);
  if (new URL(page.url()).pathname === "/panel/urun-sec") {
    await page.getByRole("link", { name: "Online Dershanem paneline git" }).click();
  }
}

test.describe("admin bulk operation and entity search", () => {
  test.skip(!admin.email || !admin.password, "Panel E2E admin hesabı tanımlı değil.");

  test("kişiler ekranında toplu operasyon önizler ve komut aramasında entity endpointini çağırır", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/panel/yonetim/kullanicilar");

    await expect(page.getByRole("heading", { name: "Toplu operasyon" })).toBeVisible();

    const previewResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "POST"
        && url.pathname === "/api/panel/users/bulk"
        && response.request().postData()?.includes('"mode":"PREVIEW"')
      );
    });
    await page.getByRole("button", { name: "Önizleme al" }).click();
    expect((await previewResponse).status()).toBe(200);
    await expect(page.getByText("Önizleme:", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Panelde ara" }).click();
    const searchInput = page.getByPlaceholder("Öğrenci, veli, sipariş veya komut ara…");
    const searchResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === "GET" && url.pathname === "/api/panel/admin-search";
    });
    await searchInput.fill("ada");
    expect((await searchResponse).status()).toBe(200);
    await expect(page.getByRole("listbox", { name: "Arama sonuçları" })).toBeVisible();
    await searchInput.press("ArrowDown");
    await searchInput.press("Escape");
    await expect(page.getByRole("dialog", { name: "Panel arama ve komut paleti" })).toHaveCount(0);
  });
});

