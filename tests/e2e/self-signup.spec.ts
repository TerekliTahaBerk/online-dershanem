import { expect, test, type Page } from "@playwright/test";
import { uniqueTestClientIp } from "./helpers/client-ip";

/**
 * Kendi kendine kayıt (Öğrenci / Veli) → Tally iletişim formu (atlanabilir) →
 * ürün paneli seçici → hesap ayarları.
 *
 * Kayıt hiçbir ürün erişimi vermez: seçicide üç kart da kilitli görünür.
 * Tally iframe'inin içeriği test edilmez (dış servis); yalnız doğru formun
 * gizli alanlarla gömüldüğü doğrulanır.
 */

test.skip(true, "Kendi kendine kayıt kalıcı olarak kapalı; başvuru akışı public-applications.spec.ts içinde doğrulanır.");

const PASSWORD = "e2e-kayit-parolasi-2026";

async function personalStep(page: Page, input: { fullName: string; email: string; phone: string }) {
  await page.getByLabel("Ad soyad", { exact: true }).fill(input.fullName);
  await page.getByLabel("E-posta", { exact: true }).fill(input.email);
  await page.getByLabel("Cep telefonu").fill(input.phone);
  await page.getByLabel("Parola", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Parola (tekrar)").fill(PASSWORD);
  await page.getByLabel("İl", { exact: true }).fill("İzmir");
  await page.getByLabel("İlçe").fill("Bornova");
}

async function consentAndSubmit(page: Page) {
  await page.getByRole("checkbox", { name: /KVKK aydınlatma metnini/ }).check();
  await page.getByRole("checkbox", { name: /kullanım koşullarını/ }).check();
  await page.getByRole("button", { name: "Kayıt Ol" }).click();
  await page.waitForURL(/\/kayit\/iletisim-formu$/, { timeout: 20_000 });
}

test.describe("kendi kendine kayıt", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://tally.so/**", (route) => route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: '<!doctype html><html lang="tr"><body><label>Analiz <input></label></body></html>',
    }));
    await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
    await page.request.post("/api/auth/logout");
  });

  test("öğrenci kaydı iletişim formuna, oradan kilitli ürün seçicisine ve ayarlara gider", async ({ page }) => {
    const email = `kayit-ogrenci-${crypto.randomUUID().slice(0, 8)}@example.com`;
    await page.goto("/kayit");
    await page.getByRole("button", { name: /Öğrenciyim/ }).click();
    await page.getByRole("button", { name: "Devam et" }).click();
    await personalStep(page, { fullName: "E2E Kayıt Öğrenci", email, phone: "0532 111 22 33" });
    await page.getByRole("button", { name: "Devam et" }).click();
    await page.getByLabel("Sınıf", { exact: true }).selectOption("11");
    await page.getByLabel("Hedef sınav").selectOption("TYT_AYT");
    await page.getByRole("button", { name: "Matematik" }).click();
    await page.getByRole("button", { name: "Devam et" }).click();
    await page.getByRole("button", { name: /onlinedershanem./ }).click();
    await page.getByRole("button", { name: "Devam et" }).click();

    // Onaysız gönderim engellenir.
    await page.getByRole("button", { name: "Kayıt Ol" }).click();
    await expect(page.getByText("KVKK aydınlatma metnini onaylamanız gerekiyor.")).toBeVisible();
    await consentAndSubmit(page);

    await expect(page.getByTitle("Öğrenci Analiz ve Kayıt Formu")).toHaveCount(1);
    const src = await page.getByTitle("Öğrenci Analiz ve Kayıt Formu").getAttribute("src");
    const tally = new URL(src!);
    expect(tally.origin).toBe("https://tally.so");
    expect(tally.pathname).toBe("/r/vGRQ5X");
    expect(tally.searchParams.get("formEventsForwarding")).toBe("1");
    expect(tally.searchParams.get("email")).toBe(email);
    expect(tally.searchParams.get("role")).toBe("STUDENT");
    expect(tally.searchParams.get("ref")).toMatch(/\./);

    await page.getByRole("button", { name: "Sonra dolduracağım" }).click();
    await page.waitForURL(/\/panel\/urun-sec$/);
    await expect(page.getByRole("heading", { name: "Hangi panele girmek istiyorsun?" })).toBeVisible();
    await expect(page.getByRole("link", { name: / paneline git$/ })).toHaveCount(0);
    await expect(page.getByText("Paketin yok", { exact: true })).toHaveCount(3);
    await expect(page.getByText("Sana ulaşabilmemiz için kısa iletişim formunu doldur.")).toBeVisible();

    await page.getByRole("link", { name: "Hesap ayarları" }).click();
    await page.waitForURL(/\/panel\/ayarlar$/);
    await page.goto("/panel/ayarlar/egitim");
    await page.getByLabel("Okul adı").fill("E2E Anadolu Lisesi");
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText("Eğitim bilgilerin kaydedildi.")).toBeVisible();
    await page.goto("/panel/ayarlar/profil");
    await page.getByLabel("Doğum tarihi").fill("2009-05-04");
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText("Profil bilgilerin kaydedildi.")).toBeVisible();
    await page.goto("/panel/ayarlar");
    await expect(page.getByText("Hesabın tamamlandı.", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Hesabını tamamla/)).toHaveCount(0);

    // Atlanan özel form ayarlardan yeniden açılır; public form ile karışmaz.
    await page.getByRole("link", { name: "Doldur", exact: true }).click();
    await expect(page).toHaveURL(/\/kayit\/iletisim-formu\?tekrar=1$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const iframe = page.getByTitle("Öğrenci Analiz ve Kayıt Formu");
    await expect(iframe).toHaveCount(1);
    await page.frameLocator('iframe[title="Öğrenci Analiz ve Kayıt Formu"]').getByRole("textbox", { name: "Analiz" }).fill("Fixture");
    const frame = await (await iframe.elementHandle())!.contentFrame();
    // Güvenilmeyen origin mevcut gönderim akışını tetiklemez.
    await page.evaluate(() => window.dispatchEvent(new MessageEvent("message", {
      origin: "https://example.com", data: { event: "Tally.FormSubmitted" },
    })));
    const submission = page.waitForResponse((response) => response.url().endsWith("/api/account/contact-form") && response.request().postDataJSON()?.action === "submitted");
    await frame!.evaluate(() => parent.postMessage(JSON.stringify({ event: "Tally.FormSubmitted", payload: {} }), "*"));
    expect((await submission).status()).toBe(200);
    await page.waitForURL(/\/panel\/urun-sec$/);
    await expect(page.getByText("Sana ulaşabilmemiz için kısa iletişim formunu doldur.")).toHaveCount(0);
    await page.goto("/kayit/iletisim-formu");
    await expect(page).toHaveURL(/\/panel\/urun-sec$/);
    await page.goto("/panel/ayarlar");
    await page.getByRole("link", { name: "Güncelle", exact: true }).click();
    await expect(page.getByText("Formu daha önce doldurdun; istersen güncelleyebilirsin.")).toBeVisible();
    await page.getByRole("button", { name: "Panele dön", exact: true }).click();
    await page.waitForURL(/\/panel\/urun-sec$/);
  });

  test("veli kaydı çocukları bekleyen hesap olarak bildirir", async ({ page }) => {
    const email = `kayit-veli-${crypto.randomUUID().slice(0, 8)}@example.com`;
    await page.goto("/kayit");
    await page.getByRole("button", { name: /Veliyim/ }).click();
    await page.getByRole("button", { name: "Devam et" }).click();
    await personalStep(page, { fullName: "E2E Kayıt Veli", email, phone: "0544 111 22 33" });
    await page.getByLabel("Öğrenciye yakınlığınız").selectOption("ANNE");
    await page.getByRole("button", { name: "Devam et" }).click();
    await page.getByLabel("Ad soyad", { exact: true }).fill("E2E Çocuk Bir");
    await page.getByLabel("Sınıf", { exact: true }).selectOption("8");
    await page.getByLabel("Hedef sınav").selectOption("LGS");
    await page.getByRole("button", { name: "Başka çocuk ekle" }).click();
    await page.locator("#child-1-name").fill("E2E Çocuk İki");
    await page.locator("#child-1-class").selectOption("12");
    await page.locator("#child-1-exam").selectOption("TYT");
    await page.getByRole("button", { name: "Devam et" }).click();
    await page.getByRole("button", { name: /onlinekoçum./ }).click();
    await page.getByLabel("Zaten satın alım yaptım").check();
    await page.getByRole("button", { name: "Devam et" }).click();
    await consentAndSubmit(page);

    await page.getByRole("button", { name: "Sonra dolduracağım" }).click();
    await page.waitForURL(/\/panel\/urun-sec$/);
    await page.goto("/panel/ayarlar/cocuklarim");
    await expect(page.getByText("E2E Çocuk Bir", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("E2E Çocuk İki", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Ekibimiz öğrenci hesabını açıp size bağlayacak.")).toHaveCount(2);
  });

  test("kayıt API'si yönetici rolünü reddeder", async ({ page }) => {
    const response = await page.request.post("/api/auth/register", {
      headers: {
        origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        // page headers do not propagate to page.request's API context.
        "x-forwarded-for": uniqueTestClientIp(),
      },
      data: {
        accountType: "ADMIN",
        fullName: "Yetki Denemesi",
        email: `kayit-admin-${crypto.randomUUID().slice(0, 8)}@example.com`,
        phone: "05321112233",
        password: PASSWORD,
        city: "İzmir",
        district: "Bornova",
        interestedProducts: ["OD"],
        purchaseStatus: "EXPLORING",
        preferredChannel: "PHONE",
        preferredContactTime: "ANY",
        kvkkConsent: true,
        termsConsent: true,
      },
    });
    expect(response.status()).toBe(400);
  });
});
